const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { body, param, query, validationResult } = require("express-validator");
const { verifyToken, requireRole } = require("../middleware/auth");
const Event = require("../models/Event");
const User = require("../models/User");
const emailService = require("../services/emailService");

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/events");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `event-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|svg|bmp|tiff|pdf/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          "Only image files (JPEG, PNG, GIF, WebP, SVG, BMP, TIFF, PDF) are allowed"
        )
      );
    }
  },
});

// Helper function to process base64 images
const processBase64Images = async (media, eventId) => {
  if (!media) return media;

  const processedMedia = { ...media };

  // Process cover image
  if (media.coverImageUrl && media.coverImageUrl.startsWith("data:image/")) {
    try {
      const imageUrl = await saveBase64Image(
        media.coverImageUrl,
        eventId,
        "cover"
      );
      processedMedia.coverImageUrl = imageUrl;
      console.log("✅ [BASE64 PROCESSING] Cover image saved:", imageUrl);
    } catch (error) {
      console.error(
        "❌ [BASE64 PROCESSING] Failed to save cover image:",
        error
      );
    }
  }

  // Process gallery images
  if (media.galleryUrls && Array.isArray(media.galleryUrls)) {
    const processedGallery = [];
    for (let i = 0; i < media.galleryUrls.length; i++) {
      const url = media.galleryUrls[i];
      if (url && url.startsWith("data:image/")) {
        try {
          const imageUrl = await saveBase64Image(url, eventId, `gallery-${i}`);
          processedGallery.push(imageUrl);
          console.log("✅ [BASE64 PROCESSING] Gallery image saved:", imageUrl);
        } catch (error) {
          console.error(
            "❌ [BASE64 PROCESSING] Failed to save gallery image:",
            error
          );
        }
      } else {
        processedGallery.push(url);
      }
    }
    processedMedia.galleryUrls = processedGallery;
  }

  return processedMedia;
};

// Helper function to save base64 image to file system
const saveBase64Image = async (base64Data, eventId, imageType) => {
  try {
    // Extract base64 data and mime type
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error("Invalid base64 data");
    }

    const mimeType = matches[1];
    const base64String = matches[2];

    // Determine file extension
    const extension = mimeType.split("/")[1] || "jpg";

    // Generate unique filename
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const filename = `event-${eventId}-${imageType}-${uniqueSuffix}.${extension}`;

    // Ensure upload directory exists
    const uploadDir = path.join(__dirname, "../uploads/events");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Save file
    const filePath = path.join(uploadDir, filename);
    const buffer = Buffer.from(base64String, "base64");
    fs.writeFileSync(filePath, buffer);

    // Return URL path (public route for published events)
    return `/api/events/${eventId}/images/${filename}`;
  } catch (error) {
    console.error("❌ [SAVE BASE64] Error:", error);
    throw error;
  }
};

// Helpers
const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res
      .status(400)
      .json({ error: "Validation failed", details: errors.array() });
    return false;
  }
  return true;
};

const ensureOwnership = (eventDoc, user) => {
  if (!eventDoc) return { ok: false, code: 404, msg: "Event not found" };
  const isOwner = String(eventDoc.organizer) === String(user._id);
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin)
    return { ok: false, code: 403, msg: "ACCESS_DENIED" };
  return { ok: true };
};

