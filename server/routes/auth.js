const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const passport = require("passport");
const User = require("../models/User");
const emailService = require("../services/emailService");
const {
  verifyToken,
  registrationRateLimit,
  loginRateLimit,
} = require("../middleware/auth");
const {
  generateTokens,
  persistSession,
  findActiveSessionByRefreshToken,
  rotateSessionTokens,
  verifyRefreshToken,
  revokeSessionByToken,
} = require("../services/auth/tokenService");
const StatelessStateStore = require("../utils/statelessStateStore");

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const sanitizeRedirect = (value) => {
  if (!value || typeof value !== "string") {
    return "/";
  }

  const trimmed = value.trim();

  // Ignore error URLs from previous failed OAuth attempts
  if (
    trimmed.includes("oauth=failed") ||
    trimmed.includes("oauth=error") ||
    trimmed.includes("message=")
  ) {
    console.log("⚠️ [SANITIZE] Ignoring error URL as redirect:", trimmed);
    return "/";
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("//")
  ) {
    return "/";
  }

  if (!trimmed.startsWith("/")) {
    return `/${trimmed}`;
  }

  return trimmed;
};

const serializeForScript = (data) =>
  JSON.stringify(data).replace(/</g, "\\u003c");

// Check if Google OAuth is configured
const isGoogleOAuthConfigured = () => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return false;
  }
  // Check if strategy is registered by checking passport's strategies
  try {
    const strategies = passport._strategies || {};
    return !!strategies.google;
  } catch {
    return false;
  }
};

// Google OAuth - initiate
router.get("/google", (req, res, next) => {
  console.log("🚀 [OAUTH INIT] Google OAuth initiation requested", {
    query: req.query,
    redirect: req.query.redirect,
    timestamp: new Date().toISOString(),
  });

  if (!isGoogleOAuthConfigured()) {
    console.error("❌ [OAUTH INIT] Google OAuth is not configured");
    return res.status(503).json({
      error: "Google OAuth is not configured. Please contact support.",
      code: "OAUTH_NOT_CONFIGURED",
    });
  }

  // Always use a clean redirect - never pass error URLs
  const redirect = sanitizeRedirect(req.query.redirect || "/");
  
  // Manually encode the state using the state store to ensure it's properly encoded
  // passport-google-oauth20's state store integration might not be working as expected
  const getStateStore = () => {
    const secret =
      process.env.GOOGLE_STATE_SECRET ||
      process.env.JWT_SECRET ||
      "eventi-google-state";
    const ttl =
      typeof process.env.GOOGLE_STATE_TTL_MS !== "undefined"
        ? Number(process.env.GOOGLE_STATE_TTL_MS)
        : undefined;
    return new StatelessStateStore({ secret, ttl });
  };

  const stateStore = getStateStore();
  
  // Encode the state manually
  stateStore.store(req, redirect, null, (storeErr, encodedState) => {
    if (storeErr) {
      console.error("❌ [OAUTH INIT] Failed to encode state:", storeErr);
      return res.status(500).json({
        error: "Failed to initialize OAuth. Please try again.",
        code: "OAUTH_INIT_ERROR",
      });
    }

    console.log("✅ [OAUTH INIT] Google OAuth configured, initiating flow", {
      originalRedirect: req.query.redirect,
      sanitizedRedirect: redirect,
      encodedStateLength: encodedState.length,
      encodedStatePreview: encodedState.substring(0, 30) + "...",
    });

    // Pass the encoded state to passport
    passport.authenticate("google", {
      scope: ["profile", "email"],
      state: encodedState, // Pass the pre-encoded state
      session: false,
      prompt: "select_account",
    })(req, res, next);
  });
});

