import React from 'react';
import { toast } from 'react-hot-toast';
import api from '../../../utils/api';
import { formatCommissionApiError } from '../../../utils/commissionConfigHelpers';

const saveBtnClass =
  'px-6 py-2.5 rounded-xl bg-[#4f0f69] text-white font-medium hover:bg-[#6b1a8a] disabled:opacity-50';

export default function RulesStep({ eventId, config, setConfig, saving, setSaving }) {
  const saveRules = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/events/${eventId}/commission-config`, {
        attribution_model: config.attribution_model,
        attribution_window_days: config.attribution_window_days,
        allow_self_referral: config.allow_self_referral,
        allow_duplicate_conversions: config.allow_duplicate_conversions
      });
      toast.success('Rules saved');
    } catch (e) {
      toast.error(formatCommissionApiError(e, 'Failed to save rules'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Step 4 · Rules</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Which referral link earns credit (last vs first click, etc.), how long clicks stay valid, and whether
        self-referrals or duplicate conversions are allowed.
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <select
          value={config.attribution_model}
          onChange={(e) => setConfig({ ...config, attribution_model: e.target.value })}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-gray-900/40"
        >
          <option value="last_click">Last click</option>
          <option value="first_click">First click</option>
          <option value="linear">Linear</option>
          <option value="time_decay">Time decay</option>
        </select>
        <div>
          <label className="text-xs text-gray-500">Window (days)</label>
          <input
            type="number"
            min={7}
            max={90}
            value={config.attribution_window_days}
            onChange={(e) =>
              setConfig({ ...config, attribution_window_days: Number(e.target.value) })
            }
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-gray-900/40"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.allow_self_referral}
          onChange={(e) => setConfig({ ...config, allow_self_referral: e.target.checked })}
        />
        Allow self-referrals
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={config.allow_duplicate_conversions}
          onChange={(e) =>
            setConfig({ ...config, allow_duplicate_conversions: e.target.checked })
          }
        />
        Allow duplicate conversions
      </label>
      <div className="pt-4 flex justify-end">
        <button type="button" onClick={saveRules} disabled={saving} className={saveBtnClass}>
          {saving ? 'Saving…' : 'Save rules'}
        </button>
      </div>
    </div>
  );
}
