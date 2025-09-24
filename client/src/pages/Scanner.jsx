import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useDispatch, useSelector } from 'react-redux';
import { validateScan, clearScan, setScanning, enqueueOfflineScan, flushOfflineQueue } from '../store/slices/scannerSlice';

export default function Scanner() {
  const dispatch = useDispatch();
  const { lastResult, error, scanning } = useSelector(s => s.scanner);
  const auth = useSelector(s => s.auth);
  const videoRef = useRef(null);
  const codeReader = useRef(null);
  const [location, setLocation] = useState('Gate A');
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  const [preferBackCamera, setPreferBackCamera] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const audioCtxRef = useRef(null);
  const ensureAudio = () => {
    if (audioCtxRef.current) return audioCtxRef.current;
    try {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch {}
    return audioCtxRef.current;
  };
  const playTone = async (pattern) => {
    const ctx = ensureAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    let start = now;
    for (const step of pattern) {
      const { freq = 440, durationMs = 120, type = 'sine', gain = 0.2, gapMs = 60 } = step;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(gain, start);
      osc.connect(g).connect(ctx.destination);
      osc.start(start);
      const end = start + durationMs / 1000;
      osc.stop(end);
      start = end + gapMs / 1000;
    }
  };

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    return () => {
      try { codeReader.current?.reset(); } catch {}
    };
  }, []);

  // Flush offline queue when we regain network
  useEffect(() => {
    const onOnline = () => dispatch(flushOfflineQueue());
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [dispatch]);

  useEffect(() => {
    if (!videoRef.current) return;
    const start = async () => {
      dispatch(setScanning(true));
      try {
        const constraints = {
          video: {
            facingMode: preferBackCamera ? { ideal: 'environment' } : 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
            advanced: [{ torch: torchOn }]
          }
        };
        const controls = await codeReader.current.decodeFromConstraints(constraints, videoRef.current, (result, err) => {
          if (lockedRef.current) return;
          if (result) {
            setLocked(true);
            lockedRef.current = true;
            const device = {
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
              platform: typeof navigator !== 'undefined' ? navigator.platform : undefined,
              vendor: typeof navigator !== 'undefined' ? navigator.vendor : undefined
            };
            dispatch(validateScan({ qr: result.getText(), location, device }))
              .unwrap()
              .catch(() => {
                // If offline, enqueue
                if (!navigator.onLine) {
                  dispatch(enqueueOfflineScan({ qr: result.getText(), location, device }));
                }
              })
              .finally(() => setTimeout(() => { setLocked(false); lockedRef.current = false; }, 1500));
          }
        });
        return () => controls?.stop();
      } catch (e) {
        // camera error
      } finally {
        dispatch(setScanning(false));
      }
    };
    const stop = start();
    return () => { try { codeReader.current?.reset(); } catch {} if (typeof stop === 'function') stop(); };
  }, [dispatch, location, preferBackCamera, torchOn]);

  const humanStatus = () => {
    if (lastResult?.valid) return 'Valid';
    const code = lastResult?.code || error?.code || error?.error;
    if (!code) return 'Ready';
    if (code === 'ALREADY_USED') return 'Already Used';
    if (code === 'INVALID_QR') return 'Invalid QR';
    if (code === 'QR_EXPIRED') return 'QR Expired';
    if (code === 'ACCESS_DENIED') return 'Access Denied';
    if (code === 'RATE_LIMITED') return 'Too many scans - slow down';
    return String(code);
  };
  const status = humanStatus();
  const isAlreadyUsed = lastResult?.code === 'ALREADY_USED';
  const statusColor = lastResult?.valid ? 'bg-emerald-600' : (isAlreadyUsed ? 'bg-red-700' : (error ? 'bg-red-600' : 'bg-indigo-600'));

  // Sounds & haptics on result change
  const lastStatusRef = useRef(null);
  useEffect(() => {
    const type = lastResult?.valid ? 'success' : (lastResult?.code === 'ALREADY_USED' ? 'warn' : (error ? 'error' : null));
    if (!type) return;
    if (lastStatusRef.current === type) return;
    lastStatusRef.current = type;
    try {
      if (type === 'success') {
        playTone([
          { freq: 880, durationMs: 100, type: 'sine', gain: 0.25, gapMs: 20 },
          { freq: 1320, durationMs: 120, type: 'sine', gain: 0.25 }
        ]);
      } else if (type === 'warn') {
        playTone([
          { freq: 520, durationMs: 140, type: 'square', gain: 0.25, gapMs: 80 },
          { freq: 520, durationMs: 140, type: 'square', gain: 0.25 }
        ]);
      } else if (type === 'error') {
        playTone([
          { freq: 220, durationMs: 220, type: 'sawtooth', gain: 0.25, gapMs: 40 },
          { freq: 180, durationMs: 240, type: 'sawtooth', gain: 0.25 }
        ]);
      }
      if (navigator?.vibrate) navigator.vibrate(type === 'success' ? 60 : type === 'warn' ? [120, 80, 120] : [200, 100, 200]);
    } catch {}
  }, [lastResult, error]);

  // Role gating hint only; backend enforces.
  const role = auth?.user?.role;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 text-white">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Scanner</h1>
        <select value={location} onChange={e => setLocation(e.target.value)} className="bg-white/10 rounded-xl px-3 py-2">
          <option>Gate A</option>
          <option>Gate B</option>
          <option>Entrance</option>
        </select>
      </div>
      <div className="mt-3 flex gap-2">
        <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15" onClick={() => setPreferBackCamera(p => !p)}>
          Camera: {preferBackCamera ? 'Rear' : 'Front'}
        </button>
        <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15" onClick={() => setTorchOn(t => !t)}>
          Torch: {torchOn ? 'On' : 'Off'}
        </button>
      </div>
      <div className="mt-4 text-white/60 text-sm">Role: {role || 'unknown'} · {scanning ? 'Camera on' : 'Idle'}</div>
      <div className="mt-4 rounded-2xl overflow-hidden border border-white/10">
        <video ref={videoRef} className="w-full aspect-[3/4] object-cover bg-black" autoPlay muted playsInline />
      </div>
      <div className={`mt-4 rounded-xl px-3 py-2 text-sm ${statusColor} shadow-lg border border-white/10 animate-[pulse_1s_ease-in-out_2]`}>{status}</div>
      {lastResult?.valid && (
        <div className="mt-4 rounded-2xl border border-white/10 p-4">
          <div className="font-semibold">{lastResult?.event?.title}</div>
          <div className="text-white/70 text-sm">Holder: {lastResult?.ticket?.holderName}</div>
          <div className="text-white/70 text-sm">Status: {lastResult?.status}</div>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15" onClick={() => dispatch(clearScan())}>Clear</button>
        <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15" onClick={() => dispatch(flushOfflineQueue())}>Flush Offline ({useSelector(s=>s.scanner.offlineCount) || 0})</button>
      </div>

      {/* Fullscreen flash overlay on scan */}
      {(lastResult || error) && (
        <div className={`fixed inset-0 pointer-events-none z-40 ${lastResult?.valid ? 'bg-emerald-500/40' : (lastResult?.code === 'ALREADY_USED' ? 'bg-red-600/40' : error ? 'bg-red-700/40' : 'bg-indigo-600/30')} animate-[fadeout_600ms_ease-in_1]`}></div>
      )}

      <style>{`
        @keyframes fadeout { from { opacity: 1 } to { opacity: 0 } }
        @keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.02) } }
      `}</style>
    </div>
  );
}


