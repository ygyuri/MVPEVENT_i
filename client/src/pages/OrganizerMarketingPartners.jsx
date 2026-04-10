import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Megaphone,
  UserPlus,
  Users
} from 'lucide-react';
import api from '../utils/api';

const glass =
  'rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/50 dark:bg-gray-900/30 backdrop-blur-md shadow-sm';

const EMPTY_TEAM = [];

/** Preview only — backend assigns the real unique code on save. */
function previewAutoReferralCode(firstName) {
  const base = (firstName || 'AFF').replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase() || 'AFF';
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${base}${rand}`.slice(0, 12);
}

function formatApiError(err, fallback) {
  const data = err?.response?.data;
  if (data?.details && Array.isArray(data.details) && data.details.length > 0) {
    const line = data.details
      .map((d) => {
        const pathLabel = Array.isArray(d.path)
          ? d.path.join('.')
          : d.path != null
            ? String(d.path)
            : d.param != null
              ? String(d.param)
              : '';
        const msg = d.msg || d.message;
        if (pathLabel && msg) return `${pathLabel}: ${msg}`;
        return msg || '';
      })
      .filter(Boolean)
      .join(' · ');
    if (line) return line;
  }
  if (data?.error === 'VALIDATION_ERROR') {
    return 'Please check the form fields and try again.';
  }
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.message === 'string') return data.message;
  if (err?.message) return err.message;
  return fallback;
}

const readOnlyCodeFieldClass =
  'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 text-sm cursor-not-allowed';

/** Parent id from API (ObjectId string, null, or rare populated object). */
function parentAffiliateKey(m) {
  const p = m?.parent_affiliate_id;
  if (p == null || p === '') return null;
  if (typeof p === 'object' && p !== null && p._id != null) return String(p._id);
  return String(p);
}

function groupTeam(items) {
  const list = items || [];
  const heads = list.filter((m) => !parentAffiliateKey(m));
  const byParent = {};
  list.forEach((m) => {
    const k = parentAffiliateKey(m);
    if (k) {
      if (!byParent[k]) byParent[k] = [];
      byParent[k].push(m);
    }
  });
  return { heads, byParent };
}

export default function OrganizerMarketingPartners() {
  const [searchParams, setSearchParams] = useSearchParams();
  const agencyParam = searchParams.get('agency');

  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState([]);
  const [marketersByAgency, setMarketersByAgency] = useState({});

  const [agencyForm, setAgencyForm] = useState({
    agency_name: '',
    agency_email: '',
    contact_person: '',
    phone: '',
    payout_paypal_email: ''
  });
  const [creatingAgency, setCreatingAgency] = useState(false);

  const [headForm, setHeadForm] = useState({
    first_name: '',
    last_name: '',
    email: ''
  });
  const [subForm, setSubForm] = useState({
    parent_affiliate_id: '',
    first_name: '',
    last_name: '',
    email: ''
  });
  const [creatingHead, setCreatingHead] = useState(false);
  const [creatingSub, setCreatingSub] = useState(false);
  const [teamCardOpen, setTeamCardOpen] = useState(true);

  const headReferralPreview = useMemo(
    () => previewAutoReferralCode(headForm.first_name),
    [headForm.first_name]
  );
  const subReferralPreview = useMemo(
    () => previewAutoReferralCode(subForm.first_name),
    [subForm.first_name]
  );

  const selectedAgency = useMemo(
    () => agencies.find((a) => String(a._id) === String(agencyParam)) || null,
    [agencies, agencyParam]
  );

  const loadAgencies = useCallback(async () => {
    const res = await api.get('/api/organizer/marketing-agencies', { params: { limit: 100 } });
    const items = res.data?.items || [];
    setAgencies(items);
    return items;
  }, []);

  const loadMarketersForAgency = useCallback(async (agencyId) => {
    const id = agencyId != null ? String(agencyId) : '';
    if (!id) return [];
    const res = await api.get('/api/agency/affiliates', {
      params: { agency_id: id, limit: 100 }
    });
    return res.data?.items || [];
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const items = await loadAgencies();
      const next = {};
      for (const a of items) {
        const aid = String(a._id);
        try {
          next[aid] = await loadMarketersForAgency(aid);
        } catch {
          next[aid] = [];
        }
      }
      setMarketersByAgency(next);
    } catch (e) {
      toast.error(formatApiError(e, 'Failed to load marketing partners'));
    } finally {
      setLoading(false);
    }
  }, [loadAgencies, loadMarketersForAgency]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Refresh roster + head dropdown when the selected partner changes (or after initial load) so the list stays in sync.
  useEffect(() => {
    if (!agencyParam || loading) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await loadMarketersForAgency(agencyParam);
        if (cancelled) return;
        setMarketersByAgency((prev) => ({ ...prev, [String(agencyParam)]: list }));
      } catch (e) {
        if (!cancelled) toast.error(formatApiError(e, 'Could not load marketers for this partner'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agencyParam, loading, loadMarketersForAgency]);

  const selectAgency = (id) => {
    setSearchParams(id ? { agency: id } : {});
  };

  const onCreateAgency = async (e) => {
    e.preventDefault();
    if (!agencyForm.agency_name.trim() || !agencyForm.agency_email.trim()) {
      toast.error('Agency name and email are required');
      return;
    }
    if (!agencyForm.payout_paypal_email.trim()) {
      toast.error('Payout PayPal email is required to activate the partner immediately');
      return;
    }
    setCreatingAgency(true);
    try {
      const partnerName = agencyForm.agency_name.trim();
      const res = await api.post('/api/organizer/marketing-agencies', {
        agency_name: partnerName,
        agency_email: agencyForm.agency_email.trim().toLowerCase(),
        contact_person: agencyForm.contact_person.trim() || undefined,
        phone: agencyForm.phone.trim() || undefined,
        payout_paypal_email: agencyForm.payout_paypal_email.trim().toLowerCase()
      });
      const ag = res.data?.agency;
      toast.success(`Partner "${partnerName}" registered and active`);
      setAgencyForm({
        agency_name: '',
        agency_email: '',
        contact_person: '',
        phone: '',
        payout_paypal_email: ''
      });
      await refreshAll();
      if (ag?._id) selectAgency(String(ag._id));
    } catch (err) {
      toast.error(formatApiError(err, 'Could not register agency'));
    } finally {
      setCreatingAgency(false);
    }
  };

  const onCreateHead = async (e) => {
    e.preventDefault();
    if (!selectedAgency) return;
    if (!headForm.first_name.trim() || !headForm.last_name.trim() || !headForm.email.trim()) {
      toast.error('First name, last name, and email are required');
      return;
    }
    setCreatingHead(true);
    try {
      const res = await api.post('/api/agency/affiliates', {
        agency_id: String(selectedAgency._id),
        first_name: headForm.first_name.trim(),
        last_name: headForm.last_name.trim(),
        email: headForm.email.trim().toLowerCase(),
        status: 'active'
      });
      const code = res.data?.affiliate?.referral_code;
      const fn = headForm.first_name.trim();
      const ln = headForm.last_name.trim();
      toast.success(
        code
          ? `Head marketer ${fn} ${ln} added · referral code ${code}`
          : `Head marketer ${fn} ${ln} added`
      );
      setHeadForm({ first_name: '', last_name: '', email: '' });
      await refreshAll();
    } catch (err) {
      toast.error(formatApiError(err, 'Could not add head marketer'));
    } finally {
      setCreatingHead(false);
    }
  };

  const onCreateSub = async (e) => {
    e.preventDefault();
    if (!selectedAgency || !subForm.parent_affiliate_id) {
      toast.error('Select a head marketer for this sub');
      return;
    }
    if (!subForm.first_name.trim() || !subForm.last_name.trim() || !subForm.email.trim()) {
      toast.error('First name, last name, and email are required');
      return;
    }
    setCreatingSub(true);
    try {
      const res = await api.post('/api/agency/affiliates', {
        agency_id: String(selectedAgency._id),
        parent_affiliate_id: subForm.parent_affiliate_id,
        first_name: subForm.first_name.trim(),
        last_name: subForm.last_name.trim(),
        email: subForm.email.trim().toLowerCase(),
        status: 'active'
      });
      const code = res.data?.affiliate?.referral_code;
      const fn = subForm.first_name.trim();
      const ln = subForm.last_name.trim();
      toast.success(
        code
          ? `Sub-affiliate ${fn} ${ln} added · referral code ${code}`
          : `Sub-affiliate ${fn} ${ln} added`
      );
      setSubForm({
        parent_affiliate_id: '',
        first_name: '',
        last_name: '',
        email: ''
      });
      await refreshAll();
    } catch (err) {
      toast.error(formatApiError(err, 'Could not add sub-affiliate'));
    } finally {
      setCreatingSub(false);
    }
  };

  const teamForSelected = useMemo(() => {
    if (!selectedAgency) return EMPTY_TEAM;
    const t = marketersByAgency[String(selectedAgency._id)];
    return Array.isArray(t) ? t : EMPTY_TEAM;
  }, [selectedAgency, marketersByAgency]);

  const { heads, byParent } = useMemo(() => groupTeam(teamForSelected), [teamForSelected]);

  // Default sub-affiliate form to a valid head when heads exist (dropdown prefilled).
  useEffect(() => {
    if (!selectedAgency) return;
    setSubForm((prev) => {
      const pid = prev.parent_affiliate_id;
      const stillValid = pid && heads.some((h) => String(h._id) === String(pid));
      if (heads.length === 0) {
        if (!pid) return prev;
        return { ...prev, parent_affiliate_id: '' };
      }
      if (stillValid) return prev;
      return { ...prev, parent_affiliate_id: String(heads[0]._id) };
    });
  }, [selectedAgency?._id, heads]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-16">
      <Link
        to="/organizer"
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-4 hover:text-[#4f0f69] dark:hover:text-violet-300"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
              <Megaphone className="w-7 h-7 sm:w-8 sm:h-8" />
            </span>
            Marketing partners
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">
            Register an agency (your main partner), add a <strong>head marketer</strong>, then{' '}
            <strong>sub-affiliates</strong> under that head. Percentage splits between head and subs are set per
            event under <strong>Commissions → Agency programs</strong>.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <div className={`${glass} p-5 sm:p-6`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-violet-600" />
            Register a marketing agency
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Creates an active partner immediately using PayPal for payouts. No separate approval step.
          </p>
          <form onSubmit={onCreateAgency} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                Agency / partner name *
              </label>
              <input
                required
                value={agencyForm.agency_name}
                onChange={(e) => setAgencyForm({ ...agencyForm, agency_name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white"
                placeholder="e.g. Nairobi Growth Collective"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                Business email *
              </label>
              <input
                required
                type="email"
                value={agencyForm.agency_email}
                onChange={(e) => setAgencyForm({ ...agencyForm, agency_email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white"
                placeholder="partner@agency.com"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                  Contact person
                </label>
                <input
                  value={agencyForm.contact_person}
                  onChange={(e) => setAgencyForm({ ...agencyForm, contact_person: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                  Phone
                </label>
                <input
                  value={agencyForm.phone}
                  onChange={(e) => setAgencyForm({ ...agencyForm, phone: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                Payout PayPal email * <span className="text-violet-600 dark:text-violet-400">(activates partner)</span>
              </label>
              <input
                required
                type="email"
                value={agencyForm.payout_paypal_email}
                onChange={(e) => setAgencyForm({ ...agencyForm, payout_paypal_email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white"
                placeholder="payouts@agency.com"
              />
            </div>
            <button
              type="submit"
              disabled={creatingAgency}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#4f0f69] text-white font-medium hover:bg-[#6b1a8a] disabled:opacity-50 transition-colors"
            >
              {creatingAgency ? 'Saving…' : 'Register & activate partner'}
            </button>
          </form>
        </div>

        <div className={`${glass} p-5 sm:p-6 flex flex-col min-h-[320px]`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-600" />
            Your partners
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Select a partner to manage head marketers and subs.
          </p>
          {agencies.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center text-gray-500 dark:text-gray-400 text-sm border border-dashed border-gray-200 dark:border-white/10 rounded-xl p-8">
              No agencies yet. Register one on the left.
            </div>
          ) : (
            <ul className="space-y-2 overflow-y-auto max-h-[380px] pr-1">
              {agencies.map((a) => {
                const active = String(a._id) === String(agencyParam);
                return (
                  <li key={a._id}>
                    <button
                      type="button"
                      onClick={() => selectAgency(String(a._id))}
                      className={`w-full text-left rounded-xl px-4 py-3 flex items-center justify-between gap-2 transition-colors ${
                        active
                          ? 'bg-violet-100 dark:bg-violet-900/35 border border-violet-200 dark:border-violet-800'
                          : 'bg-gray-50/80 dark:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{a.agency_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{a.agency_email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {a.status === 'active' && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </span>
                        )}
                        <ChevronRight className={`w-4 h-4 ${active ? 'text-violet-600' : 'text-gray-400'}`} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {selectedAgency && (
        <div className="space-y-6">
          <div className={`${glass} p-5 sm:p-6`}>
            <button
              type="button"
              onClick={() => setTeamCardOpen((o) => !o)}
              className="w-full flex items-center justify-between gap-3 text-left mb-4 rounded-xl -m-1 p-1 hover:bg-gray-100/60 dark:hover:bg-white/5 transition-colors"
              aria-expanded={teamCardOpen}
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-violet-600 shrink-0" />
                Team for {selectedAgency.agency_name}
              </h2>
              <span className="text-gray-500 dark:text-gray-400 shrink-0">
                {teamCardOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </span>
            </button>

            {teamCardOpen && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Add head marketer</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  The lead seller for this agency (no parent). Subs attach to a head.
                </p>
                <form onSubmit={onCreateHead} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      required
                      placeholder="First name *"
                      value={headForm.first_name}
                      onChange={(e) => setHeadForm({ ...headForm, first_name: e.target.value })}
                      className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-sm"
                    />
                    <input
                      required
                      placeholder="Last name *"
                      value={headForm.last_name}
                      onChange={(e) => setHeadForm({ ...headForm, last_name: e.target.value })}
                      className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-sm"
                    />
                  </div>
                  <input
                    required
                    type="email"
                    placeholder="Email *"
                    value={headForm.email}
                    onChange={(e) => setHeadForm({ ...headForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-sm"
                  />
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                      Referral code (assigned automatically)
                    </label>
                    <input
                      readOnly
                      tabIndex={-1}
                      value={headForm.first_name.trim() ? headReferralPreview : ''}
                      placeholder="Enter first name to preview format"
                      className={readOnlyCodeFieldClass}
                      aria-readonly="true"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Final code is created when you save; it is always unique.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={creatingHead}
                    className="px-5 py-2.5 rounded-xl bg-[#4f0f69] text-white text-sm font-medium disabled:opacity-50"
                  >
                    {creatingHead ? 'Adding…' : 'Add head marketer'}
                  </button>
                </form>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Add sub-affiliate</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Sells under a head; commission split uses your event&apos;s agency program (sub vs head %).
                </p>
                <form onSubmit={onCreateSub} className="space-y-3">
                  <select
                    required
                    value={subForm.parent_affiliate_id}
                    onChange={(e) => setSubForm({ ...subForm, parent_affiliate_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-sm"
                  >
                    <option value="">Select head marketer *</option>
                    {heads.map((h) => (
                      <option key={String(h._id)} value={String(h._id)}>
                        {h.first_name} {h.last_name}
                        {h.referral_code ? ` · ${h.referral_code}` : ''}
                      </option>
                    ))}
                  </select>
                  {heads.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">Add a head marketer first.</p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      required
                      placeholder="First name *"
                      value={subForm.first_name}
                      onChange={(e) => setSubForm({ ...subForm, first_name: e.target.value })}
                      className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-sm"
                    />
                    <input
                      required
                      placeholder="Last name *"
                      value={subForm.last_name}
                      onChange={(e) => setSubForm({ ...subForm, last_name: e.target.value })}
                      className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-sm"
                    />
                  </div>
                  <input
                    required
                    type="email"
                    placeholder="Email *"
                    value={subForm.email}
                    onChange={(e) => setSubForm({ ...subForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-sm"
                  />
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                      Referral code (assigned automatically)
                    </label>
                    <input
                      readOnly
                      tabIndex={-1}
                      value={subForm.first_name.trim() ? subReferralPreview : ''}
                      placeholder="Enter first name to preview format"
                      className={readOnlyCodeFieldClass}
                      aria-readonly="true"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Final code is created when you save; it is always unique.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={creatingSub || heads.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-violet-700 text-white text-sm font-medium hover:bg-violet-800 disabled:opacity-50"
                  >
                    {creatingSub ? 'Adding…' : 'Add sub-affiliate'}
                  </button>
                </form>
              </div>
            </div>
            )}
          </div>

          <div className={`${glass} p-5 sm:p-6`}>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Roster</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
              All marketers for this partner in one place: each <strong>head</strong> and their <strong>subs</strong>,
              for review and to confirm who sells under whom before you assign links or commissions.
            </p>
            {teamForSelected.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No marketers yet for this agency.</p>
            ) : (
              <div className="space-y-6">
                {heads.map((head) => {
                  const subs = byParent[String(head._id)] || [];
                  return (
                    <div
                      key={head._id}
                      className="rounded-xl border border-gray-200/80 dark:border-white/10 overflow-hidden"
                    >
                      <div className="bg-violet-50/80 dark:bg-violet-950/30 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {head.first_name} {head.last_name}
                            <span className="ml-2 text-xs font-normal text-violet-700 dark:text-violet-300">
                              Head · {head.referral_code}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{head.email}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/80 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                          {head.status}
                        </span>
                      </div>
                      {subs.length > 0 ? (
                        <ul className="divide-y divide-gray-100 dark:divide-white/5">
                          {subs.map((s) => (
                            <li key={s._id} className="px-4 py-3 flex flex-wrap justify-between gap-2 text-sm">
                              <div>
                                <span className="text-gray-900 dark:text-white">
                                  {s.first_name} {s.last_name}
                                </span>
                                <span className="ml-2 text-xs text-gray-500">Sub · {s.referral_code}</span>
                                <p className="text-xs text-gray-500">{s.email}</p>
                              </div>
                              <span className="text-xs text-gray-500 self-start">{s.status}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">No subs under this head yet.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Next: open{' '}
            <Link to="/organizer/events" className="text-violet-600 dark:text-violet-400 font-medium hover:underline">
              My events
            </Link>
            , choose your event → <strong>Commissions</strong> to add an agency program (pool / sub / head %), then{' '}
            <strong>Affiliate links</strong> to generate tracking URLs for each marketer.
          </p>
        </div>
      )}
    </div>
  );
}
