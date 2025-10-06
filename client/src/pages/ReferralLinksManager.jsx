import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

export default function ReferralLinksManager() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState('');
  const [campaign, setCampaign] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/affiliates/referral-links', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links || []);
      }
    } catch (e) {
      toast.error('Failed to load referral links');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!eventId) { toast.error('Provide eventId'); return; }
    try {
      const res = await fetch(`/api/events/${eventId}/referral-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ campaign_name: campaign || undefined })
      });
      if (!res.ok) throw new Error('Create failed');
      toast.success('Referral link created');
      setCampaign('');
      await load();
    } catch (e) {
      toast.error('Create failed');
    }
  };

  const shorten = async (id) => {
    try {
      const res = await fetch(`/api/referral-links/${id}/shorten`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Shorten failed');
      toast.success('Short URL generated');
      await load();
    } catch (e) { toast.error('Shorten failed'); }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 text-gray-700 dark:text-gray-300">Loading...</div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Referral Links</h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <input value={eventId} onChange={e => setEventId(e.target.value)} className="px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-300" placeholder="Event ID" />
            <input value={campaign} onChange={e => setCampaign(e.target.value)} className="px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-300" placeholder="Campaign name (optional)" />
            <button onClick={create} className="px-3 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500">Create Link</button>
          </div>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-300">
                <th className="py-2 px-3">Code</th>
                <th className="py-2 px-3">Event</th>
                <th className="py-2 px-3">Short</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map(l => (
                <tr key={l._id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-2 px-3 text-gray-900 dark:text-gray-100">{l.referral_code}</td>
                  <td className="py-2 px-3 text-gray-900 dark:text-gray-100">{l.event_id}</td>
                  <td className="py-2 px-3 text-gray-900 dark:text-gray-100">{l.short_url || '-'}</td>
                  <td className="py-2 px-3">
                    <button onClick={() => shorten(l._id)} className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500">Shorten</button>
                  </td>
                </tr>
              ))}
              {links.length === 0 && (
                <tr><td className="py-3 text-gray-500 dark:text-gray-400 px-3" colSpan={4}>No links</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


