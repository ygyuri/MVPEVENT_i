import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  UserPlus,
  Users
} from 'lucide-react';
import api from '../../../utils/api';
import {
  mapProgramsForApi,
  mapProgramsFromApi,
  formatCommissionApiError
} from '../../../utils/commissionConfigHelpers';

const glass =
  'rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/50 dark:bg-gray-900/30 backdrop-blur-md shadow-sm';

const EMPTY_TEAM = [];

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
  if (data?.error === 'VALIDATION_ERROR') return 'Please check the form fields and try again.';
  if (typeof data?.error === 'string') return data.error;
  if (typeof data?.message === 'string') return data.message;
  if (err?.message) return err.message;
  return fallback;
}

const readOnlyCodeFieldClass =
  'w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 text-sm cursor-not-allowed';

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

function validateProgramRows(programs) {
  const errs = [];
  (programs || []).forEach((p, i) => {
    const pool = Number(p.pool_pct_of_ticket) || 0;
    const sub = Number(p.sub_seller_pct_of_ticket) || 0;
    const head = Number(p.head_pct_of_ticket) || 0;
    if (Math.abs(sub + head - pool) > 0.02) {
      errs.push(`Row ${i + 1}: sub (${sub}%) + head (${head}%) must equal pool (${pool}%).`);
    }
  });
  return errs;
}

