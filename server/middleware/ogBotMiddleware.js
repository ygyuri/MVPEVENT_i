/**
 * Social bot Open Graph middleware.
 *
 * For requests to /events/:slug or /events/:slug/checkout from known social
 * crawlers (WhatsApp, iMessage, Slack, Telegram, Discord, Facebook, Twitter, etc.),
 * this serves a minimal HTML page containing per-event OG meta tags so that
 * link previews (hover cards, unfurls) show the event title, image, and description
 * instead of the generic site fallback from index.html.
 *
 * Regular browser requests are passed through to the next handler unchanged.
 *
 * Register this BEFORE the 404 handler in server/index.js.
 */

const Event = require("../models/Event");

const BOT_AGENTS = [
  "facebookexternalhit",
  "facebookcatalog",
  "twitterbot",
  "slackbot",
  "whatsapp",
  "telegrambot",
  "discordbot",
  "linkedinbot",
  "applebot",
  "google-inspectiontool",
  "googlebot",
  "bingbot",
  "pinterestbot",
  "redditbot",
  "iframely",
  "unfurl",
  "preview",
  "crawler",
  "spider",
  "bot/",
];

function isSocialBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return BOT_AGENTS.some((b) => ua.includes(b));
}

const EVENT_PATH_REGEX = /^\/events\/([a-z0-9-]+)(\/.*)?$/i;

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function ogBotMiddleware(req, res, next) {
  if (req.method !== "GET") return next();
  if (req.path.startsWith("/api")) return next();

  const match = EVENT_PATH_REGEX.exec(req.path);
  if (!match) return next();

  const userAgent = req.get("user-agent") || "";
  if (!isSocialBot(userAgent)) return next();

  const slug = match[1];

  try {
    const event = await Event.findOne({ slug, status: "published" })
      .select("title slug shortDescription description media.coverImageUrl dates.startDate location.city location.country")
      .lean();

    if (!event) return next();

    const appUrl = (process.env.APP_URL || "https://event-i.co.ke").replace(/\/$/, "");
    const pageUrl = `${appUrl}/events/${slug}/checkout`;

    const title = escapeHtml(event.title || "Event");
    const rawDesc =
      event.shortDescription ||
      (event.description ? event.description.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 155) + "..." : "") ||
      "Secure your ticket now at Event-i.";
    const desc = escapeHtml(rawDesc);

    let imgSrc = event.media?.coverImageUrl || "";
    if (imgSrc && !/^https?:\/\//i.test(imgSrc)) {
      imgSrc = appUrl + (imgSrc.startsWith("/") ? imgSrc : "/" + imgSrc);
    }
    if (!imgSrc) imgSrc = `${appUrl}/og-image.png`;
    imgSrc = escapeHtml(imgSrc);

    const safePageUrl = escapeHtml(pageUrl);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | Event-i</title>
  <meta name="description" content="${desc}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${safePageUrl}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:image" content="${imgSrc}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Event-i" />
  <meta property="og:locale" content="en_US" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${safePageUrl}" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${imgSrc}" />

  <!-- Redirect browsers that end up here (non-bot path) -->
  <meta http-equiv="refresh" content="0; url=${safePageUrl}" />
</head>
<body>
  <p>Redirecting… <a href="${safePageUrl}">View ${title}</a></p>
</body>
</html>`;

    console.log(`🤖 [OG] Social bot preview: slug=${slug}, ua=${userAgent.slice(0, 60)}`);
    res.set("Content-Type", "text/html; charset=utf-8");
    res.set("Cache-Control", "public, max-age=300");
    return res.send(html);
  } catch (err) {
    console.warn("[OG] Failed to generate OG page for slug:", slug, err.message);
    return next();
  }
}

module.exports = ogBotMiddleware;
