import React, { useState, useCallback } from "react";
import { Monitor, Smartphone, Layers } from "lucide-react";
import api from "../../utils/api";

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Inter, Arial, sans-serif";

/** Strip scripts and event handlers so iframe srcdoc doesn't trigger "Blocked script execution" warnings. */
function sanitizeForPreview(html) {
  if (!html || typeof html !== "string") return "";
  let out = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, " ")
    .replace(/\s+on\w+\s*=\s*[^\s>]+/gi, " ");
  out = out.replace(/(\s(?:href|src)\s*=\s*["'])\s*javascript:[^"']*(["'])/gi, "$1#$2");
  out = out.replace(/(\s(?:href|src)\s*=\s*["'])\s*vbscript:[^"']*(["'])/gi, "$1#$2");
  out = out.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, "");
  out = out.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, "");
  return out;
}

function buildIframeHtml(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; font-family: ${FONT_STACK}; line-height: 1.6; color: #1a1a1a; background: #f5f5f5; }
    .wrapper { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .body-cell { padding: 24px 40px 32px; font-size: 16px; }
    .body-cell p { margin: 0 0 1rem; }
    .body-cell a { color: #2563eb; text-decoration: underline; }
    .body-cell img { max-width: 100%; height: auto; display: block; }
    .body-cell h2 { font-size: 1.25rem; margin: 0 0 0.5rem; }
    .body-cell h3 { font-size: 1.1rem; margin: 0 0 0.5rem; }
    .body-cell ul, .body-cell ol { margin: 0 0 1rem; padding-left: 1.5rem; }
    .body-cell blockquote { margin: 0 0 1rem; padding-left: 1rem; border-left: 4px solid #e5e7eb; color: #6b7280; }
    /* Event card styles (from server-side card template) */
    table { border-collapse: collapse; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="body-cell">${body}</div>
  </div>
</body>
</html>`;
}

/**
 * Renders bodyHtml inside a frame with Desktop (600px) / Mobile (320px) toggle.
 * The "With cards" mode calls the backend to process event links into rich cards,
 * matching exactly what recipients will see in the sent email.
 */
const EmailPreview = ({ bodyHtml = "", subject = "" }) => {
  const [mode, setMode] = useState("desktop");
  const [cardMode, setCardMode] = useState(false);
  const [processedHtml, setProcessedHtml] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState(null);

  const width = mode === "mobile" ? 320 : 600;
  const raw = (bodyHtml || "").trim() || "<p><em>No content yet.</em></p>";

  const toggleCardMode = useCallback(async () => {
    if (cardMode) {
      setCardMode(false);
      setProcessedHtml(null);
      setCardError(null);
      return;
    }
    setCardLoading(true);
    setCardError(null);
    try {
      const res = await api.post("/api/admin/communications/preview-body", { bodyHtml: raw });
      setProcessedHtml(res.data?.processedHtml || raw);
      setCardMode(true);
    } catch {
      setCardError("Could not load card preview — check that events are published.");
    } finally {
      setCardLoading(false);
    }
  }, [cardMode, raw]);

  const displayHtml = cardMode && processedHtml ? sanitizeForPreview(processedHtml) : sanitizeForPreview(raw);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview</span>
          <button
            type="button"
            onClick={toggleCardMode}
            disabled={cardLoading}
            title={cardMode ? "Switch back to raw preview" : "Preview with event link cards (as sent)"}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border transition-colors ${
              cardMode
                ? "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            } ${cardLoading ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <Layers className="h-3 w-3" />
            {cardLoading ? "Loading…" : cardMode ? "Cards on" : "With cards"}
          </button>
          {cardError && (
            <span className="text-xs text-red-500 dark:text-red-400">{cardError}</span>
          )}
        </div>
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
          <button
            type="button"
            onClick={() => setMode("desktop")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${
              mode === "desktop"
                ? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            title="Desktop (600px)"
          >
            <Monitor className="h-4 w-4" />
            Desktop
          </button>
          <button
            type="button"
            onClick={() => setMode("mobile")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border-l border-gray-300 dark:border-gray-600 ${
              mode === "mobile"
                ? "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-100"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            title="Mobile (320px)"
          >
            <Smartphone className="h-4 w-4" />
            Mobile
          </button>
        </div>
      </div>
      <div className="p-4 bg-gray-100 dark:bg-gray-900/50 flex flex-col items-center overflow-auto">
        {subject && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 w-full text-center">
            Subject: {subject}
          </p>
        )}
        <div
          style={{
            width: width,
            minHeight: 200,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            overflow: "hidden",
            backgroundColor: "#f5f5f5",
          }}
        >
          <iframe
            title="Email preview"
            srcDoc={buildIframeHtml(displayHtml)}
            style={{
              width: width,
              height: 400,
              border: 0,
              display: "block",
            }}
            sandbox="allow-same-origin"
          />
        </div>
        {!cardMode && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
            Event links are replaced with rich cards in the actual sent email.{" "}
            <button
              type="button"
              onClick={toggleCardMode}
              className="underline hover:text-gray-600 dark:hover:text-gray-300"
            >
              Preview with cards
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default EmailPreview;
