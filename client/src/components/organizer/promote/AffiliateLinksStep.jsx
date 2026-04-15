import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Link2, Copy, Plus } from 'lucide-react';
import api from '../../../utils/api';

const glass =
  'rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/50 dark:bg-gray-900/30 backdrop-blur-md shadow-sm';

export default function AffiliateLinksStep({ eventId }) {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [allMarketers, setAllMarketers] = useState([]);
  const [eventSlug, setEventSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    affiliateId: '',
    agencyId: '',
    campaign_name: ''
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [linksRes, agRes, evRes, soloRes] = await Promise.all([
        api.get(`/api/organizer/events/${eventId}/referral-links`),
        api.get('/api/organizer/marketing-agencies'),
        api.get(`/api/organizer/events/${eventId}`),
        api.get('/api/organizer/independent-marketers').catch(() => ({ data: { items: [] } }))
      ]);
      setLinks(linksRes.data?.links || []);
      const ag = agRes.data?.items || agRes.data?.payouts || [];
      setAgencies(ag);
      const ev = evRes.data?.data || evRes.data?.event || evRes.data;
      setEventSlug(ev?.slug || '');

      const independents = (soloRes.data?.items || []).map((m) => ({
        ...m,
        _agencyName: 'Independent marketer'
      }));

      const acc = [];
      for (const a of ag) {
        try {
          const res = await api.get('/api/agency/affiliates', {
            params: { agency_id: a._id, limit: 100 }
          });
          (res.data?.items || []).forEach((m) => {
            acc.push({
              ...m,
              _agencyName: a.agency_name || a.agency_email
            });
          });
        } catch {
          /* skip */
        }
      }
      setAllMarketers([...independents, ...acc]);
    } catch {
      toast.error('Failed to load affiliates & links');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const onPickMarketer = (id) => {
    setForm((prev) => {
      const m = allMarketers.find((x) => String(x._id) === String(id));
      return {
        ...prev,
        affiliateId: id,
        agencyId: m?.agency_id ? String(m.agency_id) : ''
      };
    });
  };

  const checkoutUrl = (code) => {
    const base = window.location.origin;
    return `${base}/events/${eventSlug}/checkout${code ? `?ref=${encodeURIComponent(code)}` : ''}`;
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const createLink = async (e) => {
    e.preventDefault();
    if (!form.affiliateId) {
      toast.error('Select an affiliate marketer');
      return;
    }
    setCreating(true);
    try {
      await api.post(`/api/events/${eventId}/referral-links`, {
        affiliateId: form.affiliateId,
        agencyId: form.agencyId || undefined,
        campaign_name: form.campaign_name || undefined
      });
      toast.success('Affiliate link created.');
      setForm({ affiliateId: '', agencyId: '', campaign_name: '' });
      await load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create link');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[30vh] flex items-center justify-center text-gray-500">Loading links…</div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Link2 className="w-6 h-6 text-violet-600" />
          Step 3 · Affiliate links
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Generate unique tracking URLs with <code className="text-xs bg-black/5 dark:bg-white/10 px-1 rounded">?ref=</code>.
        </p>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white/40 dark:bg-gray-950/20 px-4 py-3">
        <strong className="text-gray-900 dark:text-white">Performance:</strong>{' '}
        <Link
          to={`/organizer/events/${eventId}`}
          className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
        >
          Event overview
        </Link>{' '}
        → Affiliate performance.
      </p>

      <div className={`${glass} p-5 mb-4`}>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          New link
        </h3>
        {allMarketers.length === 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
            Add marketers in Step 1 or Step 2 first.
          </p>
        )}
        <form onSubmit={createLink} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Affiliate marketer *</label>
            <select
              required
              value={form.affiliateId}
              onChange={(e) => onPickMarketer(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/90 dark:bg-gray-900/50"
            >
              <option value="">Select…</option>
              {allMarketers.map((x) => (
                <option key={x._id} value={x._id}>
                  {x.first_name} {x.last_name} ({x.referral_code}) — {x._agencyName}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Agency on link</label>
            <select
              value={form.agencyId}
              onChange={(e) => setForm({ ...form, agencyId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/90 dark:bg-gray-900/50"
            >
              <option value="">None</option>
              {agencies.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.agency_name || a.agency_email}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Campaign name (optional)</label>
            <input
              value={form.campaign_name}
              onChange={(e) => setForm({ ...form, campaign_name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/90 dark:bg-gray-900/50"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating || !form.affiliateId}
              className="px-5 py-2.5 rounded-xl bg-[#4f0f69] text-white font-medium hover:bg-[#6b1a8a] disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Generate link'}
            </button>
          </div>
        </form>
      </div>

      <div className={`${glass} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-gray-200/60 dark:border-white/10">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Existing links</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-200/50 dark:border-white/10">
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Marketer</th>
                <th className="px-4 py-3 font-medium">Agency</th>
                <th className="px-4 py-3 font-medium">Checkout URL</th>
              </tr>
            </thead>
            <tbody>
              {links.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    No links yet.
                  </td>
                </tr>
              )}
              {links.map((l) => (
                <tr
                  key={l._id}
                  className="border-b border-gray-100 dark:border-white/5 hover:bg-white/40 dark:hover:bg-white/5"
                >
                  <td className="px-4 py-3 font-mono text-xs">{l.referral_code}</td>
                  <td className="px-4 py-3">
                    {l.affiliate_id
                      ? `${l.affiliate_id.first_name || ''} ${l.affiliate_id.last_name || ''}`.trim()
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {l.agency_id?.agency_name || l.agency_id?.agency_email || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => copy(checkoutUrl(l.referral_code))}
                      className="inline-flex items-center gap-1 text-violet-600 hover:underline text-xs"
                    >
                      <Copy className="w-3 h-3" />
                      Copy URL
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