// Google OAuth callback
router.get("/google/callback", (req, res, next) => {
  console.log("📥 [OAUTH CALLBACK] Google OAuth callback received", {
    url: req.url,
    query: req.query,
    state: req.query.state,
    code: req.query.code ? "present" : "missing",
    error: req.query.error,
    timestamp: new Date().toISOString(),
  });

  if (!isGoogleOAuthConfigured()) {
    console.error("❌ [OAUTH CALLBACK] Google OAuth is not configured");
    const targetOrigin = FRONTEND_URL;
    const html = `
      <html>
        <body>
          <script>
            (function() {
              const data = ${serializeForScript({
                type: "oauth-error",
                provider: "google",
                message: "Google OAuth is not configured. Please contact support.",
                redirect: "/",
              })};
              if (window.opener) {
                window.opener.postMessage(data, "${targetOrigin}");
                window.close();
              } else {
                window.location = "${targetOrigin}/?oauth=failed&message=" + encodeURIComponent("Google OAuth is not configured. Please contact support.");
              }
            })();
          </script>
        </body>
      </html>`;
    return res.status(503).send(html);
  }

  console.log("✅ [OAUTH CALLBACK] Google OAuth configured, calling passport.authenticate");

  passport.authenticate("google", { session: false }, (err, payload, info) => {
    console.log("🔍 [OAUTH CALLBACK] Passport authenticate callback invoked", {
      hasError: !!err,
      hasPayload: !!payload,
      hasInfo: !!info,
      errorMessage: err?.message,
      infoMessage: info?.message,
      infoState: info?.state,
      infoType: typeof info,
      infoKeys: info ? Object.keys(info) : [],
    });

    // Extract redirect from validated state (if state validation succeeded)
    // If state validation failed, info.state will be the error message object
    const stateRedirect =
      typeof info?.state === "object" &&
      info.state !== null &&
      typeof info.state.redirect === "string"
        ? info.state.redirect
        : null;
    
    // Fallback: if state validation failed, use query.state but sanitize it
    // (it might be an error URL from a previous failed attempt)
    let fallbackState = req.query.state;
    if (fallbackState && (fallbackState.includes("oauth=failed") || fallbackState.includes("message="))) {
      console.warn("⚠️ [OAUTH CALLBACK] Query state is an error URL, ignoring it");
      fallbackState = null;
    }
    
    const redirectPath = sanitizeRedirect(stateRedirect || fallbackState || "/");

    console.log("🔍 [OAUTH CALLBACK] State and redirect extraction", {
      stateRedirect,
      queryState: req.query.state,
      fallbackState,
      redirectPath,
      infoStateType: typeof info?.state,
      infoStateValue: info?.state,
      infoStateKeys: info?.state && typeof info.state === "object" ? Object.keys(info.state) : null,
    });

    const targetOrigin = FRONTEND_URL;

    if (err || !payload) {
      // Check if this is just a state validation error but we might still have valid auth
      const isStateError =
        info?.message?.includes("state") ||
        info?.message?.includes("State") ||
        (err && err.message?.includes("state"));

      const message =
        err?.message ||
        info?.message ||
        "Google authentication failed. Please try again.";

      console.error("❌ [OAUTH CALLBACK] Authentication failed", {
        error: err,
        errorMessage: err?.message,
        errorStack: err?.stack,
        info: info,
        infoMessage: info?.message,
        infoType: typeof info,
        isStateError,
        finalMessage: message,
        redirectPath,
      });

      // If it's a state error, provide a more helpful message
      const userFriendlyMessage = isStateError
        ? "OAuth state validation failed. Please try again from the home page."
        : message;

      const html = `
        <html>
          <body>
            <script>
              (function() {
                const data = ${serializeForScript({
                  type: "oauth-error",
                  provider: "google",
                  message: userFriendlyMessage,
                  redirect: redirectPath,
                })};
                if (window.opener) {
                  window.opener.postMessage(data, "${targetOrigin}");
                  window.close();
                } else {
                  window.location = "${targetOrigin}/?oauth=failed&message=" + encodeURIComponent("${userFriendlyMessage}");
                }
              })();
            </script>
          </body>
        </html>`;
      return res.status(200).send(html);
    }

    const { user, tokens } = payload;
    console.log("✅ [OAUTH CALLBACK] Authentication successful", {
      userId: user?.id,
      userEmail: user?.email,
      hasTokens: !!tokens,
      hasAccessToken: !!tokens?.accessToken,
      hasRefreshToken: !!tokens?.refreshToken,
      redirectPath,
    });

    // Encode tokens for URL (as fallback when postMessage fails)
    const tokensParam = Buffer.from(
      JSON.stringify({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
    ).toString("base64url");

    const html = `
      <html>
        <body>
          <script>
            (function() {
              const data = ${serializeForScript({
                type: "oauth-success",
                provider: "google",
                payload: { user, tokens, redirect: redirectPath },
              })};
              const targetOrigin = "${targetOrigin}";
              
              // Try multiple ways to send postMessage
              let messageSent = false;
              
              // Try window.opener first
              if (window.opener && !window.opener.closed) {
                try {
                  window.opener.postMessage(data, targetOrigin);
                  messageSent = true;
                  console.log("✅ [OAUTH CALLBACK] postMessage sent to window.opener");
                  setTimeout(() => window.close(), 100);
                } catch (e) {
                  console.warn("⚠️ [OAUTH CALLBACK] Failed to postMessage to window.opener:", e);
                }
              }
              
              // Try window.parent as fallback
              if (!messageSent && window.parent && window.parent !== window) {
                try {
                  window.parent.postMessage(data, targetOrigin);
                  messageSent = true;
                  console.log("✅ [OAUTH CALLBACK] postMessage sent to window.parent");
                  setTimeout(() => window.close(), 100);
                } catch (e) {
                  console.warn("⚠️ [OAUTH CALLBACK] Failed to postMessage to window.parent:", e);
                }
              }
              
              // If postMessage failed, redirect with tokens in URL
              if (!messageSent) {
                console.warn("⚠️ [OAUTH CALLBACK] postMessage failed, using redirect fallback");
                window.location = targetOrigin + "/?oauth=success&provider=google&tokens=" + encodeURIComponent("${tokensParam}");
              }
            })();
          </script>
        </body>
      </html>`;
    res.send(html);
  })(req, res, next);
});


// Registration endpoint
router.post(
  "/register",
  registrationRateLimit,
  [
    body("email").isEmail().withMessage("Please provide a valid email address"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long"),
    body("username")
      .isLength({ min: 3, max: 50 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        "Username must be 3-50 characters and contain only letters, numbers, and underscores"
      ),
    // Support both new name field and legacy firstName/lastName fields
    body("name")
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Name must be less than 200 characters"),
    body("firstName")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("First name must be less than 100 characters"),
    body("lastName")
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Last name must be less than 100 characters"),
    body("role")
      .optional()
      .isIn(["customer", "organizer"])
      .withMessage("Role must be customer or organizer"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Please check your input and try again.",
          details: errors.array().map((err) => ({
            field: err.path,
            message: err.msg,
            value: err.value,
          })),
        });
      }

      const {
        email,
        password,
        username,
        name,
        firstName,
        lastName,
        walletAddress,
      } = req.body;
      const role = ["customer", "organizer"].includes(req.body.role)
        ? req.body.role
        : "customer";

      // Validate name fields - require either name or both firstName/lastName
      if (!name && (!firstName || !lastName)) {
        return res.status(400).json({
          error:
            "Please provide either a full name or both first and last name.",
          details: [{ field: "name", message: "Name is required" }],
        });
      }

      // Normalize email to lowercase for lookup (will be saved as lowercase by model)
      const emailLower = email.toLowerCase().trim();

      // Check if user already exists - case-insensitive lookup
      // Since emails are stored lowercase, we can do direct comparison with lowercase version
      let existingUser = await User.findOne({
        $or: [{ email: emailLower }, { username }],
      });

      // For Gmail addresses, also check variations with/without dots
      if (!existingUser && emailLower.includes("@gmail.com")) {
        const localPart = emailLower.split("@")[0];
        const domain = emailLower.split("@")[1];

        // Try without dots if email has dots
        if (localPart.includes(".")) {
          const withoutDots = localPart.replace(/\./g, "") + "@" + domain;
          existingUser = await User.findOne({ email: withoutDots });
        } else {
          // Try with dots (search for any Gmail variation)
          const escapedLocalPart = localPart.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );
          const gmailRegex = new RegExp(
            `^${escapedLocalPart}(\\.|)@gmail\\.com$`,
            "i"
          );
          const users = await User.find({ email: { $regex: gmailRegex } });
          existingUser = users.find((u) => u.email.includes(".")) || users[0];
        }
      }

      if (existingUser) {
        // Check if emails match (accounting for Gmail dot equivalence)
        const existingEmailLower = existingUser.email.toLowerCase();
        if (
          existingEmailLower === emailLower ||
          (emailLower.includes("@gmail.com") &&
            existingEmailLower.replace(/\./g, "") ===
              emailLower.replace(/\./g, ""))
        ) {
          return res.status(409).json({
            error:
              "An account with this email already exists. Please try logging in instead.",
            code: "EMAIL_EXISTS",
          });
        }
        return res.status(409).json({
          error:
            "This username is already taken. Please choose a different username.",
          code: "USERNAME_EXISTS",
        });
      }

      // Create user with name field (firstName/lastName will be synced by pre-save middleware)
      // Email will be lowercased automatically by Mongoose schema (lowercase: true)
      const userData = {
        email: email, // Will be normalized to lowercase on save by model
        username,
        walletAddress: walletAddress || null,
        emailVerified: false,
        role,
        lastLoginProvider: "email",
      };

      // Use name field if provided, otherwise use firstName/lastName
      if (name) {
        userData.name = name;
      } else {
        userData.firstName = firstName;
        userData.lastName = lastName;
      }

      const user = new User(userData);

      // Set password (bcrypt 12 rounds)
      await user.setPassword(password);
      await user.save();

      // Send welcome email (best-effort, don't fail registration if email fails)
      try {
        await emailService.sendWelcomeEmail({
          email: user.email,
          firstName: user.firstName,
          name: user.name,
          role: user.role,
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Continue with registration even if email fails
      }

      // Generate tokens
      const tokens = generateTokens(user._id);
      await persistSession(user._id, tokens, req);

      res.status(201).json({
        message: "Account created successfully! Welcome to Event-i!",
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tokens,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed. Please try again." });
    }
  }
);

// Login endpoint
router.post(
  "/login",
  loginRateLimit,
  [
    body("email").isEmail().withMessage("Please provide a valid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Please check your input and try again.",
          details: errors.array().map((err) => ({
            field: err.path,
            message: err.msg,
            value: err.value,
          })),
        });
      }

      const { email, password } = req.body;

      console.log("[LOGIN] Attempt:", {
        email: email?.substring(0, 10) + "...",
        hasPassword: !!password,
        emailLength: email?.length,
      });

      // Normalize email to lowercase for lookup (emails are stored lowercase)
      // This allows case-insensitive lookup while emails are normalized in storage
      const emailLower = email.toLowerCase().trim();
      console.log(
        "[LOGIN] Email received:",
        email,
        "-> normalized:",
        emailLower
      );

      let user = null;

      // Try case-insensitive lookup first (handles existing users with mixed-case emails)
      // New users are saved lowercase, but existing users might have mixed case
      const emailRegex = new RegExp(
        `^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i"
      );
      user = await User.findOne({ email: { $regex: emailRegex } });

      // For Gmail addresses, also check variations with/without dots
      if (!user && emailLower.includes("@gmail.com")) {
        const localPart = emailLower.split("@")[0];
        const domain = emailLower.split("@")[1];

        // If not found and email has no dots, search for any version with dots
        if (!localPart.includes(".")) {
          // Search for any email matching this Gmail account (with or without dots in local part)
          const escapedLocalPart = localPart.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );
          const gmailRegex = new RegExp(
            `^${escapedLocalPart}(\\.|)@gmail\\.com$`,
            "i"
          );
          console.log("[LOGIN] Searching with regex for Gmail variations");
          const users = await User.find({ email: { $regex: gmailRegex } });
          // Prioritize user with dots (usually the original registered email)
          user =
            users.find((u) => u.email.toLowerCase().includes(".")) || users[0];
        } else {
          // If email has dots, also try without dots (case-insensitive)
          const withoutDots = localPart.replace(/\./g, "") + "@" + domain;
          console.log("[LOGIN] Trying without dots:", withoutDots);
          user = await User.findOne({
            email: {
              $regex: new RegExp(
                `^${withoutDots.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                "i"
              ),
            },
          });
        }
      }

      if (!user) {
        return res.status(401).json({
          error:
            "Invalid email or password. Please check your credentials and try again.",
          code: "INVALID_CREDENTIALS",
          suggestion: "Make sure your email is correct and try again.",
        });
      }

      console.log("[LOGIN] ✅ User found:", {
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      });

      if (!user.isActive) {
        console.log("[LOGIN] ❌ Account deactivated for:", emailLower);
        return res.status(401).json({
          error:
            "Your account has been deactivated. Please contact support for assistance.",
          code: "ACCOUNT_DEACTIVATED",
          suggestion: "Contact our support team to reactivate your account.",
        });
      }

      // Verify password
      const isValidPassword = await user.verifyPassword(password);
      console.log("[LOGIN] Password verification:", isValidPassword);
      if (!isValidPassword) {
        console.log("[LOGIN] ❌ Invalid password for:", emailLower);
        return res.status(401).json({
          error:
            "Invalid email or password. Please check your credentials and try again.",
          code: "INVALID_CREDENTIALS",
          suggestion: "Make sure your password is correct and try again.",
        });
      }

      console.log("[LOGIN] ✅ Password verified for:", emailLower);

      if (user.lastLoginProvider !== "email") {
        await User.updateOne(
          { _id: user._id },
          { lastLoginProvider: "email" }
        );
      }

      // Generate tokens
      const tokens = generateTokens(user._id);
      await persistSession(user._id, tokens, req);

      res.json({
        message: "Welcome back! You have successfully logged in.",
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tokens,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  }
);

