/**
 * Premium email template wrapper (Apple-standard).
 * Table-based HTML shell, no MJML. Produces html + plain text for multipart/alternative.
 */

const { convert: htmlToText } = require("html-to-text");

/**
 * Ensure every img has alt and style with display:block; max-width:100%; height:auto
 * @param {string} html
 * @returns {string}
 */
function ensureImageStyles(html) {
  if (!html || typeof html !== "string") return html;
  return html.replace(
    /<img(\s[^>]*?)>/gi,
    (match, attrs) => {
      let a = attrs;
      if (!/alt\s*=/i.test(a)) a += ' alt=""';
      const styleMatch = a.match(/style\s*=\s*["']([^"']*)["']/i);
      const needed = "display:block; max-width:100%; height:auto;";
      const existing = (styleMatch && styleMatch[1]) || "";
      const hasBlock = /display\s*:\s*block/i.test(existing);
      const hasMaxWidth = /max-width\s*:\s*100%/i.test(existing);
      const hasHeight = /height\s*:\s*auto/i.test(existing);
      if (!hasBlock || !hasMaxWidth || !hasHeight) {
        const combined = existing ? `${existing}; ${needed}` : needed;
        if (styleMatch) {
          a = a.replace(/style\s*=\s*["'][^"']*["']/i, `style="${combined}"`);
        } else {
          a += ` style="${needed}"`;
        }
      }
      return `<img${a}>`;
    }
  );
}

/**
 * Wrap body HTML in premium table-based shell. Optionally generate plain text.
 * @param {Object} opts
 * @param {string} opts.bodyHtml - Raw body content (may contain cid: images)
 * @param {string} [opts.logoUrl] - Hosted logo URL (optional)
 * @param {string} [opts.unsubscribeUrl] - Unsubscribe link
 * @param {string} [opts.viewInBrowserUrl] - View in browser link
 * @returns {{ html: string, text: string }}
 */
function wrapInPremiumShell(opts) {
  const {
    bodyHtml = "",
    logoUrl = process.env.EMAIL_LOGO_URL || "",
    unsubscribeUrl = process.env.EMAIL_UNSUBSCRIBE_URL || process.env.APP_URL || "#",
    viewInBrowserUrl = process.env.APP_URL || "#",
  } = opts;

  const body = ensureImageStyles((bodyHtml || "").trim() || "<p></p>");
  const fontStack =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Inter, Arial, sans-serif";

  const logoBlock = logoUrl
    ? `
    <tr>
      <td style="padding: 24px 40px 16px; text-align: center;">
        <img src="${logoUrl}" alt="Logo" style="max-width: 180px; height: auto; display: block; margin: 0 auto;" />
      </td>
    </tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Event-i</title>
  <!--[if mso]>
  <noscript>
    <div style="font-family: ${fontStack}; max-width: 600px; margin: 0 auto; padding: 40px;">
      ${body}
    </div>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: ${fontStack}; line-height: 1.6; color: #1a1a1a; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px;">
          ${logoBlock}
          <tr>
            <td style="padding: 24px 40px 32px; font-family: ${fontStack}; font-size: 16px; color: #1a1a1a; line-height: 1.6;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 32px; border-top: 1px solid #e5e7eb; font-family: ${fontStack}; font-size: 12px; color: #6b7280;">
              <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Unsubscribe</a>
              &nbsp;&#183;&nbsp;
              <a href="${viewInBrowserUrl}" style="color: #6b7280; text-decoration: underline;">View in browser</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = htmlToText(body, {
    wordwrap: 80,
    selectors: [{ selector: "img", format: "skip" }],
  });

  return { html, text };
}

module.exports = { wrapInPremiumShell, ensureImageStyles };