export default function MarketingPartnersStep({
  eventId,
  config,
  setConfig,
  agencies,
  onRefresh,
  onGoToIndependents
}) {
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [marketersByAgency, setMarketersByAgency] = useState({});
  const [savingPrograms, setSavingPrograms] = useState(false);

  const [agencyForm, setAgencyForm] = useState({
    agency_name: '',
    agency_email: '',
    contact_person: '',
    phone: '',
    payout_paypal_email: ''
  });
  const [newProgramPct, setNewProgramPct] = useState({
    pool_pct_of_ticket: 40,
    sub_seller_pct_of_ticket: 20,
    head_pct_of_ticket: 20
  });
  const [creatingAgency, setCreatingAgency] = useState(false);

  const [addExistingAgencyId, setAddExistingAgencyId] = useState('');
  const [addExistingPct, setAddExistingPct] = useState({
    pool_pct_of_ticket: 40,
    sub_seller_pct_of_ticket: 20,
    head_pct_of_ticket: 20
  });

  const [headForm, setHeadForm] = useState({ first_name: '', last_name: '', email: '' });
  const [subForm, setSubForm] = useState({
    parent_affiliate_id: '',
    first_name: '',
    last_name: '',
    email: ''
  });
  const [creatingHead, setCreatingHead] = useState(false);
  const [creatingSub, setCreatingSub] = useState(false);

  const programIdsOnEvent = useMemo(
    () =>
      new Set(
        (config.agency_programs || [])
          .map((p) => String(p.agency_id || ''))
          .filter(Boolean)
      ),
    [config.agency_programs]
  );

  const agenciesNotOnEvent = useMemo(
    () => (agencies || []).filter((a) => !programIdsOnEvent.has(String(a._id))),
    [agencies, programIdsOnEvent]
  );

  const selectedAgency = useMemo(
    () => agencies.find((a) => String(a._id) === String(selectedAgencyId)) || null,
    [agencies, selectedAgencyId]
  );

  const loadMarketersForAgency = useCallback(async (agencyId) => {
    const id = agencyId != null ? String(agencyId) : '';
    if (!id) return [];
    const res = await api.get('/api/agency/affiliates', {
      params: { agency_id: id, limit: 100 }
    });
    return res.data?.items || [];
  }, []);

  const refreshMarketersMap = useCallback(async () => {
    const next = {};
    for (const a of agencies || []) {
      const aid = String(a._id);
      try {
        next[aid] = await loadMarketersForAgency(aid);
      } catch {
        next[aid] = [];
      }
    }
    setMarketersByAgency(next);
  }, [agencies, loadMarketersForAgency]);

  useEffect(() => {
    if (!agencies?.length) {
      setSelectedAgencyId('');
      return;
    }
    const valid = selectedAgencyId && agencies.some((a) => String(a._id) === String(selectedAgencyId));
    if (!valid) setSelectedAgencyId(String(agencies[0]._id));
  }, [agencies, selectedAgencyId]);

  useEffect(() => {
    if (agencies?.length) refreshMarketersMap();
  }, [agencies, refreshMarketersMap]);

  useEffect(() => {
    if (!selectedAgencyId) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await loadMarketersForAgency(selectedAgencyId);
        if (!cancelled) {
          setMarketersByAgency((prev) => ({ ...prev, [String(selectedAgencyId)]: list }));
        }
      } catch (e) {
        if (!cancelled) toast.error(formatApiError(e, 'Could not load marketers'));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAgencyId, loadMarketersForAgency]);

  const teamForSelected = useMemo(() => {
    if (!selectedAgency) return EMPTY_TEAM;
    const t = marketersByAgency[String(selectedAgency._id)];
    return Array.isArray(t) ? t : EMPTY_TEAM;
  }, [selectedAgency, marketersByAgency]);

  const { heads, byParent } = useMemo(() => groupTeam(teamForSelected), [teamForSelected]);

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

  const headReferralPreview = useMemo(
    () => previewAutoReferralCode(headForm.first_name),
    [headForm.first_name]
  );
  const subReferralPreview = useMemo(
    () => previewAutoReferralCode(subForm.first_name),
    [subForm.first_name]
  );

  const patchAgencyPrograms = async (nextPrograms) => {
    const errs = validateProgramRows(nextPrograms);
    if (errs.length) {
      toast.error(errs[0]);
      return false;
    }
    setSavingPrograms(true);
    try {
      await api.patch(`/api/events/${eventId}/commission-config`, {
        agency_programs: mapProgramsForApi(nextPrograms)
      });
      setConfig((prev) => ({ ...prev, agency_programs: mapProgramsFromApi(nextPrograms) }));
      toast.success('Partner commission rates saved for this event');
      await onRefresh();
      return true;
    } catch (e) {
      toast.error(formatCommissionApiError(e, 'Could not save agency programs'));
      return false;
    } finally {
      setSavingPrograms(false);
    }
  };

  const onCreateAgencyWithProgram = async (e) => {
    e.preventDefault();
    const errs = validateProgramRows([
      {
        agency_id: 'x',
        ...newProgramPct
      }
    ]);
    if (errs.length) {
      toast.error(errs[0]);
      return;
    }
    if (!agencyForm.agency_name.trim() || !agencyForm.agency_email.trim()) {
      toast.error('Agency name and email are required');
      return;
    }
    if (!agencyForm.payout_paypal_email.trim()) {
      toast.error('Payout PayPal email is required to activate the partner');
      return;
    }
    setCreatingAgency(true);
    try {
      const res = await api.post('/api/organizer/marketing-agencies', {
        agency_name: agencyForm.agency_name.trim(),
        agency_email: agencyForm.agency_email.trim().toLowerCase(),
        contact_person: agencyForm.contact_person.trim() || undefined,
        phone: agencyForm.phone.trim() || undefined,
        payout_paypal_email: agencyForm.payout_paypal_email.trim().toLowerCase()
      });
      const ag = res.data?.agency;
      if (!ag?._id) throw new Error('No agency returned');
      const row = {
        agency_id: String(ag._id),
        pool_pct_of_ticket: Number(newProgramPct.pool_pct_of_ticket) || 0,
        sub_seller_pct_of_ticket: Number(newProgramPct.sub_seller_pct_of_ticket) || 0,
        head_pct_of_ticket: Number(newProgramPct.head_pct_of_ticket) || 0
      };
      const nextPrograms = [...(config.agency_programs || []), row];
      await api.patch(`/api/events/${eventId}/commission-config`, {
        agency_programs: mapProgramsForApi(nextPrograms)
      });
      toast.success(`Partner "${agencyForm.agency_name.trim()}" added with commission split for this event`);
      setAgencyForm({
        agency_name: '',
        agency_email: '',
        contact_person: '',
        phone: '',
        payout_paypal_email: ''
      });
      setNewProgramPct({
        pool_pct_of_ticket: 40,
        sub_seller_pct_of_ticket: 20,
        head_pct_of_ticket: 20
      });
      await onRefresh();
      setSelectedAgencyId(String(ag._id));
    } catch (err) {
      toast.error(formatApiError(err, 'Could not register partner'));
    } finally {
      setCreatingAgency(false);
    }
  };

  const onAddExistingToEvent = async (e) => {
    e.preventDefault();
    if (!addExistingAgencyId) {
      toast.error('Select a partner');
      return;
    }
    const errs = validateProgramRows([
      {
        agency_id: addExistingAgencyId,
        ...addExistingPct
      }
    ]);
    if (errs.length) {
      toast.error(errs[0]);
      return;
    }
    const row = {
      agency_id: String(addExistingAgencyId),
      pool_pct_of_ticket: Number(addExistingPct.pool_pct_of_ticket) || 0,
      sub_seller_pct_of_ticket: Number(addExistingPct.sub_seller_pct_of_ticket) || 0,
      head_pct_of_ticket: Number(addExistingPct.head_pct_of_ticket) || 0
    };
    const nextPrograms = [...(config.agency_programs || []), row];
    const ok = await patchAgencyPrograms(nextPrograms);
    if (ok) {
      setAddExistingAgencyId('');
      setAddExistingPct({
        pool_pct_of_ticket: 40,
        sub_seller_pct_of_ticket: 20,
        head_pct_of_ticket: 20
      });
    }
  };

  const updateProgramRow = (idx, field, value) => {
    setConfig((prev) => {
      const next = [...(prev.agency_programs || [])];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, agency_programs: next };
    });
  };

  const removeProgramRow = async (idx) => {
    const next = (config.agency_programs || []).filter((_, i) => i !== idx);
    await patchAgencyPrograms(next);
  };

  const saveProgramEdits = async () => {
    await patchAgencyPrograms(config.agency_programs || []);
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
      await api.post('/api/agency/affiliates', {
        agency_id: String(selectedAgency._id),
        first_name: headForm.first_name.trim(),
        last_name: headForm.last_name.trim(),
        email: headForm.email.trim().toLowerCase(),
        status: 'active'
      });
      toast.success('Head marketer added');
      setHeadForm({ first_name: '', last_name: '', email: '' });
      await refreshMarketersMap();
      await onRefresh();
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
      await api.post('/api/agency/affiliates', {
        agency_id: String(selectedAgency._id),
        parent_affiliate_id: subForm.parent_affiliate_id,
        first_name: subForm.first_name.trim(),
        last_name: subForm.last_name.trim(),
        email: subForm.email.trim().toLowerCase(),
        status: 'active'
      });
      toast.success('Sub-affiliate added');
      setSubForm({
        parent_affiliate_id: '',
        first_name: '',
        last_name: '',
        email: ''
      });
      await refreshMarketersMap();
      await onRefresh();
    } catch (err) {
      toast.error(formatApiError(err, 'Could not add sub-affiliate'));
    } finally {
      setCreatingSub(false);
    }
  };

  const agencyLabel = (id) => {
    const a = agencies.find((x) => String(x._id) === String(id));
    return a?.agency_name || a?.agency_email || 'Partner';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Step 1 · Marketing partners</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
            Register a partner and set <strong>this event&apos;s</strong> pool and head/sub split. Then add head
            marketers and subs so each person can get a referral link in Step 3.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToIndependents}
          className="shrink-0 px-4 py-2.5 rounded-xl border-2 border-violet-500 text-violet-700 dark:text-violet-300 text-sm font-medium hover:bg-violet-50 dark:hover:bg-violet-950/40"
        >
          Only using individuals? → Independent marketers
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div id="register-marketing-agency" className={`${glass} p-5 sm:p-6 scroll-mt-24`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-violet-600" />
            New partner for this event
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Creates the partner and attaches commission % for <strong>this event only</strong>.
          </p>
          <form onSubmit={onCreateAgencyWithProgram} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Pool % of ticket *</label>
                <input
                  type="number"
                  required
                  value={newProgramPct.pool_pct_of_ticket}
                  onChange={(e) =>
                    setNewProgramPct({ ...newProgramPct, pool_pct_of_ticket: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Sub % *</label>
                <input
                  type="number"
                  required
                  value={newProgramPct.sub_seller_pct_of_ticket}
                  onChange={(e) =>
                    setNewProgramPct({
                      ...newProgramPct,
                      sub_seller_pct_of_ticket: Number(e.target.value)
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Head % *</label>
                <input
                  type="number"
                  required
                  value={newProgramPct.head_pct_of_ticket}
                  onChange={(e) =>
                    setNewProgramPct({ ...newProgramPct, head_pct_of_ticket: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-sm"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">Sub + head must equal pool.</p>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Partner name *</label>
              <input
                required
                value={agencyForm.agency_name}
                onChange={(e) => setAgencyForm({ ...agencyForm, agency_name: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Business email *</label>
              <input
                required
                type="email"
                value={agencyForm.agency_email}
                onChange={(e) => setAgencyForm({ ...agencyForm, agency_email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <input
                value={agencyForm.contact_person}
                onChange={(e) => setAgencyForm({ ...agencyForm, contact_person: e.target.value })}
                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50"
                placeholder="Contact person"
              />
              <input
                value={agencyForm.phone}
                onChange={(e) => setAgencyForm({ ...agencyForm, phone: e.target.value })}
                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50"
                placeholder="Phone"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 block mb-1">Payout PayPal email *</label>
              <input
                required
                type="email"
                value={agencyForm.payout_paypal_email}
                onChange={(e) => setAgencyForm({ ...agencyForm, payout_paypal_email: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50"
              />
            </div>
            <button
              type="submit"
              disabled={creatingAgency}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#4f0f69] text-white font-medium hover:bg-[#6b1a8a] disabled:opacity-50"
            >
              {creatingAgency ? 'Saving…' : 'Add partner & save rates'}
            </button>
          </form>
        </div>

        <div className={`${glass} p-5 sm:p-6`}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Add existing partner to this event</h3>
          <p className="text-sm text-gray-500 mb-4">
            Partner already in your account but not yet on this event&apos;s commission list.
          </p>
          {agenciesNotOnEvent.length === 0 ? (
            <p className="text-sm text-gray-500">All partners are already on this event, or none exist yet.</p>
          ) : (
            <form onSubmit={onAddExistingToEvent} className="space-y-3">
              <select
                required
                value={addExistingAgencyId}
                onChange={(e) => setAddExistingAgencyId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-sm"
              >
                <option value="">Select partner…</option>
                {agenciesNotOnEvent.map((a) => (
                  <option key={a._id} value={String(a._id)}>
                    {a.agency_name || a.agency_email}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={addExistingPct.pool_pct_of_ticket}
                  onChange={(e) =>
                    setAddExistingPct({ ...addExistingPct, pool_pct_of_ticket: Number(e.target.value) })
                  }
                  className="px-2 py-2 rounded-lg border text-sm"
                  placeholder="Pool"
                />
                <input
                  type="number"
                  value={addExistingPct.sub_seller_pct_of_ticket}
                  onChange={(e) =>
                    setAddExistingPct({
                      ...addExistingPct,
                      sub_seller_pct_of_ticket: Number(e.target.value)
                    })
                  }
                  className="px-2 py-2 rounded-lg border text-sm"
                  placeholder="Sub"
                />
                <input
                  type="number"
                  value={addExistingPct.head_pct_of_ticket}
                  onChange={(e) =>
                    setAddExistingPct({ ...addExistingPct, head_pct_of_ticket: Number(e.target.value) })
                  }
                  className="px-2 py-2 rounded-lg border text-sm"
                  placeholder="Head"
                />
              </div>
              <button
                type="submit"
                disabled={savingPrograms}
                className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium disabled:opacity-50"
              >
                Add to this event
              </button>
            </form>
          )}
        </div>
      </div>

      <div className={`${glass} p-5 sm:p-6`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Partners on this event</h3>
        <p className="text-sm text-gray-500 mb-4">
          Edit pool / sub / head, then <strong>Save changes</strong>. Remove takes this partner off this event only
          (not your global roster).
        </p>
        {(config.agency_programs || []).length === 0 ? (
          <p className="text-sm text-gray-500">No agency partners on this event yet.</p>
        ) : (
          <div className="space-y-4">
            {(config.agency_programs || []).map((p, idx) => (
              <div
                key={`${p.agency_id}-${idx}`}
                className="rounded-xl border border-gray-200/80 dark:border-white/10 p-4 bg-white/40 dark:bg-gray-950/20"
              >
                <div className="font-medium text-gray-900 dark:text-white mb-2">{agencyLabel(p.agency_id)}</div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Agency</label>
                    <select
                      value={p.agency_id || ''}
                      onChange={(e) => updateProgramRow(idx, 'agency_id', e.target.value)}
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
                    <label className="text-xs text-gray-500 block mb-1">Pool %</label>
                    <input
                      type="number"
                      value={p.pool_pct_of_ticket}
                      onChange={(e) =>
                        updateProgramRow(idx, 'pool_pct_of_ticket', Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Sub %</label>
                    <input
                      type="number"
                      value={p.sub_seller_pct_of_ticket}
                      onChange={(e) =>
                        updateProgramRow(idx, 'sub_seller_pct_of_ticket', Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Head %</label>
                    <input
                      type="number"
                      value={p.head_pct_of_ticket}
                      onChange={(e) =>
                        updateProgramRow(idx, 'head_pct_of_ticket', Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-lg border text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => removeProgramRow(idx)}
                    disabled={savingPrograms}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Remove from this event
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={saveProgramEdits}
              disabled={savingPrograms}
              className="px-5 py-2.5 rounded-xl bg-[#4f0f69] text-white text-sm font-medium disabled:opacity-50"
            >
              {savingPrograms ? 'Saving…' : 'Save partner rate changes'}
            </button>
          </div>
        )}
      </div>

      <div className={`${glass} p-5 sm:p-6 flex flex-col min-h-[200px]`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-600" />
          Your partners (select for team)
        </h3>
        {!agencies?.length ? (
          <p className="text-sm text-gray-500">Register a partner above first.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {agencies.map((a) => {
              const active = String(a._id) === String(selectedAgencyId);
              return (
                <li key={a._id}>
                  <button
                    type="button"
                    onClick={() => setSelectedAgencyId(String(a._id))}
                    className={`w-full text-left rounded-xl px-4 py-3 flex items-center justify-between gap-2 ${
                      active
                        ? 'bg-violet-100 dark:bg-violet-900/35 border border-violet-200 dark:border-violet-800'
                        : 'bg-gray-50/80 dark:bg-white/5 border border-transparent hover:border-gray-200'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{a.agency_name}</p>
                      <p className="text-xs text-gray-500">{a.agency_email}</p>
                    </div>
                    {a.status === 'active' && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active
                      </span>
                    )}
                    <ChevronRight className={`w-4 h-4 ${active ? 'text-violet-600' : 'text-gray-400'}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {agencies?.length > 0 && selectedAgency && (
        <>
          <div className={`${glass} p-5 sm:p-6`}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-violet-600" />
              Team for {selectedAgency.agency_name}
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-semibold mb-3">Add head marketer</h4>
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
                  <input
                    readOnly
                    tabIndex={-1}
                    value={headForm.first_name.trim() ? headReferralPreview : ''}
                    placeholder="Referral code preview"
                    className={readOnlyCodeFieldClass}
                  />
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
                <h4 className="text-sm font-semibold mb-3">Add sub-affiliate</h4>
                <form onSubmit={onCreateSub} className="space-y-3">
                  <select
                    required
                    value={subForm.parent_affiliate_id}
                    onChange={(e) => setSubForm({ ...subForm, parent_affiliate_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-white/15 bg-white dark:bg-gray-900/50 text-sm"
                  >
                    <option value="">Select head *</option>
                    {heads.map((h) => (
                      <option key={String(h._id)} value={String(h._id)}>
                        {h.first_name} {h.last_name} {h.referral_code ? `· ${h.referral_code}` : ''}
                      </option>
                    ))}
                  </select>
                  {heads.length === 0 && (
                    <p className="text-xs text-amber-600">Add a head marketer first.</p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      required
                      placeholder="First name *"
                      value={subForm.first_name}
                      onChange={(e) => setSubForm({ ...subForm, first_name: e.target.value })}
                      className="px-3 py-2 rounded-xl border text-sm"
                    />
                    <input
                      required
                      placeholder="Last name *"
                      value={subForm.last_name}
                      onChange={(e) => setSubForm({ ...subForm, last_name: e.target.value })}
                      className="px-3 py-2 rounded-xl border text-sm"
                    />
                  </div>
                  <input
                    required
                    type="email"
                    placeholder="Email *"
                    value={subForm.email}
                    onChange={(e) => setSubForm({ ...subForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-sm"
                  />
                  <input
                    readOnly
                    tabIndex={-1}
                    value={subForm.first_name.trim() ? subReferralPreview : ''}
                    className={readOnlyCodeFieldClass}
                  />
                  <button
                    type="submit"
                    disabled={creatingSub || heads.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-violet-700 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {creatingSub ? 'Adding…' : 'Add sub-affiliate'}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className={`${glass} p-5 sm:p-6`}>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Roster</h3>
            {teamForSelected.length === 0 ? (
              <p className="text-sm text-gray-500 mt-2">No marketers yet for this partner.</p>
            ) : (
              <div className="space-y-6 mt-4">
                {heads.map((head) => {
                  const subs = byParent[String(head._id)] || [];
                  return (
                    <div
                      key={head._id}
                      className="rounded-xl border border-gray-200/80 dark:border-white/10 overflow-hidden"
                    >
                      <div className="bg-violet-50/80 dark:bg-violet-950/30 px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {head.first_name} {head.last_name}
                          <span className="ml-2 text-xs text-violet-700 dark:text-violet-300">
                            Head · {head.referral_code}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">{head.email}</p>
                      </div>
                      {subs.length > 0 ? (
                        <ul className="divide-y divide-gray-100 dark:divide-white/5">
                          {subs.map((s) => (
                            <li key={s._id} className="px-4 py-3 text-sm">
                              <span className="text-gray-900 dark:text-white">
                                {s.first_name} {s.last_name}
                              </span>
                              <span className="ml-2 text-xs text-gray-500">Sub · {s.referral_code}</span>
                              <p className="text-xs text-gray-500">{s.email}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="px-4 py-3 text-xs text-gray-500">No subs under this head yet.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Next:{' '}
        <Link
          to={`/organizer/events/${eventId}/marketing?tab=links`}
          className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
        >
          Step 3 · Generate links
        </Link>
        .
      </p>
    </div>
  );
}
