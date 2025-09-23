import React, { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
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
    if (secondsLeft === 5 && onRotate) {
      // prepare rotation soon, optional UX
    }
  }, [secondsLeft, onRotate]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-zinc-900 to-black border border-white/10 p-4 md:p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Your Ticket QR</div>
          <button onClick={onClose} className="text-white/60 hover:text-white">✕</button>
        </div>
        <div className="mt-4 flex items-center justify-center bg-white rounded-xl p-4">
          {qrData?.qr ? (
            <QRCodeSVG value={qrData.qr} size={220} includeMargin={false} />
          ) : (
            <div className="text-white/60 text-sm">{issuing ? 'Generating QR…' : (error?.error || 'No QR yet')}</div>
          )}
        </div>
        {expiresAt && (
          <div className="mt-3 text-center text-white/70 text-sm">Expires in {secondsLeft}s · {dayjs(expiresAt).format('HH:mm:ss')}</div>
        )}
        <div className="mt-4 flex gap-2">
          <button onClick={onRotate} disabled={issuing} className="flex-1 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15">
            Rotate QR
          </button>
          <button onClick={onClose} className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500">Close</button>
        </div>
        <div className="mt-3 text-xs text-white/50">Tip: Avoid screenshots. Present this QR at the gate for scanning.</div>
      </div>
    </div>
  );
}


