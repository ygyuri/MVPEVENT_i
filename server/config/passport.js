const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const {
  generateTokens,
  persistSession,
} = require("../services/auth/tokenService");
const StatelessStateStore = require("../utils/statelessStateStore");

const getStateStore = () => {
  const secret =
    process.env.GOOGLE_STATE_SECRET ||
    process.env.JWT_SECRET ||
    "eventi-google-state";

  const ttl =
    typeof process.env.GOOGLE_STATE_TTL_MS !== "undefined"
      ? Number(process.env.GOOGLE_STATE_TTL_MS)
      : undefined;

  return new StatelessStateStore({
    secret,
    ttl,
  });
};

const toSafeUser = (userDoc) => {
  if (!userDoc) {
    return null;
  }

  const user =
    typeof userDoc.toJSON === "function" ? userDoc.toJSON() : { ...userDoc };

  return {
    id: user._id || user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    lastLoginProvider: user.lastLoginProvider,
  };
};

const resolveName = (profile) => {
  if (profile.displayName) {
    return profile.displayName;
  }

  const parts = [
    profile.name?.givenName || "",
    profile.name?.familyName || "",
  ].filter(Boolean);

  if (parts.length) {
    return parts.join(" ");
  }

  return "";
};

const configureGoogleStrategy = (passport) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (
    !clientId ||
    !clientSecret ||
    clientSecret === "your-google-client-secret" ||
    clientSecret.includes("your-") ||
    clientSecret.includes("replace-")
  ) {
    console.warn(
      "⚠️  Google OAuth environment variables are not fully configured. Google login will be disabled."
    );
    console.warn(
      "   Please set GOOGLE_CLIENT_SECRET to your actual secret from Google Cloud Console."
    );
    return; // Skip Google strategy registration if credentials are missing
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
        passReqToCallback: true,
        store: getStateStore(),
      },
      async (req, accessToken, _refreshToken, profile, done) => {
        console.log("🔐 [PASSPORT STRATEGY] Google OAuth strategy callback invoked", {
          profileId: profile.id,
          profileDisplayName: profile.displayName,
          profileEmails: profile.emails?.map(e => ({ value: e.value, verified: e.verified })),
          profileName: profile.name,
          hasPhotos: !!profile.photos?.length,
          timestamp: new Date().toISOString(),
        });

        try {
          // Validate email from Google profile
          const emailObj = profile.emails?.[0];
          const email = emailObj?.value?.toLowerCase()?.trim();
          
          console.log("🔍 [PASSPORT STRATEGY] Email validation", {
            emailObj: emailObj,
            email,
            isEmailVerified: emailObj?.verified !== false,
          });

          if (!email) {
            console.error("❌ [PASSPORT STRATEGY] No email in Google profile");
            return done(
              new Error(
                "Your Google account must include a verified email address."
              )
            );
          }

          // Check if email is verified in Google (best practice: trust Google's verification)
          // Note: Google OAuth typically only returns verified emails, but we check anyway
          const isEmailVerified = emailObj?.verified !== false;

          console.log("🔍 [PASSPORT STRATEGY] Looking up user", {
            googleId: profile.id,
            email,
            query: { $or: [{ googleId: profile.id }, { email }] },
          });

          // Check for suspended or inactive accounts BEFORE processing
          let user = await User.findOne({
            $or: [{ googleId: profile.id }, { email }],
          });

          console.log("🔍 [PASSPORT STRATEGY] User lookup result", {
            userFound: !!user,
            userId: user?._id,
            userEmail: user?.email,
            userGoogleId: user?.googleId,
            accountStatus: user?.accountStatus,
            isActive: user?.isActive,
          });

          if (user) {
            console.log("🔍 [PASSPORT STRATEGY] Checking account status for existing user");
            // Check account status - don't allow login if suspended
            if (user.accountStatus === "suspended") {
              console.error("❌ [PASSPORT STRATEGY] Account is suspended", {
                userId: user._id,
                email: user.email,
              });
              return done(
                new Error(
                  "Your account has been suspended. Please contact support for assistance."
                )
              );
            }

            // Check if account is active
            if (!user.isActive) {
              console.error("❌ [PASSPORT STRATEGY] Account is inactive", {
                userId: user._id,
                email: user.email,
              });
              return done(
                new Error(
                  "Your account is inactive. Please contact support for assistance."
                )
              );
            }
            console.log("✅ [PASSPORT STRATEGY] Account status checks passed");
          }

          const displayName = resolveName(profile);
          const avatarUrl = profile.photos?.[0]?.value;

          console.log("🔍 [PASSPORT STRATEGY] Profile data extracted", {
            displayName,
            avatarUrl,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
          });

          if (!user) {
            console.log("🆕 [PASSPORT STRATEGY] Creating new user account");
            // NEW USER: Create account with Google OAuth
            const username = await User.generateUniqueUsername(
              displayName,
              email
            );

            console.log("🔍 [PASSPORT STRATEGY] Generated username", { username });

            user = await User.create({
              email,
              googleId: profile.id,
              username,
              name: displayName || username,
              firstName: profile.name?.givenName || displayName || username,
              lastName: profile.name?.familyName || "",
              avatarUrl,
              emailVerified: isEmailVerified, // Use Google's verification status
              accountStatus: "active", // Google OAuth users are active by default
              isActive: true,
              lastLoginProvider: "google",
            });

            console.log(`✅ [PASSPORT STRATEGY] New Google OAuth user created: ${email} (${user._id})`, {
              userId: user._id,
              username: user.username,
              email: user.email,
              googleId: user.googleId,
            });
          } else {
            console.log("🔄 [PASSPORT STRATEGY] Updating existing user account");
            // EXISTING USER: Update profile and link Google account
            let hasUpdates = false;

            // Link Google account if not already linked
            if (!user.googleId) {
              user.googleId = profile.id;
              hasUpdates = true;
              console.log(`✅ [PASSPORT STRATEGY] Google account linked to existing user: ${email}`);
            }

            // Update email verification status (trust Google)
            if (!user.emailVerified && isEmailVerified) {
              user.emailVerified = true;
              hasUpdates = true;
            }

            // Update profile data on each login (best practice: keep data fresh)
            // Update avatar if Google has a newer one (or if user doesn't have one)
            if (avatarUrl && user.avatarUrl !== avatarUrl) {
              user.avatarUrl = avatarUrl;
              hasUpdates = true;
            }

            // Update name if missing or if Google has better data
            if (displayName && (!user.name || user.name.trim() === "")) {
              user.name = displayName;
              hasUpdates = true;
            }

            // Update firstName/lastName if missing
            if (profile.name?.givenName && !user.firstName) {
              user.firstName = profile.name.givenName;
              hasUpdates = true;
            }
            if (profile.name?.familyName && !user.lastName) {
              user.lastName = profile.name.familyName;
              hasUpdates = true;
            }

            // Update lastLoginProvider
            if (user.lastLoginProvider !== "google") {
              user.lastLoginProvider = "google";
              hasUpdates = true;
            }

            // Ensure account is active (in case it was deactivated)
            if (user.accountStatus !== "active") {
              user.accountStatus = "active";
              hasUpdates = true;
            }
            if (!user.isActive) {
              user.isActive = true;
              hasUpdates = true;
            }

            if (hasUpdates) {
              console.log("💾 [PASSPORT STRATEGY] Saving user updates", {
                updates: {
                  googleIdLinked: !user.googleId ? false : user.googleId === profile.id,
                  emailVerified: user.emailVerified,
                  avatarUpdated: !!avatarUrl && user.avatarUrl === avatarUrl,
                  nameUpdated: !!displayName && user.name === displayName,
                  lastLoginProvider: user.lastLoginProvider,
                },
              });
              await user.save();
              console.log(`✅ [PASSPORT STRATEGY] Google OAuth user profile updated: ${email}`, {
                userId: user._id,
              });
            } else {
              console.log("ℹ️ [PASSPORT STRATEGY] No updates needed for user");
            }
          }

          console.log("🔑 [PASSPORT STRATEGY] Generating tokens and creating session", {
            userId: user._id,
          });

          // Generate tokens and create session
          const tokens = generateTokens(user._id);
          console.log("✅ [PASSPORT STRATEGY] Tokens generated", {
            hasAccessToken: !!tokens?.accessToken,
            hasRefreshToken: !!tokens?.refreshToken,
          });

          await persistSession(user._id, tokens, req);
          console.log("✅ [PASSPORT STRATEGY] Session persisted");

          const safeUser = toSafeUser(user);
          console.log("✅ [PASSPORT STRATEGY] OAuth flow completed successfully", {
            userId: safeUser.id,
            email: safeUser.email,
            username: safeUser.username,
          });

          return done(null, {
            user: safeUser,
            tokens,
          });
        } catch (error) {
          console.error("❌ [PASSPORT STRATEGY] Error in OAuth strategy callback", {
            error: error,
            errorMessage: error.message,
            errorStack: error.stack,
            errorCode: error.code,
            errorName: error.name,
            keyPattern: error.keyPattern,
          });

          // Handle duplicate key errors (race conditions)
          if (error.code === 11000) {
            // Duplicate key error - likely email or googleId conflict
            const field = Object.keys(error.keyPattern || {})[0];
            console.error("❌ [PASSPORT STRATEGY] Duplicate key error", {
              field,
              keyPattern: error.keyPattern,
            });
            return done(
              new Error(
                `Account conflict detected. Please contact support if this issue persists.`
              )
            );
          }

          return done(
            error instanceof Error
              ? error
              : new Error("Authentication failed. Please try again.")
          );
        }
      }
    )
  );
};

module.exports = (passport) => {
  configureGoogleStrategy(passport);

  passport.serializeUser((payload, done) => done(null, payload));
  passport.deserializeUser((payload, done) => done(null, payload));
};

