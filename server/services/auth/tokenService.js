const jwt = require("jsonwebtoken");
const Session = require("../../models/Session");
const { JWT_SECRET } = require("../../middleware/auth");

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TTL || "1h";
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_TTL || "7d";
const SESSION_TTL_MS =
  Number(process.env.REFRESH_SESSION_TTL_MS) || 7 * 24 * 60 * 60 * 1000;

const resolveMetadata = (req, overrides = {}) => {
  const userAgent =
    overrides.userAgent ||
    (typeof req?.get === "function"
      ? req.get("User-Agent")
      : req?.headers?.["user-agent"]);

  const forwardedFor = req?.headers?.["x-forwarded-for"];
  const ipAddress =
    overrides.ipAddress ||
    req?.ip ||
    (Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(",")?.[0]) ||
    req?.connection?.remoteAddress ||
    req?.socket?.remoteAddress ||
    req?.connection?.socket?.remoteAddress;

  return { userAgent, ipAddress };
};

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
  const refreshToken = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL,
  });

  return { accessToken, refreshToken };
};

const persistSession = async (userId, tokens, req, metadata = {}) => {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const { userAgent, ipAddress } = resolveMetadata(req, metadata);

  const session = new Session({
    userId,
    sessionToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt,
    userAgent,
    ipAddress,
    isActive: metadata.isActive ?? true,
  });

  await session.save();
  return session;
};

const findActiveSessionByRefreshToken = async (refreshToken) =>
  Session.findOne({
    refreshToken,
    expiresAt: { $gt: new Date() },
    isActive: true,
  });

const rotateSessionTokens = async (session, tokens) => {
  session.sessionToken = tokens.accessToken;
  session.refreshToken = tokens.refreshToken;
  session.lastUsedAt = new Date();
  session.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await session.save();
  return session;
};

const verifyRefreshToken = (refreshToken) =>
  jwt.verify(refreshToken, JWT_SECRET);

const revokeSessionByToken = async (sessionToken) => {
  if (!sessionToken) {
    return null;
  }
  return Session.findOneAndDelete({ sessionToken });
};

module.exports = {
  generateTokens,
  persistSession,
  findActiveSessionByRefreshToken,
  rotateSessionTokens,
  verifyRefreshToken,
  revokeSessionByToken,
};