const toSlug = (text) => {
  return (text || "")
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const makeUniqueSlug = async (baseSlug) => {
  let candidate = baseSlug;
  let i = 1;
  // Try up to a reasonable number; unique index will still protect DB
  while (await Event.exists({ slug: candidate })) {
    i += 1;
    candidate = `${baseSlug}-${i}`;
    if (i > 1000) break; // safety
  }
  return candidate;
};

const msPerDay = 24 * 60 * 60 * 1000;
const addDays = (date, days) =>
  new Date(new Date(date).getTime() + days * msPerDay);

const generateOccurrences = (master, rule) => {
  const occurrences = [];
  const start = new Date(master.dates.startDate);
  const end = new Date(master.dates.endDate);
  const durationMs = end - start;
  const max = Math.min(rule.count || 50, 50);
  const until = rule.until ? new Date(rule.until) : null;
  const interval = Math.max(rule.interval || 1, 1);

  if (rule.frequency === "daily") {
    let cursor = new Date(start);
    for (let idx = 0; idx < max; idx += 1) {
      if (until && cursor > until) break;
      const occStart = new Date(cursor);
      const occEnd = new Date(cursor.getTime() + durationMs);
      occurrences.push({ start: occStart, end: occEnd });
      cursor = addDays(cursor, interval);
    }
  } else if (rule.frequency === "weekly") {
    const weekdays =
      Array.isArray(rule.byWeekday) && rule.byWeekday.length
        ? rule.byWeekday.slice().sort()
        : [new Date(start).getDay()];
    let weekStart = new Date(start);
    let generated = 0;
    while (generated < max) {
      for (const wd of weekdays) {
        const day = new Date(weekStart);
        const currentWday = day.getDay();
        const delta = wd - currentWday;
        const occStart = addDays(day, delta);
        if (occStart < start) continue; // don't generate before first
        if (until && occStart > until) {
          generated = max;
          break;
        }
        const occEnd = new Date(occStart.getTime() + durationMs);
        occurrences.push({ start: occStart, end: occEnd });
        generated += 1;
        if (generated >= max) break;
      }
      weekStart = addDays(weekStart, 7 * interval);
    }
  } else if (rule.frequency === "monthly") {
    // Simple monthly by day-of-month of start date
    let cursor = new Date(start);
    for (let idx = 0; idx < max; idx += 1) {
      if (until && cursor > until) break;
      const occStart = new Date(cursor);
      const occEnd = new Date(cursor.getTime() + durationMs);
      occurrences.push({ start: occStart, end: occEnd });
      const next = new Date(cursor);
      next.setMonth(next.getMonth() + interval);
      cursor = next;
    }
  }
  return occurrences;
};

// Normalize and sanitize incoming tags into a string array
const normalizeTags = (raw) => {
  if (!raw) return [];
  try {
    // If it's already an array, coerce items to clean strings
    if (Array.isArray(raw)) {
      return raw
        .map((t) => (typeof t === "string" ? t : String(t)))
        .map((t) => t.trim())
        .filter(Boolean);
    }
    // If it's a JSON-like string (e.g. "['omenamoto']" or '["omenamoto"]') try JSON.parse
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (
        (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
        (trimmed.startsWith('"[') && trimmed.endsWith(']"'))
      ) {
        try {
          const parsed = JSON.parse(trimmed.replace(/^"|"$/g, ""));
          if (Array.isArray(parsed)) {
            return parsed
              .map((t) => (typeof t === "string" ? t : String(t)))
              .map((t) => t.trim())
              .filter(Boolean);
          }
        } catch (_) {
          // fallthrough to comma-split
        }
      }
      // Fallback: comma-separated string
      return trimmed
        .split(",")
        .map((t) => t.trim())
        .map((t) => t.replace(/^[\[\s'"`]+|[\]\s'"`]+$/g, ""))
        .filter(Boolean);
    }
  } catch (_) {
    // Ignore and return empty on parse failure
  }
  return [];
};

// Organizer dashboard summary
router.get(
  "/overview",
  verifyToken,
  requireRole(["organizer", "admin"]),
  async (req, res) => {
    try {
      // Allow admins to view organizer overview by passing organizerId
      const organizerId =
        req.user.role === "admin" && req.query.organizerId
          ? req.query.organizerId
          : req.user._id;

      const myEventsCount = await Event.countDocuments({
        organizer: organizerId,
      });
      res.json({ ok: true, overview: { myEventsCount } });
    } catch (error) {
      res.status(500).json({ error: "Failed to load organizer overview" });
    }
  }
);

// List my events
router.get(
  "/events",
  verifyToken,
  requireRole(["organizer", "admin"]),
  [
    query("status")
      .optional()
      .isIn(["draft", "published", "cancelled", "completed"]),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("pageSize").optional().isInt({ min: 1, max: 50 }).toInt(),
    query("organizerId").optional().isMongoId(), // For admin impersonation
  ],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;
      const { status, page = 1, pageSize = 12, organizerId } = req.query;

      // Allow admins to view events by organizerId, otherwise use current user
      const targetOrganizerId =
        req.user.role === "admin" && organizerId ? organizerId : req.user._id;

      const query = { organizer: targetOrganizerId };
      if (status) query.status = status;
      const skip = (Number(page) - 1) * Number(pageSize);
      const [items, total] = await Promise.all([
        Event.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(pageSize))
          .lean(),
        Event.countDocuments(query),
      ]);
      const totalPages = Math.ceil(total / Number(pageSize)) || 1;
      res.json({
        success: true,
        data: {
          items,
          pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            total,
            totalPages,
          },
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to list events" });
    }
  }
);

// Get single event (ownership enforced)
router.get(
  "/events/:id",
  verifyToken,
  requireRole(["organizer", "admin"]),
  [param("id").isMongoId()],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;
      const event = await Event.findById(req.params.id);
      const owns = ensureOwnership(event, req.user);
      if (!owns.ok) return res.status(owns.code).json({ error: owns.msg });
      res.json({ success: true, data: event });
    } catch (error) {
      res.status(500).json({ error: "Failed to get event" });
    }
  }
);

// Create draft
router.post(
  "/events",
  verifyToken,
  requireRole(["organizer", "admin"]),
  [
    body("title").optional().isString().trim(),
    body("pricing.price").optional().isFloat({ min: 0 }),
    body("ticketTypes").optional().isArray(),
  ],
  async (req, res) => {
    try {
      console.log("🔍 [CREATE EVENT] Request received:", {
        user: req.user._id,
        body: req.body,
        timestamp: new Date().toISOString(),
      });

      if (!handleValidation(req, res)) return;

      const payload = { ...req.body };
      payload.organizer = req.user._id;
      payload.status = "draft";

      // Normalize tags from client (accept array or stringified array or CSV)
      if (payload.tags !== undefined) {
        const before = payload.tags;
        payload.tags = normalizeTags(payload.tags);
        console.log("🏷️ [TAGS] Normalized:", { before, after: payload.tags });
      }

      // Do not allow client to set slug on draft creation
      delete payload.slug;

      // Prevent duplicate drafts: Check if user already has a recent draft with similar content
      if (payload.title?.trim()) {
        const recentDuplicate = await Event.findOne({
          organizer: req.user._id,
          status: "draft",
          title: payload.title.trim(),
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
        });

        if (recentDuplicate) {
          console.log(
            "🗑️ [DUPLICATE PREVENTION] Found recent similar draft, updating instead:",
            recentDuplicate._id
          );

          // Update the existing draft instead of creating a new one
          Object.assign(recentDuplicate, payload);
          recentDuplicate.version = (recentDuplicate.version || 0) + 1;
          await recentDuplicate.save();

          return res.json({
            success: true,
            message: "Draft updated successfully",
            data: {
              id: recentDuplicate._id,
              status: recentDuplicate.status,
              version: recentDuplicate.version,
              updatedAt: recentDuplicate.updatedAt,
            },
          });
        }
      }

      console.log("📝 [CREATE EVENT] Final payload:", payload);

      // Extra schema introspection for debugging
      try {
        const tagsPath = Event.schema.path("tags");
        console.log(
          "🧪 [CREATE EVENT] Schema.tags caster:",
          tagsPath?.caster?.instance,
          "options:",
          tagsPath?.options
        );
      } catch (_) {}

      const created = await Event.create(payload);

      console.log("✅ [CREATE EVENT] Success:", {
        id: created._id,
        title: created.title,
        status: created.status,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        data: {
          id: created._id,
          updatedAt: created.updatedAt,
          version: created.version,
        },
      });
    } catch (error) {
      console.error("❌ [CREATE EVENT] Error:", {
        message: error.message,
        stack: error.stack,
        body: req.body,
        timestamp: new Date().toISOString(),
      });
      res
        .status(500)
        .json({ error: "Failed to create draft", details: error.message });
    }
  }
);

// Update draft (partial)
router.patch(
  "/events/:id",
  verifyToken,
  requireRole(["organizer", "admin"]),
  [
    param("id").isMongoId(),
    body("version").optional().isInt({ min: 0 }).toInt(),
  ],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;
      const event = await Event.findById(req.params.id);
      const owns = ensureOwnership(event, req.user);
      if (!owns.ok) return res.status(owns.code).json({ error: owns.msg });
      if (event.status !== "draft")
        return res.status(400).json({ error: "Only drafts can be updated" });
      if (
        typeof req.body.version === "number" &&
        event.version !== req.body.version
      ) {
        return res
          .status(409)
          .json({ error: "Version conflict. Refresh and retry." });
      }
      const updatable = [
        "title",
        "description",
        "shortDescription",
        "category",
        "location",
        "dates",
        "capacity",
        "pricing",
        "flags",
        "media",
        "ticketTypes",
        "tags",
        "metadata",
        "qrSettings",
        "recurrence",
      ];
      for (const key of updatable) {
        if (req.body[key] !== undefined) {
          if (key === "tags") {
            const before = req.body[key];
            event[key] = normalizeTags(req.body[key]);
            console.log("🏷️ [TAGS][PATCH] Normalized:", {
              before,
              after: event[key],
            });
          } else {
            event[key] = req.body[key];
          }
        }
      }
      event.version = (event.version || 0) + 1;
      await event.save();
      res.json({
        success: true,
        data: {
          id: event._id,
          updatedAt: event.updatedAt,
          version: event.version,
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update draft" });
    }
  }
);

// Replace ticket types
router.put(
  "/events/:id/tickets",
  verifyToken,
  requireRole(["organizer", "admin"]),
  [param("id").isMongoId(), body("ticketTypes").isArray({ min: 0 })],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;
      const event = await Event.findById(req.params.id);
      const owns = ensureOwnership(event, req.user);
      if (!owns.ok) return res.status(owns.code).json({ error: owns.msg });
      const ticketTypes = req.body.ticketTypes || [];
      for (const t of ticketTypes) {
        if (t.price !== undefined && t.price < 0)
          return res.status(400).json({ error: "Ticket price must be >= 0" });
        if (t.quantity !== undefined && t.quantity < 0)
          return res
            .status(400)
            .json({ error: "Ticket quantity must be >= 0" });
        if (
          t.salesStart &&
          t.salesEnd &&
          new Date(t.salesStart) > new Date(t.salesEnd)
        ) {
          return res
            .status(400)
            .json({ error: "Ticket salesStart must be before salesEnd" });
        }
      }
      const capacity = event.capacity || Infinity;
      const totalQty = ticketTypes.reduce(
        (sum, t) => sum + (Number(t.quantity) || 0),
        0
      );
      if (capacity !== Infinity && totalQty > capacity)
        return res
          .status(400)
          .json({ error: "Sum of ticket quantities exceeds capacity" });
      event.ticketTypes = ticketTypes;
      if (event.status === "draft") event.version = (event.version || 0) + 1;
      await event.save();
      res.json({ success: true, data: { ticketTypes: event.ticketTypes } });
    } catch (error) {
      res.status(500).json({ error: "Failed to update ticket types" });
    }
  }
);

// Publish (with optional recurrence)
router.post(
  "/events/:id/publish",
  verifyToken,
  requireRole(["organizer", "admin"]),
  [param("id").isMongoId()],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;
      let event = await Event.findById(req.params.id);
      const owns = ensureOwnership(event, req.user);
      if (!owns.ok) return res.status(owns.code).json({ error: owns.msg });
      if (event.status !== "draft")
        return res.status(400).json({ error: "Only drafts can be published" });

      // Validate required-at-publish fields
      console.log("🔍 [PUBLISH] Event data validation:", {
        eventId: event._id,
        title: event.title,
        description: event.description,
        dates: event.dates,
        hasStartDate: !!event.dates?.startDate,
        hasEndDate: !!event.dates?.endDate,
      });

      if (!event.title || !event.description)
        return res
          .status(400)
          .json({ error: "Missing required fields: title/description" });
      const ds = event.dates || {};
      if (!ds.startDate || !ds.endDate)
        return res
          .status(400)
          .json({ error: "Missing required fields: dates.startDate/endDate" });
      if (new Date(ds.startDate) >= new Date(ds.endDate))
        return res
          .status(400)
          .json({ error: "startDate must be before endDate" });
      if (
        event.pricing &&
        event.pricing.isFree === false &&
        (event.pricing.price || 0) < 0
      ) {
        return res.status(400).json({ error: "Invalid pricing.price" });
      }

      // Process base64 images if present
      if (event.media) {
        const processedMedia = await processBase64Images(
          event.media,
          event._id
        );
        event.media = processedMedia;
      }

      // Ensure slug
      if (!event.slug) {
        const base = toSlug(event.title);
        event.slug = await makeUniqueSlug(base);
      }

      const rec = event.recurrence || { enabled: false };
      if (rec.enabled) {
        // Create child occurrences as published events, keep master as a container (not listed)
        const occs = generateOccurrences(event, rec);
        const toInsert = [];
        for (const occ of occs) {
          const occSlugBase = `${event.slug}-${occ.start
            .toISOString()
            .slice(0, 10)}`;
          const uniqueSlug = await makeUniqueSlug(occSlugBase);
          const child = {
            organizer: event.organizer,
            title: event.title,
            slug: uniqueSlug,
            description: event.description,
            shortDescription: event.shortDescription,
            category: event.category,
            location: event.location,
            dates: {
              startDate: occ.start,
              endDate: occ.end,
              timezone: event.dates?.timezone || "UTC",
            },
            capacity: event.capacity,
            pricing: event.pricing,
            flags: event.flags,
            status: "published",
            media: event.media,
            ticketTypes: event.ticketTypes,
            tags: event.tags,
            metadata: event.metadata,
            qrSettings: event.qrSettings,
            parentEventId: event._id,
          };
          toInsert.push(child);
        }
        const inserted = await Event.insertMany(toInsert);
        // Mark master as published (or keep as draft as a container). We'll mark as published for discoverability of the series head.
        event.status = "published";
        await event.save();
        return res.json({
          success: true,
          data: {
            masterId: event._id,
            occurrences: inserted.map((x) => ({
              id: x._id,
              slug: x.slug,
              startDate: x.dates.startDate,
            })),
          },
        });
      } else {
        event.status = "published";
        await event.save();

        // Send email notifications
        try {
          const organizer = await User.findById(event.organizer);
          if (organizer) {
            // Send notification to organizer
            await emailService.sendEventPublishedNotification(event, organizer);

            // Send notification to admin
            await emailService.sendEventPublishedAdminNotification(
              event,
              organizer
            );

            console.log(
              "✅ Email notifications sent for published event:",
              event._id
            );
          }
        } catch (emailError) {
          console.warn(
            "⚠️ Failed to send email notifications:",
            emailError.message
          );
          // Don't fail the publish if emails fail
        }

        return res.json({
          success: true,
          data: { id: event._id, slug: event.slug },
        });
      }
    } catch (error) {
      if (error && error.code === 11000) {
        return res
          .status(409)
          .json({ error: "Slug already exists. Try changing the title." });
      }
      res.status(500).json({ error: "Failed to publish event" });
    }
  }
);

