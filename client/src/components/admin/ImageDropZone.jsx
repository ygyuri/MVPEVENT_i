import React, { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { ImagePlus } from "lucide-react";
import api from "../../utils/api";

const COMPRESS_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 800,
  useWebWorker: true,
  initialQuality: 0.8,
};

/** Generate a unique CID for inline images. */
function generateCid() {
  return `poster-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Drag-and-drop zone for images. Compresses before upload, then calls onInsert(htmlSnippet, inlineRef).
 * @param {Object} props
 * @param {function(string, { cid, filename, path, contentType }): void} props.onInsert - (imgHtml, inlineImageRef)
 * @param {boolean} [props.disabled]
 */
const ImageDropZone = ({ onInsert, disabled = false }) => {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);

  const compressIfImage = async (file) => {
    const type = (file.type || "").toLowerCase();
    if (!type.startsWith("image/")) return file;
    try {
      return await imageCompression(file, COMPRESS_OPTIONS);
    } catch (e) {
      console.warn("Image compression failed, uploading original:", e);
      return file;
    }
  };

  const uploadAndInsert = async (files) => {
    if (!files?.length || !onInsert) return;
    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = await compressIfImage(files[i]);
        const form = new FormData();
        form.append("file", file);
        const res = await api.post("/api/admin/communications/upload-attachment", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data?.success && res.data.data) {
          const { filename, path: filePath, contentType } = res.data.data;
          const cid = generateCid();
          const alt = (filename || "").replace(/"/g, "&quot;");
          const imgHtml = `\n<img src="cid:${cid}" alt="${alt}" style="max-width:100%; height:auto; display:block;" />\n`;
          onInsert(imgHtml, { cid, filename, path: filePath, contentType });
        }
      }
    } catch (err) {
      console.error("Image upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const files = Array.from(e.dataTransfer?.files || []).filter((f) =>
      (f.type || "").startsWith("image/")
    );
    if (files.length) uploadAndInsert(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(!disabled && !uploading);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files?.length) uploadAndInsert(Array.from(files));
    e.target.value = "";
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`
        border-2 border-dashed rounded-lg p-4 text-center transition-colors
        ${dragOver ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600"}
        ${disabled || uploading ? "opacity-60 pointer-events-none" : "cursor-pointer"}
      `}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && (disabled || uploading) === false && inputRef.current?.click()}
      aria-label="Drop images or click to upload"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <ImagePlus className="h-8 w-8 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {uploading ? "Uploading..." : "Drop images here or click to upload (compressed for email)"}
      </p>
    </div>
  );
};

export default ImageDropZone;
