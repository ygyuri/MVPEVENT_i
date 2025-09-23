import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useDispatch, useSelector } from 'react-redux';
import { validateScan, clearScan, setScanning } from '../store/slices/scannerSlice';

export default function Scanner() {
  const dispatch = useDispatch();
  const { lastResult, error, scanning } = useSelector(s => s.scanner);
  const auth = useSelector(s => s.auth);
  const videoRef = useRef(null);
  const codeReader = useRef(null);
  const [location, setLocation] = useState('Gate A');
  const [locked, setLocked] = useState(false);
  const [preferBackCamera, setPreferBackCamera] = useState(true);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    return () => {
      try { codeReader.current?.reset(); } catch {}
    };
  }, []);

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
          if (locked) return;
          if (result) {
            setLocked(true);
            dispatch(validateScan({ qr: result.getText(), location }))
              .finally(() => setTimeout(() => setLocked(false), 1500));
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
  }, [dispatch, location, locked, preferBackCamera, torchOn]);

  const status = lastResult?.valid ? 'Valid' : (lastResult?.code || error?.code || error?.error || 'Ready');
  const statusColor = lastResult?.valid ? 'bg-emerald-500' : (lastResult?.code === 'ALREADY_USED' ? 'bg-amber-500' : (error ? 'bg-red-500' : 'bg-indigo-500'));

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
      <div className={`mt-4 rounded-xl px-3 py-2 text-sm ${statusColor}`}>{status}</div>
      {lastResult?.valid && (
        <div className="mt-4 rounded-2xl border border-white/10 p-4">
          <div className="font-semibold">{lastResult?.event?.title}</div>
          <div className="text-white/70 text-sm">Holder: {lastResult?.ticket?.holderName}</div>
          <div className="text-white/70 text-sm">Status: {lastResult?.status}</div>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15" onClick={() => dispatch(clearScan())}>Clear</button>
      </div>
    </div>
  );
}


