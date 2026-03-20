const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

const generateUniqueUsername = async (base) => {
  const normalizedBase = (base || "user")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "");

  const safeBase = normalizedBase.length >= 3 ? normalizedBase : "user";

  let attempt = 0;
  while (attempt < 10) {
    const suffix = Math.floor(Math.random() * 10000);
    const candidate = `${safeBase}${suffix}`.slice(0, 50);

    // eslint-disable-next-line no-await-in-loop
    const exists = await User.findOne({ username: candidate }).select("_id");
    if (!exists) return candidate;

    attempt += 1;
  }

  // Fallback: timestamp-based suffix
  return `${safeBase}${Date.now().toString().slice(-6)}`.slice(0, 50);
};

module.exports = (passport) => {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.CALLBACK_URL;

  if (!clientID || !clientSecret || !callbackURL) {
    console.warn(
      "⚠️ [AUTH] Google OAuth not configured. Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / CALLBACK_URL"
    );
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email =
            profile.emails && profile.emails.length
              ? profile.emails[0].value
              : null;

          if (!email) {
            return done(null, false, {
              message: "Google account has no email address.",
            });
          }

          const emailLower = email.toLowerCase().trim();
          const displayName = profile.displayName || "";
          const avatarUrl =
            profile.photos && profile.photos.length ? profile.photos[0].value : null;

          // 1) Prefer existing user by googleId
          let user = await User.findOne({ googleId });

          // 2) Fallback: link by email (existing local account)
          if (!user) {
            user = await User.findOne({ email: emailLower });
          }

          if (user) {
            user.googleId = user.googleId || googleId;
            user.email = user.email || emailLower;
            user.emailVerified = true;
            if (!user.name && displayName) user.name = displayName;
            if (!user.avatarUrl && avatarUrl) user.avatarUrl = avatarUrl;
            await user.save();
            return done(null, user);
          }

          // Create a new user
          const baseUsername = emailLower.split("@")[0] || "user";
          const username = await generateUniqueUsername(baseUsername);

          const newUser = new User({
            googleId,
            email: emailLower,
            username,
            name: displayName || baseUsername,
            avatarUrl: avatarUrl || undefined,
            emailVerified: true,
            role: "customer",
            isActive: true,
            accountStatus: "active",
          });

          await newUser.save();
          return done(null, newUser);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  // We are not using sessions for OAuth; these are no-ops but safe if added later.
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select("-passwordHash");
      done(null, user);
    } catch (e) {
      done(e);
    }
  });
};
