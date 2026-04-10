import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Layers, Percent, Users, Link2, Wallet } from 'lucide-react';
import api from '../utils/api';

const currency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const emptyProgram = () => ({
  agency_id: '',
  pool_pct_of_ticket: 40,
  sub_seller_pct_of_ticket: 20,
  head_pct_of_ticket: 20
});

/** Stable shape for API + form selects (agency_id as string). */
function mapProgramsFromApi(programs) {
  if (!Array.isArray(programs)) return [];
  return programs.map((p) => ({
    agency_id: p.agency_id != null ? String(p.agency_id) : '',
    pool_pct_of_ticket: Number(p.pool_pct_of_ticket) || 0,
    sub_seller_pct_of_ticket: Number(p.sub_seller_pct_of_ticket) || 0,
    head_pct_of_ticket: Number(p.head_pct_of_ticket) || 0
  }));
}

function mapProgramsForApi(programs) {
  return mapProgramsFromApi(programs);
}

const defaultConfig = () => ({
    platform_fee_type: 'percentage',
    platform_fee_percentage: 5,
    platform_fee_fixed: 0,
    platform_fee_cap: null,
    primary_agency_id: '',
    primary_agency_commission_type: 'percentage',
  primary_agency_commission_rate: 0,
    primary_agency_commission_fixed: 0,
    affiliate_commission_enabled: true,
    affiliate_commission_type: 'percentage',
  affiliate_commission_rate: 15,
    affiliate_commission_fixed: 0,
    affiliate_commission_base: 'organizer_revenue',
  flat_affiliate_pct_of_ticket: null,
  agency_programs: [],
  use_event_commission_for_waterfall: true,
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

const glass =
  'rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/50 dark:bg-gray-900/30 backdrop-blur-md shadow-sm';

const readOnlyFieldClass =
  'px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-100 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 text-sm cursor-not-allowed w-full max-w-xs';

const saveBtnClass =
  'px-6 py-2.5 rounded-xl bg-[#4f0f69] text-white font-medium hover:bg-[#6b1a8a] disabled:opacity-50';

const TAB_SAVE_SUCCESS = {
  waterfall: 'Waterfall settings saved',
  agencies: 'Agency programs saved',
  flat: 'Flat affiliate settings saved',
  attribution: 'Attribution rules saved',
  payout: 'Payout settings saved',
  primary: 'Primary agency settings saved',
  preview: 'Commission configuration saved'
};

function normalizePrimaryAgencyForApi(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

/** API errors: { ok, error }, { error, details }, or network. */
function formatCommissionApiError(err, fallback) {
  const data = err?.response?.data;
  if (data?.details && Array.isArray(data.details) && data.details.length > 0) {
    const line = data.details
      .map((d) => d.msg || d.message || '')
      .filter(Boolean)
      .join(' · ');
    if (line) return line;
  }
  if (typeof data?.error === 'string' && data.error !== 'VALIDATION_ERROR') return data.error;
  if (data?.error === 'VALIDATION_ERROR') return 'Please check the form fields and try again.';
  if (typeof data?.message === 'string') return data.message;
  if (err?.message && !err.response) return err.message;
  return fallback;
}

export default function OrganizerCommissionSetup({ adminMode = false }) {
  const canEditPlatformFee = adminMode;
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('waterfall');
  const [config, setConfig] = useState(defaultConfig);
  const [eventCommissionRate, setEventCommissionRate] = useState(6);
  const [eventTitle, setEventTitle] = useState('');
  const [agencies, setAgencies] = useState([]);
  const [programErrors, setProgramErrors] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    let ok = false;
    try {
      const [cfgRes, agRes] = await Promise.all([
        api.get(`/api/events/${eventId}/commission-config`),
        api.get('/api/organizer/marketing-agencies')
      ]);
      const { config: c, event_commission_rate: ecr, event_title: et } = cfgRes.data || {};
      if (ecr != null) setEventCommissionRate(Number(ecr));
      if (et) setEventTitle(et);
      if (c) {
        const {
          _id: _docId,
          __v,
          createdAt,
          updatedAt,
          event_id: _eid,
          organizer_id: _oid,
          ...commissionFields
        } = c;
        setConfig((prev) => {
          const next = {
            ...prev,
            ...commissionFields,
            agency_programs: mapProgramsFromApi(c.agency_programs)
          };
          const pa = next.primary_agency_id;
          next.primary_agency_id =
            pa != null && String(pa).trim() !== '' ? String(pa).trim() : '';
          return next;
        });
      } else {
        setConfig(defaultConfig());
      }
      setAgencies(agRes.data?.items || agRes.data?.payouts || []);
      ok = true;
    } catch (e) {
      if (e.response?.status === 404 && e.response?.data?.error === 'EVENT_NOT_FOUND') {
        toast.error('Event not found');
      } else {
        toast.error(formatCommissionApiError(e, 'Failed to load commission settings'));
      }
    } finally {
      setLoading(false);
    }
    return ok;
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const validatePrograms = useCallback(() => {
    const errs = [];
    (config.agency_programs || []).forEach((p, i) => {
      const pool = Number(p.pool_pct_of_ticket) || 0;
      const sub = Number(p.sub_seller_pct_of_ticket) || 0;
      const head = Number(p.head_pct_of_ticket) || 0;
      if (Math.abs(sub + head - pool) > 0.02) {
        errs.push(`Program ${i + 1}: sub (${sub}%) + head (${head}%) must equal pool (${pool}%).`);
      }
    });
    setProgramErrors(errs);
    return errs.length === 0;
  }, [config.agency_programs]);

  useEffect(() => {
    validatePrograms();
  }, [config.agency_programs, validatePrograms]);

  const mockPrice = 100;
  const preview = useMemo(() => {
    const platformPct = config.use_event_commission_for_waterfall
      ? eventCommissionRate
      : config.platform_fee_type === 'percentage'
        ? config.platform_fee_percentage
        : 0;
    const platform_fee = mockPrice * (Number(platformPct) / 100);
    const organizer_revenue = mockPrice - platform_fee;
    const primary_agency = config.primary_agency_id
      ? config.primary_agency_commission_type === 'percentage'
        ? mockPrice * (config.primary_agency_commission_rate / 100)
        : config.primary_agency_commission_fixed
      : 0;

    const firstProg = (config.agency_programs || [])[0];
    let affiliate = 0;
    let headExtra = 0;
    if (firstProg) {
      affiliate = mockPrice * ((Number(firstProg.sub_seller_pct_of_ticket) || 0) / 100);
      headExtra = mockPrice * ((Number(firstProg.head_pct_of_ticket) || 0) / 100);
    } else if (config.affiliate_commission_enabled) {
      const flat =
        config.flat_affiliate_pct_of_ticket != null
          ? Number(config.flat_affiliate_pct_of_ticket)
          : config.affiliate_commission_type === 'percentage'
            ? config.affiliate_commission_rate
            : 0;
      const base =
        config.affiliate_commission_base === 'ticket_price'
          ? mockPrice
          : config.affiliate_commission_base === 'agency_revenue'
            ? primary_agency
            : organizer_revenue;
      affiliate =
        config.affiliate_commission_type === 'percentage'
          ? base * (flat / 100)
          : config.affiliate_commission_fixed;
    }
    const tier2 =
      config.enable_multi_tier && !firstProg
        ? affiliate * ((config.tier_2_commission_rate || 0) / 100)
        : 0;
    const net = organizer_revenue - primary_agency - affiliate - headExtra - tier2;
    return {
      platform_fee: Number(platform_fee.toFixed(2)),
      organizer_revenue: Number(organizer_revenue.toFixed(2)),
      primary_agency: Number(primary_agency.toFixed(2)),
      affiliate: Number(affiliate.toFixed(2)),
      headExtra: Number(headExtra.toFixed(2)),
      tier2: Number(tier2.toFixed(2)),
      net: Number(net.toFixed(2)),
      netPct: Number(((net / mockPrice) * 100).toFixed(2))
    };
  }, [config, eventCommissionRate]);

  const save = async (toastSection) => {
    if (!validatePrograms()) {
      toast.error('Fix agency program splits before saving.');
      return;
    }
    if (!window.confirm(`Estimated net per $100 ticket: ${currency(preview.net)}. Save?`)) return;
    const tabWhenSaving = toastSection ?? tab;
    setSaving(true);
    try {
      const {
        _id: _cfgId,
        __v,
        createdAt,
        updatedAt,
        event_id: _eid,
        organizer_id: _oid,
        primary_agency_id: _primaryRaw,
        ...commissionRest
      } = config;
      const payload = {
        ...commissionRest,
        primary_agency_id: normalizePrimaryAgencyForApi(config.primary_agency_id),
        agency_programs: mapProgramsForApi(config.agency_programs),
        ...(canEditPlatformFee ? { event_commission_rate: eventCommissionRate } : {})
      };
      await api.patch(`/api/events/${eventId}/commission-config`, payload);
      const sectionMsg = TAB_SAVE_SUCCESS[tabWhenSaving] || 'Commission configuration saved';
      const reloaded = await load();
      if (reloaded) {
        toast.success(`${sectionMsg} · saved for this event`);
      } else {
        toast.success(`${sectionMsg} · saved — reload the page if values look wrong`);
      }
    } catch (e) {
      toast.error(formatCommissionApiError(e, 'Failed to save commission settings'));
    } finally {
      setSaving(false);
    }
  };

  const renderSaveConfigurationBar = (opts = {}) => {
    const { compact, successToastSection } = opts;
    return (
      <div
        className={
          compact
            ? 'mt-6 flex justify-end'
            : 'pt-6 mt-2 border-t border-gray-200/70 dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'
        }
      >
        {!compact && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Saves waterfall, agency programs, primary agency, flat rules, attribution, and payouts together.
          </p>
        )}
        <button
          type="button"
          onClick={() => save(successToastSection)}
          disabled={saving || programErrors.length > 0}
          className={saveBtnClass}
        >
          {saving ? 'Saving…' : 'Save configuration'}
        </button>
      </div>
    );
  };

  const addProgram = () => {
    setConfig((prev) => ({
      ...prev,
      agency_programs: [...(prev.agency_programs || []), emptyProgram()]
    }));
  };

  const updateProgram = (idx, field, value) => {
    setConfig((prev) => {
      const next = [...(prev.agency_programs || [])];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, agency_programs: next };
    });
  };

  const removeProgram = (idx) => {
    setConfig((prev) => ({
      ...prev,
      agency_programs: (prev.agency_programs || []).filter((_, i) => i !== idx)
    }));
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-500 dark:text-gray-400">
        Loading commission settings…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[#4f0f69] dark:hover:text-violet-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Affiliate & commissions
          </h1>
          {eventTitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{eventTitle}</p>
          )}
          {adminMode && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Admin mode — saving on behalf of organizer</p>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Manage agencies and head/sub marketers in{' '}
        <Link to="/organizer/marketing" className="text-violet-600 dark:text-violet-400 font-medium hover:underline">
          Marketing partners
        </Link>
        .
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'waterfall', label: 'Waterfall', icon: Layers },
          { id: 'agencies', label: 'Agency programs', icon: Users },
          { id: 'flat', label: 'Flat affiliates', icon: Percent },
          { id: 'attribution', label: 'Attribution', icon: Link2 },
          { id: 'payout', label: 'Payouts', icon: Wallet }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === id
                ? 'bg-[#4f0f69] text-white shadow-md'
                : 'bg-white/60 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-white/90 dark:hover:bg-white/10'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className={`${glass} p-5 sm:p-6 mb-6`}>
        {tab === 'waterfall' && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Waterfall</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Defines how each ticket is split starting with the platform share, then organizer revenue, primary agency,
              and affiliate slices. Previews below use these rules.
            </p>
            <h3 className="text-base font-medium text-gray-900 dark:text-white pt-2">Platform fee (event)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Shown to buyers as the platform share.{' '}
              {canEditPlatformFee
                ? 'You can set the event commission % and how it feeds the waterfall.'
                : 'Only a platform admin can change this percentage; you can still configure agencies and affiliates around it.'}
            </p>
            <label className="flex flex-col sm:flex-row sm:items-center gap-2 max-w-md">
              <span className="text-sm text-gray-700 dark:text-gray-300">Event commission % (ticket)</span>
              {canEditPlatformFee ? (
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={eventCommissionRate}
                  onChange={(e) => setEventCommissionRate(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-gray-900/40 max-w-xs"
                />
              ) : (
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  value={String(eventCommissionRate)}
                  className={readOnlyFieldClass}
                  aria-readonly="true"
                />
              )}
            </label>
            <label className={`flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 ${!canEditPlatformFee ? 'opacity-90' : ''}`}>
              <input
                type="checkbox"
                disabled={!canEditPlatformFee}
                checked={config.use_event_commission_for_waterfall}
                onChange={(e) =>
                  setConfig({ ...config, use_event_commission_for_waterfall: e.target.checked })
                }
              />
              Use event commission % for affiliate waterfall (recommended)
            </label>
            {!config.use_event_commission_for_waterfall && (
              <div className="pt-2 space-y-2">
                {canEditPlatformFee ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <select
                      value={config.platform_fee_type}
                      onChange={(e) => setConfig({ ...config, platform_fee_type: e.target.value })}
                      className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-gray-900/40"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                    <input
                      type="number"
                      value={config.platform_fee_percentage}
                      onChange={(e) =>
                        setConfig({ ...config, platform_fee_percentage: Number(e.target.value) })
                      }
                      className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-gray-900/40"
                      placeholder="Platform %"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 rounded-xl border border-dashed border-gray-200 dark:border-white/15 p-3">
                    Custom platform fee mode is on ({config.platform_fee_type}, {config.platform_fee_percentage}% configured).
                    Contact an admin to change these settings.
                  </p>
                )}
              </div>
            )}
            {renderSaveConfigurationBar()}
          </div>
        )}

        {tab === 'agencies' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Agency programs</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Link each marketing partner to a program: a pool % of the ticket, split between the sub-seller (who
                  shared the link) and the head marketer. Add programs in <strong>Marketing partners</strong> first.
                </p>
              </div>
              <button
                type="button"
                onClick={addProgram}
                className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500"
              >
                Add program
              </button>
            </div>
            {programErrors.length > 0 && (
              <ul className="text-sm text-red-600 dark:text-red-400 list-disc pl-5">
                {programErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
            <p className="text-sm text-violet-900/90 dark:text-violet-200/90 rounded-xl border border-violet-200/80 dark:border-violet-800/50 bg-violet-50/80 dark:bg-violet-950/30 px-4 py-3">
              After buyers complete checkout with <code className="text-xs bg-black/5 dark:bg-white/10 px-1 rounded">?ref=</code>{' '}
              or a referral code, see{' '}
              <strong>tickets sold, attributed revenue, and estimated commission per code</strong> on the{' '}
              <Link
                to={`/organizer/events/${eventId}`}
                className="font-semibold text-violet-700 dark:text-violet-300 hover:underline"
              >
                event overview
              </Link>{' '}
              (Affiliate performance).
            </p>
            {(config.agency_programs || []).length === 0 && (
              <p className="text-sm text-gray-500">No agency programs — flat affiliate rules apply.</p>
            )}
            <div className="space-y-4">
              {(config.agency_programs || []).map((p, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200/80 dark:border-white/10 p-4 bg-white/40 dark:bg-gray-950/20"
                >
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Agency</label>
                      <select
                        value={p.agency_id || ''}
                        onChange={(e) => updateProgram(idx, 'agency_id', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/15 bg-white/90 dark:bg-gray-900/50 text-sm"
                      >
                        <option value="">Select…</option>
                        {agencies.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.agency_name || a.agency_email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Pool % of ticket</label>
                      <input
                        type="number"
                        value={p.pool_pct_of_ticket}
                        onChange={(e) =>
                          updateProgram(idx, 'pool_pct_of_ticket', Number(e.target.value))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/15 bg-white/90 dark:bg-gray-900/50 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Sub seller % of ticket</label>
                      <input
                        type="number"
                        value={p.sub_seller_pct_of_ticket}
                        onChange={(e) =>
                          updateProgram(idx, 'sub_seller_pct_of_ticket', Number(e.target.value))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/15 bg-white/90 dark:bg-gray-900/50 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Head % of ticket</label>
                      <input
                        type="number"
                        value={p.head_pct_of_ticket}
                        onChange={(e) =>
                          updateProgram(idx, 'head_pct_of_ticket', Number(e.target.value))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-white/15 bg-white/90 dark:bg-gray-900/50 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeProgram(idx)}
                    className="mt-3 text-sm text-red-600 hover:underline"
                  >
                    Remove program
                  </button>
          </div>
              ))}
            </div>
            {renderSaveConfigurationBar()}
          </div>
        )}

        {tab === 'flat' && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Flat affiliates</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Fallback when a sale is not tied to an agency program: a straight commission for individual affiliates,
              as a % of the ticket or of organizer revenue (or agency revenue if you use a primary agency).
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.affiliate_commission_enabled}
                onChange={(e) =>
                  setConfig({ ...config, affiliate_commission_enabled: e.target.checked })
                }
              />
              Enable legacy / flat affiliate commission
            </label>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Flat % of ticket (optional — overrides base below when set)
              </label>
              <input
                type="number"
                value={config.flat_affiliate_pct_of_ticket ?? ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    flat_affiliate_pct_of_ticket: e.target.value === '' ? null : Number(e.target.value)
                  })
                }
                placeholder="e.g. 15"
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-gray-900/40 max-w-xs"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <select
                value={config.affiliate_commission_base}
                onChange={(e) => setConfig({ ...config, affiliate_commission_base: e.target.value })}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-gray-900/40"
              >
                <option value="ticket_price">Base: ticket price</option>
                <option value="organizer_revenue">Base: organizer revenue</option>
                <option value="agency_revenue">Base: agency revenue</option>
            </select>
              <input
                type="number"
                value={config.affiliate_commission_rate}
                onChange={(e) =>
                  setConfig({ ...config, affiliate_commission_rate: Number(e.target.value) })
                }
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-gray-900/40"
                placeholder="% when flat field empty"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.enable_multi_tier}
                onChange={(e) => setConfig({ ...config, enable_multi_tier: e.target.checked })}
              />
              Upline % of seller commission (legacy multi-tier)
            </label>
            {config.enable_multi_tier && (
              <input
                type="number"
                value={config.tier_2_commission_rate || 0}
                onChange={(e) =>
                  setConfig({ ...config, tier_2_commission_rate: Number(e.target.value) })
                }
                className="px-3 py-2 rounded-xl border max-w-xs"
                placeholder="Upline %"
              />
            )}
            {renderSaveConfigurationBar()}
            </div>
          )}

        {tab === 'attribution' && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Attribution</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Rules for which referral link earns credit (last vs first click, etc.), how long clicks stay valid, and
              whether self-referrals or duplicate conversions are allowed.
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
            {renderSaveConfigurationBar()}
          </div>
        )}

        {tab === 'payout' && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Payouts</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cadence for paying affiliates (immediate, weekly, manual, etc.), optional delay after a sale, and minimum
              balance before a payout runs.
            </p>
          <div className="grid sm:grid-cols-3 gap-3">
              <select
                value={config.payout_frequency}
                onChange={(e) => setConfig({ ...config, payout_frequency: e.target.value })}
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-gray-900/40"
              >
              <option value="immediate">Immediate</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="manual">Manual</option>
            </select>
              <input
                type="number"
                value={config.payout_delay_days}
                onChange={(e) =>
                  setConfig({ ...config, payout_delay_days: Number(e.target.value) })
                }
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-gray-900/40"
                placeholder="Delay days"
              />
              <input
                type="number"
                value={config.minimum_payout_amount}
                onChange={(e) =>
                  setConfig({ ...config, minimum_payout_amount: Number(e.target.value) })
                }
                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-gray-900/40"
                placeholder="Minimum"
              />
            </div>
            {renderSaveConfigurationBar()}
          </div>
        )}
      </div>

      <div className={`${glass} p-5 sm:p-6 mb-6`}>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Primary agency (optional)</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <select
            value={config.primary_agency_id || ''}
            onChange={(e) => setConfig({ ...config, primary_agency_id: e.target.value })}
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-gray-900/40"
          >
            <option value="">None</option>
            {agencies.map((a) => (
              <option key={a._id} value={a._id}>
                {a.agency_name || a.agency_email}
              </option>
            ))}
          </select>
          <select
            value={config.primary_agency_commission_type}
            onChange={(e) =>
              setConfig({ ...config, primary_agency_commission_type: e.target.value })
            }
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-gray-900/40"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </select>
          <input
            type="number"
            value={
              config.primary_agency_commission_type === 'percentage'
                ? config.primary_agency_commission_rate
                : config.primary_agency_commission_fixed
            }
            onChange={(e) =>
              setConfig({
                ...config,
                [config.primary_agency_commission_type === 'percentage'
                  ? 'primary_agency_commission_rate'
                  : 'primary_agency_commission_fixed']: Number(e.target.value)
              })
            }
            className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-gray-900/40"
          />
        </div>
        {renderSaveConfigurationBar({ successToastSection: 'primary' })}
      </div>

      <div className={`${glass} p-5 sm:p-6`}>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Quick preview ($100 ticket)</h2>
        <pre className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap bg-black/5 dark:bg-white/5 rounded-xl p-4">
          {`Ticket: $${mockPrice.toFixed(2)}
├ Platform (${config.use_event_commission_for_waterfall ? `${eventCommissionRate}% (event)` : 'config'}): -$${preview.platform_fee.toFixed(2)}
└ Organizer revenue: $${preview.organizer_revenue.toFixed(2)}
   ├ Primary agency: -$${preview.primary_agency.toFixed(2)}
   ├ Affiliate / sub: -$${preview.affiliate.toFixed(2)}
   ${preview.headExtra > 0 ? `├ Head (agency pool): -$${preview.headExtra.toFixed(2)}\n   ` : ''}${config.enable_multi_tier && preview.tier2 > 0 ? `├ Upline: -$${preview.tier2.toFixed(2)}\n   ` : ''}└ Your net: $${preview.net.toFixed(2)} (${preview.netPct}%)`}
          </pre>
        {renderSaveConfigurationBar({ compact: true, successToastSection: 'preview' })}
      </div>
    </div>
  );
}
