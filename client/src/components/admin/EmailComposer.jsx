import React, { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Paperclip, ImagePlus, X, Send, Save } from "lucide-react";
import api from "../../utils/api";
import { setDraft } from "../../store/slices/bulkEmailSlice";

/** Generate a unique CID for inline images (used in <img src="cid:...">). */
function generateCid() {
  return `poster-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const EmailComposer = ({ onSaveDraft, onSend, saving, sending }) => {
  const dispatch = useDispatch();
  const { draft, selectedAttendeeIds } = useSelector((state) => state.bulkEmail);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [uploading, setUploading] = React.useState(false);
  const [uploadingPoster, setUploadingPoster] = React.useState(false);
  const [localAttachments, setLocalAttachments] = React.useState(draft.attachments || []);
  const [localInlineImages, setLocalInlineImages] = React.useState(draft.inlineImages || []);

  const handleSubjectChange = (e) => {
    dispatch(setDraft({ subject: e.target.value }));
  };

  const handleBodyChange = (e) => {
    dispatch(setDraft({ bodyHtml: e.target.value }));
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

  /** Upload image and insert as inline poster inside the email body (CID attachment). */
  const handleInsertPoster = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadingPoster(true);
    try {
      let newBody = draft.bodyHtml || "";
      const added = [];
      for (let i = 0; i < files.length; i++) {
        const form = new FormData();
        form.append("file", files[i]);
        const res = await api.post("/api/admin/communications/upload-attachment", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data?.success && res.data.data) {
          const { filename, path: filePath, contentType } = res.data.data;
          const cid = generateCid();
          added.push({ cid, filename, path: filePath, contentType });
          const imgHtml = `\n<img src="cid:${cid}" alt="${filename.replace(/"/g, "&quot;")}" style="max-width:100%; height:auto;" />\n`;
          newBody += imgHtml;
        }
      }
      if (added.length > 0) {
        const newInlineImages = [...localInlineImages, ...added];
        setLocalInlineImages(newInlineImages);
        dispatch(setDraft({ bodyHtml: newBody, inlineImages: newInlineImages }));
      }
    } catch (err) {
      console.error("Poster upload failed:", err);
    } finally {
      setUploadingPoster(false);
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
        <textarea
          value={draft.bodyHtml}
          onChange={handleBodyChange}
          placeholder="Write your message. Use “Insert poster” to add an image that appears inside the email."
          rows={10}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[200px]"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleInsertPoster}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingPoster}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" />
            {uploadingPoster ? "Uploading..." : "Insert poster / image in email"}
          </button>
          {localInlineImages.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {localInlineImages.length} image(s) will appear in the body
            </span>
          )}
        </div>
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