// Cancel
router.post(
  "/events/:id/cancel",
  verifyToken,
  requireRole(["organizer", "admin"]),
  [param("id").isMongoId()],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;
      const event = await Event.findById(req.params.id);
      const owns = ensureOwnership(event, req.user);
      if (!owns.ok) return res.status(owns.code).json({ error: owns.msg });
      event.status = "cancelled";
      await event.save();
      res.json({
        success: true,
        data: { id: event._id, status: event.status },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel event" });
    }
  }
);

// Unpublish (revert to draft if event not started yet)
router.post(
  "/events/:id/unpublish",
  verifyToken,
  requireRole(["organizer", "admin"]),
  [param("id").isMongoId()],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;
      const event = await Event.findById(req.params.id);
      const owns = ensureOwnership(event, req.user);
      if (!owns.ok) return res.status(owns.code).json({ error: owns.msg });
      if (event.status !== "published")
        return res
          .status(400)
          .json({ error: "Only published events can be unpublished" });
      const now = new Date();
      if (event.dates?.startDate && new Date(event.dates.startDate) <= now) {
        return res
          .status(400)
          .json({ error: "Cannot unpublish events that already started" });
      }
      event.status = "draft";
      // Clear slug to avoid exposing a draft under public routes if desired
      // Keep slug if you want to republish under same URL. We'll keep slug.
      event.version = (event.version || 0) + 1;
      await event.save();
      res.json({
        success: true,
        data: { id: event._id, status: event.status, version: event.version },
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to unpublish event" });
    }
  }
);

