import React, { useEffect, useState } from 'react';
import api from '../utils/api';

export default function AdminScans() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ result: '', eventId: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      params.append('page', String(page));
      params.append('limit', String(limit));
      const res = await api.get(`/api/admin/scan-logs?${params.toString()}`);
      setItems(res.data?.data?.items || []);
      setTotal(res.data?.data?.pagination?.total || 0);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, limit]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 text-white">
      <h1 className="text-2xl font-bold">Scan Logs</h1>
      <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
        <input className="bg-white/10 rounded-xl px-3 py-2" placeholder="Event ID" value={filters.eventId} onChange={e=>setFilters(f=>({...f,eventId:e.target.value}))} />
        <select className="bg-white/10 rounded-xl px-3 py-2" value={filters.result} onChange={e=>setFilters(f=>({...f,result:e.target.value}))}>
          <option value="">All Results</option>
          <option value="success">Success</option>
          <option value="already_used">Already Used</option>
          <option value="invalid">Invalid</option>
          <option value="expired">Expired</option>
          <option value="denied">Denied</option>
        </select>
        <input className="bg-white/10 rounded-xl px-3 py-2" type="datetime-local" value={filters.from} onChange={e=>setFilters(f=>({...f,from:e.target.value}))} />
        <input className="bg-white/10 rounded-xl px-3 py-2" type="datetime-local" value={filters.to} onChange={e=>setFilters(f=>({...f,to:e.target.value}))} />
        <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15" onClick={load}>Filter</button>
      </div>
      {loading && <div className="mt-4 text-white/60">Loading…</div>}
      {error && <div className="mt-4 text-red-400">{error}</div>}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-white/60">
              <th className="text-left p-2">Time</th>
              <th className="text-left p-2">Event</th>
              <th className="text-left p-2">Holder</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Result</th>
              <th className="text-left p-2">By</th>
              <th className="text-left p-2">Location</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i._id} className="border-t border-white/10">
                <td className="p-2">{new Date(i.scannedAt).toLocaleString()}</td>
                <td className="p-2">{i.eventId?.title}</td>
                <td className="p-2">{i.ticketId?.holder?.firstName} {i.ticketId?.holder?.lastName}</td>
                <td className="p-2">{i.ticketId?.ticketType}</td>
                <td className="p-2 capitalize">{i.result}</td>
                <td className="p-2">{i.scannedBy?.email}</td>
                <td className="p-2">{i.location}</td>
              </tr>
            ))}
            {items.length === 0 && !loading && (
              <tr><td className="p-4 text-white/50" colSpan="7">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</button>
        <div className="text-white/60 text-sm">Page {page} of {Math.max(1, Math.ceil(total/limit))}</div>
        <button className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15" onClick={()=>setPage(p=>p+1)} disabled={page>=Math.ceil(total/limit)}>Next</button>
        <select className="ml-4 bg-white/10 rounded-xl px-2 py-1 text-sm" value={limit} onChange={e=>{setPage(1); setLimit(parseInt(e.target.value,10));}}>
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>
    </div>
  );
}


