import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import dayjs from 'dayjs';

export default function QRModal({ isOpen, onClose, ticketId, onIssue, qrData, issuing, error, onRotate }) {
  const [now, setNow] = useState(Date.now());
  const expiresAt = qrData?.expiresAt ? new Date(qrData.expiresAt) : null;
  const secondsLeft = useMemo(() => expiresAt ? Math.max(0, Math.floor((expiresAt.getTime() - now) / 1000)) : null, [expiresAt, now]);

  useEffect(() => {
    if (!isOpen) return;
    if (!qrData && ticketId) onIssue();
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isOpen, ticketId, qrData, onIssue]);

  useEffect(() => {
    // Auto-rotate 1s after expiry to ensure freshness
    if (secondsLeft === 0 && onRotate) {
      const id = setTimeout(() => onRotate(), 1000);
      return () => clearTimeout(id);
    }
  }, [secondsLeft, onRotate]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#4f0f69] to-[#2a0838] border border-white/10 p-4 md:p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-lg">Your Ticket QR</div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">✕</button>
        </div>
        <div className="mt-4 flex items-center justify-center bg-white rounded-xl p-4">
          {qrData?.qr ? (
            <QRCode value={qrData.qr} size={220} />
          ) : (
            <div className="text-gray-600 text-sm">{issuing ? 'Generating QR…' : (error?.error || 'No QR yet')}</div>
          )}
        </div>
        {expiresAt && (
          <div className="mt-3 text-center text-white/90 text-sm">Expires in {secondsLeft}s · {dayjs(expiresAt).format('HH:mm:ss')}</div>
        )}
        <div className="mt-4 flex gap-2">
          <button onClick={onRotate} disabled={issuing} className="flex-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium">
            Rotate QR
          </button>
          <button onClick={onClose} className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#6b1a8a] to-[#8A4FFF] hover:from-[#8A4FFF] hover:to-[#6b1a8a] transition-all font-medium">Close</button>
        </div>
        <div className="mt-3 text-xs text-white/70">Tip: Avoid screenshots. Present this QR at the gate for scanning.</div>
      </div>
    </div>
  );
}


