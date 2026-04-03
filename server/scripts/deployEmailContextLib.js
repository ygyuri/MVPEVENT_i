/**
 * Optional deploy context from CI (written to /tmp/deploy-email-context.json on the server).
 */
const fs = require("fs");

const DEFAULT_PATH =
  process.env.DEPLOY_EMAIL_CONTEXT_PATH || "/tmp/deploy-email-context.json";

function loadDeployContext() {
  try {
    if (!fs.existsSync(DEFAULT_PATH)) return null;
    const raw = fs.readFileSync(DEFAULT_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : null;
  } catch {
    return null;
  }
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDeployContextHtmlBlock(ctx) {
  if (!ctx) return "";
  const short =
    ctx.shortSha ||
    (typeof ctx.sha === "string" && ctx.sha.length >= 7
      ? ctx.sha.slice(0, 7)
      : "");
  const msg = escapeHtml(ctx.commitMessage || "").replace(/\n/g, "<br/>");
  const runUrl = ctx.runUrl ? escapeHtml(ctx.runUrl) : "";

  return `
    <div style="margin:20px 0;padding:16px;background:#f4f4f5;border-radius:8px;border-left:4px solid #8A4FFF;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#111;">This deployment</h2>
      <p style="margin:8px 0;color:#333;font-size:14px;line-height:1.55;"><strong>Latest commit message</strong> (what was merged / pushed):</p>
      <p style="margin:8px 0 12px;padding:12px;background:#fff;border-radius:6px;color:#222;font-size:14px;line-height:1.5;border:1px solid #e4e4e7;">${msg}</p>
      <p style="margin:8px 0;color:#555;font-size:13px;">
        <strong>Commit:</strong> <code>${escapeHtml(short || ctx.sha || "—")}</code>
        ${ctx.ref ? ` &nbsp;|&nbsp; <strong>Ref:</strong> ${escapeHtml(ctx.ref)}` : ""}
        ${ctx.repository ? ` &nbsp;|&nbsp; <strong>Repo:</strong> ${escapeHtml(ctx.repository)}` : ""}
      </p>
      ${
        runUrl
          ? `<p style="margin:8px 0;font-size:13px;"><a href="${runUrl}">Open GitHub Actions run</a></p>`
          : ""
      }
      <p style="margin:8px 0;color:#777;font-size:12px;">Workflow: ${escapeHtml(ctx.workflow || "—")} · Triggered by ${escapeHtml(ctx.actor || "unknown")} · ${escapeHtml(ctx.generatedAt || "")}</p>
    </div>
  `;
}

module.exports = {
  loadDeployContext,
  buildDeployContextHtmlBlock,
};
