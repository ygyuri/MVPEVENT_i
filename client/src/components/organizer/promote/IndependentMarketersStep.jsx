import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Link2 } from 'lucide-react';
import api from '../../../utils/api';
import { mapIndependentRatesForApi, formatCommissionApiError } from '../../../utils/commissionConfigHelpers';

const glass =
  'rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/50 dark:bg-gray-900/30 backdrop-blur-md shadow-sm';

const saveBtnClass =
  'px-6 py-2.5 rounded-xl bg-[#4f0f69] text-white font-medium hover:bg-[#6b1a8a] disabled:opacity-50';

export default function IndependentMarketersStep({
  eventId,
  config,
  setConfig,
  soloMarketers,
  onRefresh,
  saving,
  setSaving
}) {
  const [newSolo, setNewSolo] = useState({
    first_name: '',
    last_name: '',
    email: '',
    pct_of_ticket: 10
  });
  const [creatingSolo, setCreatingSolo] = useState(false);

  const pctForSolo = (affiliateId) => {
    const row = (config.independent_marketer_rates || []).find(
      (r) => String(r.affiliate_id) === String(affiliateId)
    );
    return row ? row.pct_of_ticket : '';
  };

  const updateIndependentPct = (affiliateId, pct) => {
    const id = String(affiliateId);
    setConfig((prev) => {
      const rows = [...(prev.independent_marketer_rates || [])];
      const i = rows.findIndex((r) => String(r.affiliate_id) === id);
      if (i >= 0) rows[i] = { ...rows[i], pct_of_ticket: Number(pct) || 0 };
      else rows.push({ affiliate_id: id, pct_of_ticket: Number(pct) || 0 });
      return { ...prev, independent_marketer_rates: rows };
    });
  };

  const removeIndependentRate = (affiliateId) => {
    const id = String(affiliateId);
    setConfig((prev) => ({
      ...prev,
      independent_marketer_rates: (prev.independent_marketer_rates || []).filter(
        (r) => String(r.affiliate_id) !== id
      )
    }));
  };

  const addSoloMarketer = async (e) => {
    e.preventDefault();
    if (!newSolo.first_name.trim() || !newSolo.last_name.trim() || !newSolo.email.trim()) {
      toast.error('First name, last name, and email are required');
      return;
    }
    setCreatingSolo(true);
    try {
      const res = await api.post('/api/organizer/independent-marketers', {
        first_name: newSolo.first_name.trim(),
        last_name: newSolo.last_name.trim(),
        email: newSolo.email.trim().toLowerCase()
      });
      const aff = res.data?.affiliate;
      if (!aff?._id) throw new Error('No affiliate returned');
      const pct = Number(newSolo.pct_of_ticket) || 0;
      const nextRates = [
        ...mapIndependentRatesForApi(config.independent_marketer_rates),
        { affiliate_id: String(aff._id), pct_of_ticket: pct }
      ];
      await api.patch(`/api/events/${eventId}/commission-config`, {
        independent_marketer_rates: nextRates
      });
      toast.success(`${aff.first_name} added · ${aff.referral_code}`);
      setNewSolo({ first_name: '', last_name: '', email: '', pct_of_ticket: 10 });
      await onRefresh();
    } catch (err) {
      toast.error(formatCommissionApiError(err, 'Could not add independent marketer'));
    } finally {
      setCreatingSolo(false);
    }
  };

  const saveRates = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/events/${eventId}/commission-config`, {
        independent_marketer_rates: mapIndependentRatesForApi(config.independent_marketer_rates)
      });
      toast.success('Independent marketer rates saved');
      await onRefresh();
    } catch (e) {
      toast.error(formatCommissionApiError(e, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Step 2 · Independent marketers</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
            Solo promoters not tied to an agency. Each gets a unique referral code. Set % of each ticket for this
            event, then create links in Step 3.
          </p>
        </div>
        <Link
          to={`/organizer/events/${eventId}/marketing?tab=links`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4f0f69] text-white text-sm font-medium hover:bg-[#6b1a8a] shrink-0"
        >
          <Link2 className="w-4 h-4" />
          Step 3 · Links
        </Link>
      </div>

      <div className="rounded-xl border border-violet-200/80 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/25 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
        Using an agency team instead?{' '}
        <Link
          to={`/organizer/events/${eventId}/marketing?tab=partners`}
          className="font-semibold text-violet-700 dark:text-violet-300 hover:underline"
        >
          Step 1 · Marketing partners
        </Link>
      </div>

      <div className={`${glass} p-5 sm:p-6`}>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Add independent marketer</h3>
        <form onSubmit={addSoloMarketer} className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <input
            required
            placeholder="First name *"
            value={newSolo.first_name}
            onChange={(e) => setNewSolo({ ...newSolo, first_name: e.target.value })}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/90 dark:bg-gray-900/50 text-sm"
          />
          <input
            required
            placeholder="Last name *"
            value={newSolo.last_name}
            onChange={(e) => setNewSolo({ ...newSolo, last_name: e.target.value })}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/90 dark:bg-gray-900/50 text-sm"
          />
          <input
            required
            type="email"
            placeholder="Email *"
            value={newSolo.email}
            onChange={(e) => setNewSolo({ ...newSolo, email: e.target.value })}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/90 dark:bg-gray-900/50 text-sm sm:col-span-2"
          />
          <div>
            <label className="text-xs text-gray-500 block mb-1">% of ticket</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={newSolo.pct_of_ticket}
              onChange={(e) => setNewSolo({ ...newSolo, pct_of_ticket: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/90 dark:bg-gray-900/50 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={creatingSolo}
            className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
          >
            {creatingSolo ? 'Adding…' : 'Add & save %'}
          </button>
        </form>
      </div>

      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Rates for this event</h3>
        {soloMarketers.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No independent marketers yet.</p>
        ) : (
          <ul className="space-y-3">
            {soloMarketers.map((m) => (
              <li
                key={m._id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-gray-200/80 dark:border-white/10 p-4 bg-white/40 dark:bg-gray-950/20"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {m.first_name} {m.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{m.email}</p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-1 font-mono">{m.referral_code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 whitespace-nowrap">% of ticket</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={pctForSolo(m._id) === '' ? '' : pctForSolo(m._id)}
                    placeholder="0"
                    onChange={(e) => updateIndependentPct(m._id, e.target.value)}
                    className="w-24 px-2 py-2 rounded-lg border border-gray-200 dark:border-white/15 bg-white/90 dark:bg-gray-900/50 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeIndependentRate(m._id)}
                  className="text-sm text-red-600 hover:underline shrink-0"
                >
                  Remove from event
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pt-4 border-t border-gray-200/70 dark:border-white/10 flex justify-end">
        <button type="button" onClick={saveRates} disabled={saving} className={saveBtnClass}>
          {saving ? 'Saving…' : 'Save independent rates'}
        </button>
      </div>
    </div>
  );
}
