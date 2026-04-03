/**
 * Public poll / event uploads: GET /api/events/:eventId/images/:fileName
 * Mounted before the main events router so nothing else intercepts the path.
 */
const express = require("express");
const path = require("path");
const fs = require("fs");
const { findEventForImageRoute } = require("../utils/resolveEventForImageRoute");

const router = express.Router();

const EXT_TO_MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function safeFileName(raw) {
  if (raw == null || typeof raw !== "string") return null;
  const base = path.basename(raw.trim());
  if (!base || base !== raw.replace(/\\/g, "/").split("/").pop()) return null;
  if (base.includes("..")) return null;
  if (base.length > 256) return null;
  return base;
}

router.get("/:eventId/images/:fileName", (req, res) => {
  const eventKey = req.params.eventId;
  const fileName = safeFileName(req.params.fileName);
  if (!eventKey || !fileName) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const run = async () => {
    const event = await findEventForImageRoute(eventKey);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const isPollOptionUpload =
      typeof fileName === "string" && fileName.startsWith("poll-opt-");
    if (!isPollOptionUpload && event.status !== "published") {
      return res.status(404).json({ error: "Event not found or not published" });
    }

    const imagePath = path.join(__dirname, "../uploads/events", fileName);
    const absolute = path.resolve(imagePath);
    const uploadsRoot = path.resolve(path.join(__dirname, "../uploads/events"));
    const rel = path.relative(uploadsRoot, absolute);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      return res.status(400).json({ error: "Invalid path" });
    }

    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      return res.status(404).json({ error: "Image not found" });
    }

    const ext = path.extname(fileName).toLowerCase();
    const mime = EXT_TO_MIME[ext] || "application/octet-stream";

    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Content-Type", mime);
    res.setHeader("Cache-Control", "public, max-age=31536000");

    const stream = fs.createReadStream(absolute);
    stream.on("error", (err) => {
      console.error("[eventImage] stream error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to serve image" });
      } else {
        res.destroy(err);
      }
    });
    stream.pipe(res);
  };

  run().catch((err) => {
    console.error("[eventImage] handler error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to serve image" });
    }
  });
});

module.exports = router;