// Upload images
router.post(
  "/events/:id/upload",
  verifyToken,
  requireRole(["organizer", "admin"]),
  [param("id").isMongoId()],
  upload.array("images", 10),
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;

      const event = await Event.findById(req.params.id);
      const owns = ensureOwnership(event, req.user);
      if (!owns.ok) return res.status(owns.code).json({ error: owns.msg });
      if (event.status !== "draft")
        return res.status(400).json({ error: "Only drafts can be updated" });

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const uploadedUrls = req.files.map((file) => {
        return `/api/events/${event._id}/images/${file.filename}`;
      });

      console.log("📸 [IMAGE UPLOAD]", {
        eventId: event._id,
        files: req.files.map((f) => f.filename),
        urls: uploadedUrls,
      });

      res.json({
        success: true,
        data: {
          urls: uploadedUrls,
          count: uploadedUrls.length,
        },
      });
    } catch (error) {
      console.error("❌ [IMAGE UPLOAD] Error:", error);
      res.status(500).json({ error: "Failed to upload images" });
    }
  }
);

// Serve uploaded images - PUBLIC for published events (backward compatibility)
// This ensures both old (/api/organizer/events/) and new (/api/events/) URLs work
router.get(
  "/events/:id/images/:filename",
  [param("id").isMongoId(), param("filename").isString()],
  async (req, res) => {
    try {
      // Validate inputs
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Security: Only serve images for published events
      const event = await Event.findById(req.params.id).select("status").lean();
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (event.status !== "published") {
        return res
          .status(404)
          .json({ error: "Event not found or not published" });
      }

      const imagePath = path.join(
        __dirname,
        "../uploads/events",
        req.params.filename
      );

      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ error: "Image not found" });
      }

      // Set proper caching headers for images
      res.setHeader("Cache-Control", "public, max-age=31536000"); // 1 year
      res.sendFile(path.resolve(imagePath));
    } catch (error) {
      console.error("❌ [IMAGE SERVE] Error:", error);
      res.status(500).json({ error: "Failed to serve image" });
    }
  }
);

