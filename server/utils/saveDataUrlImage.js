const fs = require('fs');
const path = require('path');

/**
 * Persist a data-URL image to uploads/events and return a same-origin path
 * `GET /api/events/:eventId/images/:filename` (use from the SPA host so dev proxy applies).
 */
function saveDataUrlImage(dataUrl, eventId, fileKey) {
  const matches = String(dataUrl).match(/^data:(image\/[A-Za-z0-9.+-]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid image data');
  }

  const mimeType = matches[1];
  const base64String = matches[2];

  let extension = mimeType.split('/')[1] || 'jpg';
  if (extension === 'svg+xml') extension = 'svg';

  const safeKey = String(fileKey).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'opt';
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const filename = `poll-opt-${safeKey}-${uniqueSuffix}.${extension}`;

  const uploadDir = path.join(__dirname, '../uploads/events');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, filename);
  const buffer = Buffer.from(base64String, 'base64');
  const maxBytes = 6 * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw new Error('Image file too large (max 6MB)');
  }

  fs.writeFileSync(filePath, buffer);
  return `/api/events/${eventId}/images/${filename}`;
}

module.exports = { saveDataUrlImage };
