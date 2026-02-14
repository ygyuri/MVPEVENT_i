import React, { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Inter, Arial, sans-serif";

/**
 * Renders bodyHtml inside a frame with Desktop (600px) / Mobile (320px) toggle.
 * Uses a simplified shell so preview is close to sent result (no backend call).
 */
const EmailPreview = ({ bodyHtml = "", subject = "" }) => {
  const [mode, setMode] = useState("desktop"); // 'desktop' | 'mobile'
  const width = mode === "mobile" ? 320 : 600;
  const body = (bodyHtml || "").trim() || "<p><em>No content yet.</em></p>";

  const wrappedHtml = `<!DOCTYPE html>
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
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="body-cell">${body}</div>
  </div>
</body>
</html>`;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Preview</span>
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
      <div className="p-4 bg-gray-100 dark:bg-gray-900/50 flex justify-center overflow-auto">
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
            srcDoc={wrappedHtml}
            style={{
              width: width,
              height: 400,
              border: 0,
              display: "block",
            }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
};

export default EmailPreview;