// Clone
router.post(
  "/events/:id/clone",
  verifyToken,
  requireRole(["organizer", "admin"]),
  [
    param("id").isMongoId(),
    body("shiftDays").optional().isInt({ min: -365, max: 365 }).toInt(),
    body("copyMedia").optional().isBoolean().toBoolean(),
  ],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;
      const src = await Event.findById(req.params.id);
      const owns = ensureOwnership(src, req.user);
      if (!owns.ok) return res.status(owns.code).json({ error: owns.msg });
      const shiftDaysNum =
        typeof req.body.shiftDays === "number" ? req.body.shiftDays : null;
      const copyMedia = req.body.copyMedia !== false; // default true
      const newDates = { ...src.dates };
      if (shiftDaysNum !== null && newDates?.startDate && newDates?.endDate) {
        newDates.startDate = addDays(
          new Date(src.dates.startDate),
          shiftDaysNum
        );
        newDates.endDate = addDays(new Date(src.dates.endDate), shiftDaysNum);
      } else {
        delete newDates.startDate;
        delete newDates.endDate;
      }
      const cloneDoc = {
        organizer: req.user._id,
        title: src.title,
        description: src.description,
        shortDescription: src.shortDescription,
        category: src.category,
        location: src.location,
        dates: newDates,
        capacity: src.capacity,
        pricing: src.pricing,
        flags: src.flags,
        status: "draft",
        media: copyMedia ? src.media : undefined,
        ticketTypes: src.ticketTypes,
        tags: src.tags,
        metadata: src.metadata,
        qrSettings: src.qrSettings,
        parentEventId: null,
        recurrence: { enabled: false },
        slug: undefined,
        version: 0,
      };
      const created = await Event.create(cloneDoc);
      res.status(201).json({ success: true, data: { id: created._id } });
    } catch (error) {
      res.status(500).json({ error: "Failed to clone event" });
    }
  }
);

