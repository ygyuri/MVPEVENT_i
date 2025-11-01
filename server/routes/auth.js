const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const crypto = require("crypto");
const User = require("../models/User");
const Session = require("../models/Session");
const {
  verifyToken,
  requireRole,
  registrationRateLimit,
  loginRateLimit,
  JWT_SECRET,
} = require("../middleware/auth");

const router = express.Router();

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
};

// Store session in database
const storeSession = async (userId, accessToken, refreshToken, req) => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const session = new Session({
    userId,
    sessionToken: accessToken,
    refreshToken,
    expiresAt,
    userAgent: req.get("User-Agent"),
    ipAddress: req.ip || req.connection.remoteAddress,
  });

  await session.save();
  return session;
};

// Registration endpoint
router.post(
  "/register",
  registrationRateLimit,
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
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

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });
      if (existingUser) {
        if (existingUser.email === email) {
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
      const userData = {
        email,
        username,
        walletAddress: walletAddress || null,
        emailVerified: false,
        role,
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

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user._id);
      await storeSession(user._id, accessToken, refreshToken, req);

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
        tokens: { accessToken, refreshToken },
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
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
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

      // Note: normalizeEmail() from express-validator may have removed dots from Gmail addresses
      // We need to try both with and without dots to find the correct user
      const normalizedEmail = email.toLowerCase().trim();
      console.log("[LOGIN] Normalized email:", normalizedEmail);

      let user = null;

      // For Gmail addresses, try both versions (with and without dots) since Gmail treats them as the same
      if (normalizedEmail.includes("@gmail.com")) {
        const localPart = normalizedEmail.split("@")[0];
        const domain = normalizedEmail.split("@")[1];

        // Try exact match first
        user = await User.findOne({ email: normalizedEmail });

        // If not found and normalized email has no dots, search for any version with dots
        if (!user && !localPart.includes(".")) {
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
          user = users.find((u) => u.email.includes(".")) || users[0];
        } else if (!user && localPart.includes(".")) {
          // If normalized has dots, also try without dots
          const withoutDots = localPart.replace(/\./g, "") + "@" + domain;
          console.log("[LOGIN] Trying without dots:", withoutDots);
          user = await User.findOne({ email: withoutDots });
        }
      } else {
        // For non-Gmail, just use exact match
        user = await User.findOne({ email: normalizedEmail });
      }

      if (!user) {
        console.log("[LOGIN] ❌ User not found for email:", normalizedEmail);
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
        console.log("[LOGIN] ❌ Account deactivated for:", normalizedEmail);
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
        console.log("[LOGIN] ❌ Invalid password for:", normalizedEmail);
        return res.status(401).json({
          error:
            "Invalid email or password. Please check your credentials and try again.",
          code: "INVALID_CREDENTIALS",
          suggestion: "Make sure your password is correct and try again.",
        });
      }

      console.log("[LOGIN] ✅ Password verified for:", normalizedEmail);

      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user._id);
      await storeSession(user._id, accessToken, refreshToken, req);

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
        tokens: {
          accessToken,
          refreshToken,
        },
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
    await Session.findOneAndDelete({ sessionToken: token });

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

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET);

    // Check if session exists
    const session = await Session.findOne({
      refreshToken,
      expiresAt: { $gt: new Date() },
      isActive: true,
    });

    if (!session) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      generateTokens(decoded.userId);

    // Update session
    session.sessionToken = newAccessToken;
    session.refreshToken = newRefreshToken;
    session.lastUsedAt = new Date();
    await session.save();

    res.json({
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
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
