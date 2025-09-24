import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';

export default function EventQRSettings() {
  const { eventId } = useParams();
  const [ttlMs, setTtlMs] = useState('');
  const [autoRotateMs, setAutoRotateMs] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const payload = {};
      if (ttlMs) payload.ttlMs = parseInt(ttlMs, 10);
      if (autoRotateMs) payload.autoRotateMs = parseInt(autoRotateMs, 10);
      const res = await api.post(`/api/events/settings/${eventId}/qr`, payload);
      setMsg('Saved');
    } catch (e) {
      setMsg(e.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 text-white">
      <h1 className="text-2xl font-bold">QR Settings</h1>
      <div className="mt-4 grid gap-3">
        <label className="text-sm text-white/70">QR TTL (ms)</label>
        <input className="bg-white/10 rounded-xl px-3 py-2" value={ttlMs} onChange={e=>setTtlMs(e.target.value)} placeholder="e.g. 900000" />
        <label className="text-sm text-white/70">Auto-rotate interval (ms)</label>
        <input className="bg-white/10 rounded-xl px-3 py-2" value={autoRotateMs} onChange={e=>setAutoRotateMs(e.target.value)} placeholder="e.g. 60000" />
        <button disabled={saving} onClick={save} className="mt-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15">{saving ? 'Saving…' : 'Save'}</button>
        {msg && <div className="text-sm text-white/70">{msg}</div>}
      </div>
    </div>
  );
}


