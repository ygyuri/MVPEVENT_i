import React, { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Paperclip, X, Send, Save } from "lucide-react";
import api from "../../utils/api";
import { setDraft } from "../../store/slices/bulkEmailSlice";
import RichTextEditor from "./RichTextEditor";
import ImageDropZone from "./ImageDropZone";
import EmailPreview from "./EmailPreview";

const SERVE_INLINE_PREFIX = "/api/admin/communications/serve-inline";

function buildServeInlineUrl(img) {
  return `${api.defaults.baseURL || ""}${SERVE_INLINE_PREFIX}?path=${encodeURIComponent(img.path)}&cid=${encodeURIComponent(img.cid)}&contentType=${encodeURIComponent(img.contentType || "image/jpeg")}`;
}

/** Placeholder data URL so img never loads cid: or serve-inline (which would 401). Encodes cid so we can restore when saving. */
function placeholderDataUrlForCid(cid) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><title>cid:${cid}</title></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Replace cid: and serve-inline with blob or placeholder so img never loads cid: (ERR_UNKNOWN_URL_SCHEME) or serve-inline (401). */
function bodyHtmlForDisplay(bodyHtml, inlineImages, blobUrlsByCid = {}) {
  if (!bodyHtml) return "";
  let out = bodyHtml;
  // Replace serve-inline URLs in img src (browser doesn't send Authorization -> 401)
  const serveInlineRe = new RegExp(
    `src=["']([^"']*${SERVE_INLINE_PREFIX.replace(/\//g, "\\/")}[^"']*cid=([^"&']+)[^"']*)["']`,
    "gi"
  );
  out = out.replace(serveInlineRe, (_, _url, cid) => {
    const decoded = decodeURIComponent(cid);
    const src = blobUrlsByCid[decoded] || placeholderDataUrlForCid(decoded);
    return `src="${src}"`;
  });
  // Replace cid: in img src (double or single quotes; browser can't load cid:)
  out = out.replace(/src=["']cid:([^"']+)["']/gi, (_, cid) => {
    const src = blobUrlsByCid[cid] || placeholderDataUrlForCid(cid);
    return `src="${src}"`;
  });
  return out;
}

/** Replace blob:, placeholder data URLs, and serve-inline URLs back with cid: for storing/sending. */
function bodyHtmlForStore(html, blobUrlsByCid = {}) {
  if (!html) return html || "";
  let out = html;
  for (const [cid, blobUrl] of Object.entries(blobUrlsByCid)) {
    if (blobUrl && out.includes(blobUrl)) {
      out = out.replace(new RegExp(blobUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), `cid:${cid}`);
    }
  }
  // Placeholder data URL (svg with <title>cid:XXX</title>) -> cid:XXX
  out = out.replace(/src="data:image\/svg\+xml,[^"]*"/gi, (match) => {
    try {
      const dataPart = match.slice(6, -1); // strip src=" and "
      const decoded = decodeURIComponent(dataPart.replace(/^data:image\/svg\+xml,/, ""));
      const m = decoded.match(/<title>cid:([^<]+)<\/title>/i);
      return m ? `src="cid:${m[1]}"` : match;
    } catch {
      return match;
    }
  });
  // Serve-inline URL -> cid:XXX
  out = out.replace(
    new RegExp(`(?:https?:\\/\\/[^"']+)?${SERVE_INLINE_PREFIX.replace(/\//g, "\\/")}\\?[^"']*cid=([^"&]+)`, "gi"),
    (_, cid) => `cid:${decodeURIComponent(cid)}`
  );
  return out;
}