// Logout endpoint
router.post("/logout", verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    // Remove session from database
    await revokeSessionByToken(token);

    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Logout failed" });
  }
});

// Get current user
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-passwordHash");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        walletAddress: user.walletAddress,
        emailVerified: user.emailVerified,
        profile: user.profile,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user data" });
  }
});

// Refresh token endpoint
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      console.error("Refresh token verify error:", error.message);
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    // Check if session exists
    const session = await findActiveSessionByRefreshToken(refreshToken);

    if (!session) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    // Generate new tokens
    const tokens = generateTokens(decoded.userId);
    await rotateSessionTokens(session, tokens);

    res.json({
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

// Update user profile
router.put(
  "/profile",
  verifyToken,
  [
    body("name").optional().trim().isLength({ min: 1, max: 200 }),
    body("firstName").optional().trim().isLength({ min: 1, max: 100 }),
    body("lastName").optional().trim().isLength({ min: 1, max: 100 }),
    body("phone").optional().isMobilePhone(),
    body("city").optional().trim().isLength({ max: 100 }),
    body("country").optional().trim().isLength({ max: 100 }),
    body("bio").optional().trim().isLength({ max: 500 }),
    body("website").optional().isURL().withMessage("Invalid website URL"),
    body("location").optional().trim().isLength({ max: 100 }),
    body("avatarUrl")
      .optional()
      .custom((value) => {
        if (!value) return true; // Optional field
        // Check if it's a valid base64 data URL
        if (typeof value !== "string") return false;
        if (!value.startsWith("data:image/")) return false;
        // Check size (base64 is ~1.33x larger than original, so 3.75MB base64 = ~5MB image)
        if (value.length > 3.75 * 1024 * 1024) {
          throw new Error("Avatar image too large (max 5MB)");
        }
        return true;
      }),
    body("notifications.email").optional().isBoolean(),
    body("notifications.push").optional().isBoolean(),
    body("notifications.sms").optional().isBoolean(),
    body("privacy.profileVisibility")
      .optional()
      .isIn(["public", "private", "friends"]),
    body("privacy.showEmail").optional().isBoolean(),
    body("privacy.showPhone").optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const {
        name,
        firstName,
        lastName,
        phone,
        city,
        country,
        bio,
        website,
        location,
        avatarUrl,
        notifications,
        privacy,
        preferences,
      } = req.body;

      // Update user
      const updateData = {};
      if (name) updateData.name = name;
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (bio !== undefined) updateData.bio = bio;
      if (website !== undefined) updateData.website = website;
      if (location !== undefined) updateData.location = location;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

      // Handle nested objects
      if (phone || city || country || preferences) {
        updateData.profile = {
          phone: phone || req.user.profile?.phone,
          city: city || req.user.profile?.city,
          country: country || req.user.profile?.country,
          preferences: preferences || req.user.profile?.preferences || {},
        };
      }

      if (notifications) {
        updateData.notifications = {
          email:
            notifications.email !== undefined
              ? notifications.email
              : req.user.notifications?.email ?? true,
          push:
            notifications.push !== undefined
              ? notifications.push
              : req.user.notifications?.push ?? true,
          sms:
            notifications.sms !== undefined
              ? notifications.sms
              : req.user.notifications?.sms ?? false,
        };
      }

      if (privacy) {
        updateData.privacy = {
          profileVisibility:
            privacy.profileVisibility ||
            req.user.privacy?.profileVisibility ||
            "public",
          showEmail:
            privacy.showEmail !== undefined
              ? privacy.showEmail
              : req.user.privacy?.showEmail ?? false,
          showPhone:
            privacy.showPhone !== undefined
              ? privacy.showPhone
              : req.user.privacy?.showPhone ?? false,
        };
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true, runValidators: true }
      ).select("-passwordHash");

      res.json({
        message: "Profile updated successfully",
        user: updatedUser,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  }
);

module.exports = router;
