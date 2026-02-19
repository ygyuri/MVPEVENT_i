/**
 * Replaces event links in email body HTML with rich, engaging event cards
 * (image + title + description + CTA). Runs at send time.
 */

const Event = require("../../models/Event");

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Inter, Arial, sans-serif";

/** Match <a href=".../events/SLUG/..." or ".../events/SLUG"> */
const EVENT_LINK_REGEX =
  /<a[^>]+href=["'](https?:\/\/[^"']*?\/events\/([a-z0-9-]+)(?:\/checkout)?[^"']*)["'][^>]*>[\s\S]*?<\/a>/gi;

/** Match plain event URL (no <a>), e.g. pasted https://.../events/slug/checkout */
const PLAIN_EVENT_URL_REGEX =
  /(https?:\/\/[^\s"'<>]+?\/events\/([a-z0-9-]+)(?:\/checkout)?)(?=[\s"']|$)/g;

function truncate(str, maxLen = 140) {
  if (!str || typeof str !== "string") return "";
  const stripped = str.replace(/\s+/g, " ").trim();
  if (stripped.length <= maxLen) return stripped;
  return stripped.slice(0, maxLen - 3) + "...";
}

function buildEventCardHtml(event, eventUrl, baseUrl) {
  const title = (event.title || "Event").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const desc = truncate(event.shortDescription || event.description || "", 140);
  const descSafe = desc.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let imgSrc = event.media?.coverImageUrl || "";
  if (imgSrc && !/^https?:\/\//i.test(imgSrc)) {
    imgSrc = (baseUrl || "").replace(/\/$/, "") + (imgSrc.startsWith("/") ? imgSrc : "/" + imgSrc);
  }
  const hasImage = imgSrc && imgSrc.startsWith("http");

  const imageCell = hasImage
    ? `
    <td width="180" valign="top" style="padding:0; vertical-align:top;">
      <a href="${eventUrl}" style="display:block; text-decoration:none;">
        <img src="${imgSrc}" alt="${title}" width="180" style="display:block; width:180px; max-width:180px; height:auto; border:0; border-radius:8px 0 0 8px;" />
      </a>
    </td>`
    : "";

  const contentCell = `
    <td valign="top" style="padding:20px; vertical-align:top; ${!hasImage ? "border-radius:8px;" : ""}">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="font-family:${FONT_STACK}; font-size:18px; font-weight:700; color:#1a1a1a; line-height:1.3; margin-bottom:8px;">
            <a href="${eventUrl}" style="color:#1a1a1a; text-decoration:none;">${title}</a>
          </td>
        </tr>
        ${descSafe ? `<tr><td style="font-family:${FONT_STACK}; font-size:14px; color:#6b7280; line-height:1.5; padding-top:8px;">${descSafe}</td></tr>` : ""}
        <tr>
          <td style="padding-top:16px;">
            <a href="${eventUrl}" style="display:inline-block; font-family:${FONT_STACK}; font-size:14px; font-weight:600; color:#ffffff; background:#2563eb; padding:12px 20px; text-decoration:none; border-radius:8px;">View event & get tickets</a>
          </td>
        </tr>
      </table>
    </td>`;

  const tableContent = hasImage
    ? `${imageCell}${contentCell}`
    : contentCell;

  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px 0;">
  <tr>
    <td style="padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; background:#ffffff;">
        <tr>
          ${tableContent}
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/**
 * Replace event links in bodyHtml with rich cards. Fetches event by slug and builds card HTML.
 * @param {string} bodyHtml - Email body HTML (may contain event links)
 * @param {string} [baseUrl] - App base URL for event links and images (e.g. process.env.APP_URL)
 * @returns {Promise<string>} - Body HTML with links replaced by cards
 */
async function replaceEventLinksWithCards(bodyHtml, baseUrl) {
  if (!bodyHtml || typeof bodyHtml !== "string") return bodyHtml;
  const url = (
    baseUrl ||
    process.env.APP_URL ||
    process.env.BASE_URL ||
    process.env.FRONTEND_URL ||
    ""
  ).replace(/\/$/, "");

  const linkMatches = [];
  let m;
  const linkRegex = new RegExp(EVENT_LINK_REGEX.source, "gi");
  while ((m = linkRegex.exec(bodyHtml)) !== null) {
    linkMatches.push({ fullMatch: m[0], fullUrl: m[1], slug: m[2] });
  }

  const plainMatches = [];
  const plainRegex = new RegExp(PLAIN_EVENT_URL_REGEX.source, "g");
  while ((m = plainRegex.exec(bodyHtml)) !== null) {
    plainMatches.push({ fullMatch: m[1], slug: m[2] });
  }

  const slugToCard = new Map();
  const slugs = [...new Set([...linkMatches.map((x) => x.slug), ...plainMatches.map((x) => x.slug)])];

  for (const slug of slugs) {
    try {
      const event = await Event.findOne({ slug, status: "published" })
        .select("title slug shortDescription description media.coverImageUrl location dates pricing")
        .lean();
      if (event) {
        const eventUrl = `${url}/events/${slug}/checkout`;
        slugToCard.set(slug, buildEventCardHtml(event, eventUrl, url));
      }
    } catch (err) {
      console.warn("[eventCardService] Failed to fetch event for card:", slug, err.message);
    }
  }

  let out = bodyHtml;
  for (const { fullMatch, slug } of linkMatches) {
    const card = slugToCard.get(slug);
    if (card) out = out.replace(fullMatch, card);
  }
  for (const { fullMatch, slug } of plainMatches) {
    const card = slugToCard.get(slug);
    if (card) out = out.replace(fullMatch, card);
  }

  return out;
}

module.exports = { replaceEventLinksWithCards, buildEventCardHtml };