// Delete event
router.delete(
  "/events/:id",
  verifyToken,
  requireRole(["organizer", "admin"]),
  [param("id").isMongoId()],
  async (req, res) => {
    try {
      if (!handleValidation(req, res)) return;
      const event = await Event.findById(req.params.id);
      const owns = ensureOwnership(event, req.user);
      if (!owns.ok) return res.status(owns.code).json({ error: owns.msg });

      // Only allow deletion of drafts and cancelled events
      if (event.status !== "draft" && event.status !== "cancelled") {
        return res.status(400).json({
          error: "Only draft and cancelled events can be deleted",
        });
      }

      // Check if event has any orders/tickets
      const hasOrders = await require("../models/Order").countDocuments({
        event: event._id,
      });

      if (hasOrders > 0) {
        return res.status(400).json({
          error:
            "Cannot delete event with existing orders. Cancel the event instead.",
        });
      }

      await Event.findByIdAndDelete(req.params.id);

      console.log("🗑️ [EVENT DELETE]", {
        eventId: event._id,
        title: event.title,
        organizer: req.user._id,
      });

      res.json({
        success: true,
        message: "Event deleted successfully",
      });
    } catch (error) {
      console.error("❌ [EVENT DELETE] Error:", error);
      res.status(500).json({ error: "Failed to delete event" });
    }
  }
);

module.exports = router;
