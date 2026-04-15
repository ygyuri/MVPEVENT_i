import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Percent, Users, Link2, Building2 } from 'lucide-react';
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

function mapIndependentRatesForApi(rates) {
  if (!Array.isArray(rates)) return [];
  return rates
    .filter((r) => r.affiliate_id && String(r.affiliate_id).trim())
    .map((r) => ({
      affiliate_id: String(r.affiliate_id).trim(),
      pct_of_ticket: Number(r.pct_of_ticket) || 0
    }));
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
  independent_marketer_rates: [],
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

const saveBtnClass =
  'px-6 py-2.5 rounded-xl bg-[#4f0f69] text-white font-medium hover:bg-[#6b1a8a] disabled:opacity-50';

const TAB_SAVE_SUCCESS = {
  platform: 'Platform fee saved',
  agencies: 'Agency programs saved',
  independent: 'Independent marketer settings saved',
  rules: 'Rules saved',
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
  const [tab, setTab] = useState('agencies');
  const [config, setConfig] = useState(defaultConfig);
  const [eventCommissionRate, setEventCommissionRate] = useState(6);
  const [eventTitle, setEventTitle] = useState('');
  const [agencies, setAgencies] = useState([]);
  const [soloMarketers, setSoloMarketers] = useState([]);
  const [programErrors, setProgramErrors] = useState([]);
  const [newSolo, setNewSolo] = useState({
    first_name: '',
    last_name: '',
    email: '',
    pct_of_ticket: 10
  });
  const [creatingSolo, setCreatingSolo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let ok = false;
    try {
      const [cfgRes, agRes, soloRes] = await Promise.all([
        api.get(`/api/events/${eventId}/commission-config`),
        api.get('/api/organizer/marketing-agencies'),
        api.get('/api/organizer/independent-marketers').catch(() => ({ data: { items: [] } }))
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
          const ind = Array.isArray(c.independent_marketer_rates)
            ? c.independent_marketer_rates.map((r) => ({
                affiliate_id: r.affiliate_id != null ? String(r.affiliate_id) : '',
                pct_of_ticket: Number(r.pct_of_ticket) || 0
              }))
            : [];
          const next = {
            ...prev,
            ...commissionFields,
            agency_programs: mapProgramsFromApi(c.agency_programs),
            independent_marketer_rates: ind
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
      setSoloMarketers(soloRes.data?.items || []);
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
    const primary_agency = 0;

    const firstProg = (config.agency_programs || [])[0];
    let affiliate = 0;
    let headExtra = 0;
    if (firstProg) {
      affiliate = mockPrice * ((Number(firstProg.sub_seller_pct_of_ticket) || 0) / 100);
      headExtra = mockPrice * ((Number(firstProg.head_pct_of_ticket) || 0) / 100);
    } else if ((config.independent_marketer_rates || []).length > 0) {
      const r0 = config.independent_marketer_rates[0];
      affiliate = mockPrice * ((Number(r0.pct_of_ticket) || 0) / 100);
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
        primary_agency_id: canEditPlatformFee
          ? normalizePrimaryAgencyForApi(config.primary_agency_id)
          : null,
        agency_programs: mapProgramsForApi(config.agency_programs),
        independent_marketer_rates: mapIndependentRatesForApi(config.independent_marketer_rates),
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
            Saves agency programs, independent marketer rates, and referral rules (platform fee stays on the event;
            see preview below).
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

  const pctForSolo = (affiliateId) => {
    const row = (config.independent_marketer_rates || []).find(
      (r) => String(r.affiliate_id) === String(affiliateId)
    );
    return row ? row.pct_of_ticket : '';
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
      toast.success(
        `${aff.first_name} added · ${aff.referral_code}. Generate their tracking link on Affiliate links.`
      );
      setNewSolo({ first_name: '', last_name: '', email: '', pct_of_ticket: 10 });
      await load();
    } catch (err) {
      toast.error(formatCommissionApiError(err, 'Could not add independent marketer'));
    } finally {
      setCreatingSolo(false);
    }
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
          Pick event → marketing hub
        </Link>
        . Add <strong>independent marketers</strong> on the next tab, then open{' '}
        <Link
          to={`/organizer/events/${eventId}/marketing?tab=links`}
          className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
        >
          Affiliate links
        </Link>{' '}
        to generate checkout URLs. The preview at the bottom uses your event&apos;s platform fee (admins can change
        that in admin mode).
      </p>

      {canEditPlatformFee && (
        <div className={`${glass} p-5 sm:p-6 mb-6`}>
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Platform fee (admin)</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
            Shown to buyers as the platform share. Organizers configure partners and splits on the other tabs; this
            slice is edited only in admin mode.
          </p>
          <label className="flex flex-col sm:flex-row sm:items-center gap-2 max-w-md mb-3">
            <span className="text-sm text-gray-700 dark:text-gray-300">Event commission % (ticket)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={eventCommissionRate}
              onChange={(e) => setEventCommissionRate(Number(e.target.value))}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white/80 dark:bg-gray-900/40 max-w-xs"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mb-3">
            <input
              type="checkbox"
              checked={config.use_event_commission_for_waterfall}
              onChange={(e) =>
                setConfig({ ...config, use_event_commission_for_waterfall: e.target.checked })
              }
            />
            Use event commission % in commission math (recommended)
          </label>
          {!config.use_event_commission_for_waterfall && (
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
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
          )}
          {renderSaveConfigurationBar({ successToastSection: 'platform' })}
        </div>
      )}

      {/* Main tabs: no separate "Waterfall" — preview at bottom shows platform + splits in one place. */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'agencies', label: 'Agency programs', icon: Users },
          { id: 'independent', label: 'Independent marketers', icon: Percent },
          { id: 'rules', label: 'Rules', icon: Link2 }
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
        {tab === 'agencies' && (
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="space-y-2 max-w-3xl">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Agency programs</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  For each <strong>marketing partner</strong> you already added (a lead marketer or &quot;agency&quot;
                  with a team): set how much of each ticket goes to that partner&apos;s <strong>pool</strong>, then how
                  that pool splits between the <strong>person who shared the link (sub)</strong> and the{' '}
                  <strong>team lead (head)</strong>. Sub + head percentages must add up to the pool.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don&apos;t have the partner in the list yet? Add them first—same place where you create head marketers
                  and sub-promoters.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <Link
                  to={`/organizer/events/${eventId}/marketing`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border-2 border-violet-600 text-violet-700 dark:text-violet-300 bg-violet-50/80 dark:bg-violet-950/40 text-sm font-medium hover:bg-violet-100/80 dark:hover:bg-violet-900/30"
                >
                  <Building2 className="w-4 h-4" />
                  Open marketing hub (partners)
                </Link>
                <Link
                  to={`/organizer/events/${eventId}/marketing?tab=links`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#4f0f69] text-white text-sm font-medium hover:bg-[#6b1a8a]"
                >
                  <Link2 className="w-4 h-4" />
                  Affiliate links
                </Link>
                <button
                  type="button"
                  onClick={addProgram}
                  className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500"
                >
                  Add program row
                </button>
              </div>
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
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No program rows yet—use <strong>Independent marketers</strong> for solo promoters, or add a row here
                once you have an agency team (head / sub splits).
              </p>
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

        {tab === 'independent' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Independent marketers</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
                  Solo promoters <strong>not</strong> tied to an agency. Each gets a <strong>unique referral code</strong>.
                  Set their <strong>% of each ticket</strong> for this event, then create tracking links.
                </p>
              </div>
              <Link
                to={`/organizer/events/${eventId}/marketing?tab=links`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#4f0f69] text-white text-sm font-medium hover:bg-[#6b1a8a] shrink-0"
              >
                <Link2 className="w-4 h-4" />
                Affiliate links
              </Link>
            </div>

            <div className="rounded-xl border border-violet-200/80 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/25 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
              After you set percentages, open <strong>Affiliate links</strong> to generate checkout URLs with{' '}
              <code className="text-xs bg-black/5 dark:bg-white/10 px-1 rounded">?ref=</code> for each person.
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
                  <label className="text-xs text-gray-500 block mb-1">% of ticket (this event)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={newSolo.pct_of_ticket}
                    onChange={(e) =>
                      setNewSolo({ ...newSolo, pct_of_ticket: Number(e.target.value) })
                    }
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Saves the person and their rate for this event in one step. Adjust % for anyone below, then{' '}
                <strong>Save configuration</strong>.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Rates for this event</h3>
              {soloMarketers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No independent marketers yet. Use the form above to add the first one.
                </p>
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
                        <p className="text-xs text-violet-600 dark:text-violet-400 mt-1 font-mono">
                          {m.referral_code}
                        </p>
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

            {renderSaveConfigurationBar({ successToastSection: 'independent' })}
          </div>
        )}

        {tab === 'rules' && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Rules</h2>
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
            {renderSaveConfigurationBar({ successToastSection: 'rules' })}
          </div>
        )}
      </div>

      <div className={`${glass} p-5 sm:p-6`}>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Quick preview ($100 ticket)</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Example only. Platform line uses the event&apos;s commission % when enabled in config (admins can change that
          in admin mode above).
        </p>
        <pre className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap bg-black/5 dark:bg-white/5 rounded-xl p-4">
          {`Ticket: $${mockPrice.toFixed(2)}
├ Platform / event fee (${config.use_event_commission_for_waterfall ? `${eventCommissionRate}%` : 'advanced'}): -$${preview.platform_fee.toFixed(2)}
└ Organizer revenue: $${preview.organizer_revenue.toFixed(2)}
   ├ Sub / independent marketer: -$${preview.affiliate.toFixed(2)}
   ${preview.headExtra > 0 ? `├ Head (agency pool): -$${preview.headExtra.toFixed(2)}\n   ` : ''}${config.enable_multi_tier && preview.tier2 > 0 ? `├ Upline: -$${preview.tier2.toFixed(2)}\n   ` : ''}└ Your net: $${preview.net.toFixed(2)} (${preview.netPct}%)`}
          </pre>
        {renderSaveConfigurationBar({ compact: true, successToastSection: 'preview' })}
      </div>
    </div>
  );
}
