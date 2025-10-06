import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const currency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

export default function OrganizerCommissionSetup() {
  const { eventId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    platform_fee_type: 'percentage',
    platform_fee_percentage: 5,
    platform_fee_fixed: 0,
    platform_fee_cap: null,

    primary_agency_id: '',
    primary_agency_commission_type: 'percentage',
    primary_agency_commission_rate: 40,
    primary_agency_commission_fixed: 0,

    affiliate_commission_enabled: true,
    affiliate_commission_type: 'percentage',
    affiliate_commission_rate: 20,
    affiliate_commission_fixed: 0,
    affiliate_commission_base: 'organizer_revenue',

    enable_multi_tier: false,
    tier_2_commission_rate: 0,
    tier_3_commission_rate: 0,

    attribution_model: 'last_click',
    attribution_window_days: 30,
    allow_self_referral: false,
    allow_duplicate_conversions: false,

    payout_frequency: 'weekly',
    payout_delay_days: 7,
    minimum_payout_amount: 50
  });
  const [agencies, setAgencies] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('authToken');
        const auth = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`/api/events/${eventId}/commission-config`, { credentials: 'include', headers: { ...auth } });
        if (res.ok) {
          const data = await res.json();
          if (data?.config) setConfig(prev => ({ ...prev, ...data.config }));
        }
        const a = await fetch(`/api/organizer/marketing-agencies`, { credentials: 'include', headers: { ...auth } });
        if (a.ok) {
          const ax = await a.json();
          setAgencies(ax.items || ax.payouts || []);
        }
      } catch (e) {
        toast.error('Failed to load commission config');
      } finally {
        setLoading(false);
      }
    })();
  }, [eventId]);

  const mockPrice = 100;
  const preview = useMemo(() => {
    let platform_fee = 0;
    if (config.platform_fee_type === 'percentage') platform_fee = mockPrice * (config.platform_fee_percentage / 100);
    else if (config.platform_fee_type === 'fixed') platform_fee = config.platform_fee_fixed;
    else platform_fee = mockPrice * (config.platform_fee_percentage / 100) + config.platform_fee_fixed;
    if (config.platform_fee_cap) platform_fee = Math.min(platform_fee, config.platform_fee_cap);
    const organizer_revenue = mockPrice - platform_fee;
    const primary_agency = config.primary_agency_id
      ? (config.primary_agency_commission_type === 'percentage'
        ? organizer_revenue * (config.primary_agency_commission_rate / 100)
        : config.primary_agency_commission_fixed)
      : 0;
    let base = organizer_revenue;
    if (config.affiliate_commission_base === 'ticket_price') base = mockPrice;
    if (config.affiliate_commission_base === 'agency_revenue') base = primary_agency;
    const affiliate = config.affiliate_commission_enabled
      ? (config.affiliate_commission_type === 'percentage'
        ? base * (config.affiliate_commission_rate / 100)
        : config.affiliate_commission_fixed)
      : 0;
    const tier2 = config.enable_multi_tier ? (affiliate * (config.tier_2_commission_rate || 0) / 100) : 0;
    const net = organizer_revenue - primary_agency - affiliate - tier2;
    return {
      platform_fee: Number(platform_fee.toFixed(2)),
      organizer_revenue: Number(organizer_revenue.toFixed(2)),
      primary_agency: Number(primary_agency.toFixed(2)),
      affiliate: Number(affiliate.toFixed(2)),
      tier2: Number(tier2.toFixed(2)),
      net: Number(net.toFixed(2)),
      netPct: Number(((net / mockPrice) * 100).toFixed(2))
    };
  }, [config]);

  const warnings = useMemo(() => {
    const warns = [];
    if (preview.netPct < 20) warns.push('Organizer net falls below 20%. Consider adjusting fees.');
    const totalPct = (config.platform_fee_type === 'percentage' ? config.platform_fee_percentage : 0)
      + (config.primary_agency_commission_type === 'percentage' ? config.primary_agency_commission_rate : 0)
      + (config.affiliate_commission_enabled && config.affiliate_commission_type === 'percentage' ? config.affiliate_commission_rate : 0);
    if (totalPct > 100) warns.push('Total percentage commissions exceed 100%.');
    return warns;
  }, [config, preview]);

  const save = async () => {
    if (!confirm(`You'll keep ${currency(preview.net)} per $100 ticket. Continue?`)) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      const auth = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/events/${eventId}/commission-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...auth },
        credentials: 'include',
        body: JSON.stringify(config)
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Configuration saved');
    } catch (e) {
      toast.error('Failed to save commission config');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-600">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Commission Configuration</h2>
      <div className="grid gap-4 sm:gap-6">
        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-lg font-medium mb-3">Platform Fee</h3>
          <div className="flex flex-wrap items-center gap-3">
            <select value={config.platform_fee_type} onChange={e => setConfig({ ...config, platform_fee_type: e.target.value })} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700">
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
              <option value="hybrid">Hybrid</option>
            </select>
            {config.platform_fee_type !== 'fixed' && (
              <input type="number" value={config.platform_fee_percentage} onChange={e => setConfig({ ...config, platform_fee_percentage: Number(e.target.value) })} className="px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 border" placeholder="%" />
            )}
            {config.platform_fee_type !== 'percentage' && (
              <input type="number" value={config.platform_fee_fixed} onChange={e => setConfig({ ...config, platform_fee_fixed: Number(e.target.value) })} className="px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 border" placeholder="$" />
            )}
            <input type="number" value={config.platform_fee_cap || ''} onChange={e => setConfig({ ...config, platform_fee_cap: e.target.value ? Number(e.target.value) : null })} className="px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 border" placeholder="Cap (optional)" />
            <div className="ml-auto text-sm text-gray-600">Net after fee: {currency(100 - preview.platform_fee)}</div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-lg font-medium mb-3">Primary Agency</h3>
          <div className="grid sm:grid-cols-3 gap-3 items-center">
            <select value={config.primary_agency_id || ''} onChange={e => setConfig({ ...config, primary_agency_id: e.target.value })} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700">
              <option value="">None</option>
              {agencies.map(a => (
                <option key={a._id} value={a._id}>{a.agency_name || a.agency_email}</option>
              ))}
            </select>
            <select value={config.primary_agency_commission_type} onChange={e => setConfig({ ...config, primary_agency_commission_type: e.target.value })} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700">
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </select>
            <input type="number" value={config.primary_agency_commission_type === 'percentage' ? config.primary_agency_commission_rate : config.primary_agency_commission_fixed} onChange={e => setConfig({ ...config, [config.primary_agency_commission_type === 'percentage' ? 'primary_agency_commission_rate' : 'primary_agency_commission_fixed']: Number(e.target.value) })} className="px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 border" placeholder="Rate or $" />
          </div>
          <div className="mt-2 text-sm text-gray-600">Preview: {currency(preview.primary_agency)}</div>
        </section>

        <section className="bg-white dark:bg_gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-lg font-medium mb-3">Affiliate Commission</h3>
          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={config.affiliate_commission_enabled} onChange={e => setConfig({ ...config, affiliate_commission_enabled: e.target.checked })} /> Enable
            </label>
            <select value={config.affiliate_commission_base} onChange={e => setConfig({ ...config, affiliate_commission_base: e.target.value })} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700">
              <option value="ticket_price">Ticket price</option>
              <option value="organizer_revenue">Organizer revenue</option>
              <option value="agency_revenue">Agency revenue</option>
            </select>
            <select value={config.affiliate_commission_type} onChange={e => setConfig({ ...config, affiliate_commission_type: e.target.value })} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700">
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed</option>
            </select>
            <input type="number" value={config.affiliate_commission_type === 'percentage' ? config.affiliate_commission_rate : config.affiliate_commission_fixed} onChange={e => setConfig({ ...config, [config.affiliate_commission_type === 'percentage' ? 'affiliate_commission_rate' : 'affiliate_commission_fixed']: Number(e.target.value) })} className="px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 border" placeholder="Rate or $" />
            <label className="flex items-center gap-2 ml-auto">
              <input type="checkbox" checked={config.enable_multi_tier} onChange={e => setConfig({ ...config, enable_multi_tier: e.target.checked })} /> Multi-tier
            </label>
          </div>
          {config.enable_multi_tier && (
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              <input type="number" value={config.tier_2_commission_rate || 0} onChange={e => setConfig({ ...config, tier_2_commission_rate: Number(e.target.value) })} className="px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 border" placeholder="Tier 2 %" />
              <input type="number" value={config.tier_3_commission_rate || 0} onChange={e => setConfig({ ...config, tier_3_commission_rate: Number(e.target.value) })} className="px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 border" placeholder="Tier 3 %" />
            </div>
          )}
          <div className="mt-2 text-sm text-gray-600">Preview: {currency(preview.affiliate)}{config.enable_multi_tier ? ` + Tier2 ${currency(preview.tier2)}` : ''}</div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-lg font-medium mb-3">Attribution Settings</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <select value={config.attribution_model} onChange={e => setConfig({ ...config, attribution_model: e.target.value })} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700">
              <option value="last_click">Last click</option>
              <option value="first_click">First click</option>
              <option value="linear">Linear</option>
              <option value="time_decay">Time decay</option>
            </select>
            <input type="range" min="7" max="90" value={config.attribution_window_days} onChange={e => setConfig({ ...config, attribution_window_days: Number(e.target.value) })} />
            <div className="text-sm text-gray-600">Cookie: {config.attribution_window_days} days</div>
          </div>
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={config.allow_self_referral} onChange={e => setConfig({ ...config, allow_self_referral: e.target.checked })} /> Allow self-referrals</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={config.allow_duplicate_conversions} onChange={e => setConfig({ ...config, allow_duplicate_conversions: e.target.checked })} /> Allow duplicates</label>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-lg font-medium mb-3">Payout Settings</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <select value={config.payout_frequency} onChange={e => setConfig({ ...config, payout_frequency: e.target.value })} className="px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700">
              <option value="immediate">Immediate</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="manual">Manual</option>
            </select>
            <input type="number" value={config.payout_delay_days} onChange={e => setConfig({ ...config, payout_delay_days: Number(e.target.value) })} className="px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 border" placeholder="Delay days" />
            <input type="number" value={config.minimum_payout_amount} onChange={e => setConfig({ ...config, minimum_payout_amount: Number(e.target.value) })} className="px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700 border" placeholder="Minimum $" />
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-lg font-medium mb-3">Preview (per $100 ticket)</h3>
          <pre className="bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-3 rounded-md overflow-x-auto text-sm">
{`Ticket Price: $${mockPrice.toFixed(2)}\n├─ Platform Fee (${config.platform_fee_type === 'percentage' ? (config.platform_fee_percentage + '%') : ('$' + config.platform_fee_fixed)}): -$${preview.platform_fee.toFixed(2)}\n└─ Organizer Revenue: $${preview.organizer_revenue.toFixed(2)}\n   ├─ Primary Agency (${config.primary_agency_commission_type === 'percentage' ? (config.primary_agency_commission_rate + '%') : ('$' + config.primary_agency_commission_fixed)}): -$${preview.primary_agency.toFixed(2)}\n   ├─ Affiliate (${config.affiliate_commission_type === 'percentage' ? (config.affiliate_commission_rate + '%') : ('$' + config.affiliate_commission_fixed)}): -$${preview.affiliate.toFixed(2)}${config.enable_multi_tier ? (`\n   ├─ Tier 2: -$${preview.tier2.toFixed(2)}`) : ''}\n   └─ Your Net: $${preview.net.toFixed(2)} (${preview.netPct}%)`}
          </pre>
          {warnings.length > 0 && (
            <ul className="mt-2 text-sm text-orange-600 list-disc pl-5">
              {warnings.map((w, i) => (<li key={i}>{w}</li>))}
            </ul>
          )}
          <div className="mt-4 flex justify-end">
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50">{saving ? 'Saving...' : 'Save Configuration'}</button>
          </div>
        </section>
      </div>
    </div>
  );
}
