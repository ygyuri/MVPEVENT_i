const Event = require("../models/Event");

const MONGO_ID_RE = /^[0-9a-fA-F]{24}$/;

/**
 * Image URLs use `/api/events/:id/images/:file` where :id may be Mongo _id or event slug.
 */
async function findEventForImageRoute(idParam) {
  if (idParam == null || typeof idParam !== "string") return null;
  const trimmed = idParam.trim();
  if (!trimmed) return null;
  try {
    if (MONGO_ID_RE.test(trimmed)) {
      return await Event.findById(trimmed).select("status").lean();
    }
    return await Event.findOne({ slug: trimmed }).select("status").lean();
  } catch (e) {
    console.warn("[resolveEventForImageRoute]", e?.message || e);
    return null;
  }
}

module.exports = { findEventForImageRoute };