const EmailComposer = ({ onSaveDraft, onSend, saving, sending }) => {
  const dispatch = useDispatch();
  const { draft, selectedAttendeeIds } = useSelector((state) => state.bulkEmail);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = React.useState(false);
  const [localAttachments, setLocalAttachments] = React.useState(draft.attachments || []);
  const [localInlineImages, setLocalInlineImages] = React.useState(draft.inlineImages || []);
  const [blobUrlsByCid, setBlobUrlsByCid] = useState({});

  // Fetch inline images with auth and create blob URLs so <img> can display them (img doesn't send Authorization).
  useEffect(() => {
    const toFetch = localInlineImages.filter((img) => !blobUrlsByCid[img.cid]);
    if (toFetch.length === 0) return;
    let cancelled = false;
    const fetched = {};
    Promise.all(
      toFetch.map(async (img) => {
        try {
          const url = buildServeInlineUrl(img);
          const res = await api.get(url, { responseType: "blob" });
          if (cancelled) return;
          fetched[img.cid] = URL.createObjectURL(res.data);
        } catch (err) {
          console.warn("Failed to load inline image for preview:", img.cid, err);
        }
      })
    ).then(() => {
      if (!cancelled && Object.keys(fetched).length) setBlobUrlsByCid((prev) => ({ ...prev, ...fetched }));
    });
    return () => { cancelled = true; };
  }, [localInlineImages, blobUrlsByCid]);

  // Revoke blob URLs when an image is removed.
  useEffect(() => {
    const currentCids = new Set(localInlineImages.map((img) => img.cid));
    setBlobUrlsByCid((prev) => {
      const next = { ...prev };
      let changed = false;
      Object.keys(prev).forEach((cid) => {
        if (!currentCids.has(cid)) {
          URL.revokeObjectURL(prev[cid]);
          delete next[cid];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [localInlineImages]);

  const blobUrlsRef = useRef(blobUrlsByCid);
  blobUrlsRef.current = blobUrlsByCid;
  useEffect(() => () => {
    Object.values(blobUrlsRef.current).forEach(URL.revokeObjectURL);
  }, []);

  const displayBodyHtml = useMemo(
    () => bodyHtmlForDisplay(draft.bodyHtml, localInlineImages, blobUrlsByCid),
    [draft.bodyHtml, localInlineImages, blobUrlsByCid]
  );

  const handleSubjectChange = (e) => {
    dispatch(setDraft({ subject: e.target.value }));
  };

  const handleBodyChange = useCallback(
    (html) => {
      const forStore = bodyHtmlForStore(html, blobUrlsByCid);
      dispatch(setDraft({ bodyHtml: forStore }));
    },
    [dispatch, blobUrlsByCid]
  );

  /** Called by ImageDropZone when an image is uploaded; append img HTML and add to inline images. */
  const handleInsertInlineImage = (imgHtml, inlineRef) => {
    const newBody = (draft.bodyHtml || "") + imgHtml;
    const newInlineImages = [...localInlineImages, inlineRef];
    setLocalInlineImages(newInlineImages);
    dispatch(setDraft({ bodyHtml: newBody, inlineImages: newInlineImages }));
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const form = new FormData();
        form.append("file", files[i]);
        const res = await api.post("/api/admin/communications/upload-attachment", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data?.success && res.data.data) {
          setLocalAttachments((prev) => [...prev, res.data.data]);
        }
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (index) => {
    setLocalAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const removeInlineImage = (index) => {
    const item = localInlineImages[index];
    if (!item) return;
    const newInlineImages = localInlineImages.filter((_, i) => i !== index);
    setLocalInlineImages(newInlineImages);
    const re = new RegExp(`<img[^>]*src="cid:${item.cid.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>\\s*`, "gi");
    dispatch(setDraft({ bodyHtml: (draft.bodyHtml || "").replace(re, ""), inlineImages: newInlineImages }));
  };

  React.useEffect(() => {
    dispatch(setDraft({ attachments: localAttachments }));
  }, [localAttachments, dispatch]);

  React.useEffect(() => {
    dispatch(setDraft({ inlineImages: localInlineImages }));
  }, [localInlineImages, dispatch]);

  React.useEffect(() => {
    if (draft.attachments?.length) setLocalAttachments(draft.attachments);
  }, [draft.attachments?.length]);

  React.useEffect(() => {
    if (draft.inlineImages?.length) setLocalInlineImages(draft.inlineImages);
  }, [draft.inlineImages?.length]);

  const canSend = selectedAttendeeIds.length > 0 && (draft.subject?.trim() || draft.bodyHtml?.trim());

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden"
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Subject
        </label>
        <input
          type="text"
          value={draft.subject}
          onChange={handleSubjectChange}
          placeholder="Email subject"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Body
        </label>
        <RichTextEditor
          value={displayBodyHtml}
          onChange={handleBodyChange}
          placeholder="Write your message. Paste event links (e.g. .../events/my-event/checkout) and they’ll become rich cards when sent. Use the drop zone below to add images."
          minHeight="200px"
        />
        <div className="mt-2">
          <ImageDropZone onInsert={handleInsertInlineImage} />
        </div>
        {localInlineImages.length > 0 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {localInlineImages.length} image(s) will appear in the body
          </p>
        )}
        {localInlineImages.length > 0 && (
          <ul className="mt-2 space-y-1">
            {localInlineImages.map((img, i) => (
              <li
                key={img.cid}
                className="flex items-center justify-between text-sm py-1 px-2 rounded bg-gray-50 dark:bg-gray-700/50"
              >
                <span className="truncate text-gray-700 dark:text-gray-300">{img.filename}</span>
                <button
                  type="button"
                  onClick={() => removeInlineImage(i)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"
                  title="Remove from email"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <EmailPreview bodyHtml={displayBodyHtml} subject={draft.subject} />
      </div>

      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Attachments
          </label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            <Paperclip className="h-4 w-4" />
            {uploading ? "Uploading..." : "Add file"}
          </button>
        </div>
        {localAttachments.length > 0 && (
          <ul className="space-y-1">
            {localAttachments.map((att, i) => (
              <li
                key={i}
                className="flex items-center justify-between text-sm py-1 px-2 rounded bg-gray-50 dark:bg-gray-700/50"
              >
                <span className="truncate text-gray-700 dark:text-gray-300">{att.filename}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          PDF, images, Word. Max 10MB per file.
        </p>
      </div>

      <div className="p-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save draft"}
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={!canSend || sending}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </motion.div>
  );
};

export default EmailComposer;
