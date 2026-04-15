import React, { useEffect, useMemo, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Edit,
  Play,
  Pause,
  X,
  Trash2,
  BarChart3,
  FileDown,
  Link2,
  Percent
} from 'lucide-react';
import api from '../utils/api';
import EnhancedButton from '../components/EnhancedButton';
import EventStatusBadge from '../components/organizer/EventStatusBadge';
import LoadingOverlay from '../components/shared/LoadingOverlay';
import analyticsAPI from '../utils/analyticsAPI';
import {
  getEventDetails,
  publishEvent,
  unpublishEvent,
  cancelEvent,
  deleteEvent,
  clearCurrentEvent
} from '../store/slices/organizerSlice';
import { dateUtils } from '../utils/eventHelpers';

function agencyDisplayName(agencies, agencyId) {
  if (agencyId == null || String(agencyId).trim() === '') return null;
  const a = (agencies || []).find((x) => String(x._id) === String(agencyId));
  return a?.agency_name || a?.agency_email || null;
}

function sampleTicketUnitPrice(ev) {
  if (!ev?.pricing || ev.pricing.isFree) return null;
  const main = Number(ev.pricing.price);
  if (main > 0) return main;
  const tt = (ev.pricing.ticketTypes || []).find(
    (t) => !t.isFree && Number(t.price) > 0
  );
  return tt ? Number(tt.price) : null;
}

function formatMoney(currencyCode, amount) {
  const c = currencyCode || 'KES';
  return `${c} ${Math.round(amount || 0).toLocaleString()}`;
}

const OrganizerEventPreview = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { eventId } = useParams();

  const [finance, setFinance] = useState(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState(null);
  const [salesPdfLoading, setSalesPdfLoading] = useState(false);
  const [affiliatePerf, setAffiliatePerf] = useState(null);
  const [affiliatePerfLoading, setAffiliatePerfLoading] = useState(false);
  const [commissionBundle, setCommissionBundle] = useState(null);
  const [commissionBundleLoading, setCommissionBundleLoading] = useState(false);

  const { currentEvent, loading, error } = useSelector((state) => state.organizer);

  useEffect(() => {
    if (!eventId) return;

    dispatch(getEventDetails(eventId));

    return () => {
      dispatch(clearCurrentEvent());
    };
  }, [dispatch, eventId]);

  useEffect(() => {
    let cancelled = false;
    if (!eventId) return;

    (async () => {
      try {
        setFinanceLoading(true);
        setFinanceError(null);
        const response = await analyticsAPI.getEventFinance(eventId);
        if (cancelled) return;
        setFinance(response.data?.data || null);
      } catch (err) {
        if (cancelled) return;
        setFinanceError(err?.response?.data?.error || 'Failed to load finance');
      } finally {
        if (!cancelled) setFinanceLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    if (!eventId) return;
    (async () => {
      try {
        setAffiliatePerfLoading(true);
        const res = await api.get(`/api/organizer/events/${eventId}/affiliate-performance`);
        if (!cancelled) setAffiliatePerf(res.data?.data || null);
      } catch {
        if (!cancelled) setAffiliatePerf(null);
      } finally {
        if (!cancelled) setAffiliatePerfLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    let cancelled = false;
    if (!eventId) return;
    (async () => {
      try {
        setCommissionBundleLoading(true);
        const [cfgRes, agRes, soloRes] = await Promise.all([
          api.get(`/api/events/${eventId}/commission-config`),
          api.get('/api/organizer/marketing-agencies'),
          api.get('/api/organizer/independent-marketers').catch(() => ({ data: { items: [] } }))
        ]);
        if (cancelled) return;
        setCommissionBundle({
          config: cfgRes.data?.config || null,
          event_commission_rate: cfgRes.data?.event_commission_rate ?? null,
          agencies: agRes.data?.items || agRes.data?.payouts || [],
          soloMarketers: soloRes.data?.items || []
        });
      } catch {
        if (!cancelled) setCommissionBundle(null);
      } finally {
        if (!cancelled) setCommissionBundleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const event = useMemo(() => {
    if (!currentEvent) return null;
    if (currentEvent._id === eventId) return currentEvent;
    return currentEvent;
  }, [currentEvent, eventId]);

  const commissionSummary = useMemo(() => {
    if (!commissionBundle) return null;
    const cfg = commissionBundle.config || {};
    const cur = event?.pricing?.currency || 'KES';
    const sample = sampleTicketUnitPrice(event);
    const useSample = sample != null && sample > 0;
    const exampleUnit = useSample ? sample : 100;
    const platformPct =
      cfg.use_event_commission_for_waterfall !== false &&
      commissionBundle?.event_commission_rate != null
        ? Number(commissionBundle.event_commission_rate)
        : cfg.platform_fee_type === 'percentage'
          ? Number(cfg.platform_fee_percentage) || 0
          : null;

    const agenciesList = commissionBundle?.agencies || [];

    const programs = (cfg.agency_programs || [])
      .filter((p) => p.agency_id)
      .map((p) => {
        const pool = Number(p.pool_pct_of_ticket) || 0;
        const sub = Number(p.sub_seller_pct_of_ticket) || 0;
        const head = Number(p.head_pct_of_ticket) || 0;
        return {
          agencyId: String(p.agency_id),
          agencyLabel:
            agencyDisplayName(agenciesList, p.agency_id) || 'Marketing partner',
          pool,
          sub,
          head,
          examplePool: (exampleUnit * pool) / 100,
          exampleSub: (exampleUnit * sub) / 100,
          exampleHead: (exampleUnit * head) / 100
        };
      });

    const soloById = new Map(
      (commissionBundle?.soloMarketers || []).map((m) => [String(m._id), m])
    );
    const independents = (cfg.independent_marketer_rates || [])
      .filter((r) => r.affiliate_id)
      .map((r) => {
        const id = String(r.affiliate_id);
        const m = soloById.get(id);
        const pct = Number(r.pct_of_ticket) || 0;
        return {
          affiliateId: id,
          name: m
            ? `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.email
            : 'Independent marketer',
          code: m?.referral_code || '—',
          pct,
          example: (exampleUnit * pct) / 100
        };
      });

    const hasStructure = programs.length > 0 || independents.length > 0;
    const legacyFlat =
      !hasStructure &&
      cfg.flat_affiliate_pct_of_ticket != null &&
      Number(cfg.flat_affiliate_pct_of_ticket) > 0;

    return {
      cur,
      sample,
      useSample,
      exampleUnit,
      platformPct,
      programs,
      independents,
      hasStructure,
      legacyFlat: legacyFlat ? Number(cfg.flat_affiliate_pct_of_ticket) : null,
      legacyFlatExample: legacyFlat
        ? (exampleUnit * Number(cfg.flat_affiliate_pct_of_ticket)) / 100
        : null
    };
  }, [commissionBundle, event]);

  const handleDownloadSalesReportPdf = useCallback(async () => {
    if (!eventId) return;
    try {
      setSalesPdfLoading(true);
      const res = await analyticsAPI.downloadEventSalesReportPdf(eventId);
      const ct = (res.headers['content-type'] || '').toLowerCase();
      if (!ct.includes('application/pdf')) {
        let msg = 'Could not download report';
        if (res.data instanceof Blob) {
          const text = await res.data.text();
          try {
            const j = JSON.parse(text);
            if (j.error) msg = j.error;
          } catch {
            /* ignore */
          }
        }
        toast.error(msg);
        return;
      }
      const blob =
        res.data instanceof Blob
          ? res.data
          : new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers['content-disposition'] || '';
      let fname = 'sales-report.pdf';
      const m = cd.match(/filename="?([^";\n]+)"?/i);
      if (m) fname = m[1];
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Sales report downloaded');
    } catch (err) {
      const raw =
        err?.response?.data?.error || err?.message || 'Failed to download report';
      toast.error(typeof raw === 'string' ? raw : 'Failed to download report');
    } finally {
      setSalesPdfLoading(false);
    }
  }, [eventId]);

  const handleAction = useCallback(
    async (action) => {
      if (!eventId) return;

      try {
        switch (action) {
          case 'edit':
            navigate(`/organizer/events/${eventId}/edit`);
            return;

          case 'publish':
            await dispatch(publishEvent(eventId)).unwrap();
            toast.success('Event published successfully!');
            return;

          case 'unpublish':
            if (!window.confirm('Are you sure you want to unpublish this event?')) return;
            await dispatch(unpublishEvent(eventId)).unwrap();
            toast.success('Event unpublished successfully!');
            return;

          case 'cancel':
            if (!window.confirm('Are you sure you want to cancel this event?')) return;
            await dispatch(cancelEvent(eventId)).unwrap();
            toast.success('Event cancelled successfully!');
            return;

          case 'delete':
            if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
            await dispatch(deleteEvent(eventId)).unwrap();
            toast.success('Event deleted successfully!');
            navigate('/organizer/events');
            return;

          default:
            return;
        }
      } catch (err) {
        toast.error(err?.message || 'Action failed');
      }
    },
    [dispatch, eventId, navigate]
  );

  if (loading?.currentEvent) {
    return (
      <div className="container-modern">
        <LoadingOverlay show={true} label="Loading event preview..." />
        <div className="min-h-[60vh]" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container-modern">
        <div className="max-w-2xl mx-auto py-10">
          <button
            onClick={() => navigate('/organizer/events')}
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Event Management
          </button>

          <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <h1 className="text-lg font-semibold text-red-800 dark:text-red-200">Event not found</h1>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error || 'The event could not be loaded.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-modern">
      <div className="py-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            onClick={() => navigate('/organizer/events')}
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <EnhancedButton
              variant="secondary"
              size="sm"
              icon={BarChart3}
              onClick={() => navigate(`/events/${eventId}/polls`)}
            >
              Polls
            </EnhancedButton>
            <EnhancedButton
              variant="secondary"
              size="sm"
              icon={Percent}
              onClick={() => navigate(`/organizer/events/${eventId}/marketing`)}
            >
              Marketing &amp; affiliates
            </EnhancedButton>
            <EnhancedButton
              variant="secondary"
              size="sm"
              icon={Link2}
              onClick={() => navigate(`/organizer/events/${eventId}/marketing?tab=links`)}
            >
              Affiliate links
            </EnhancedButton>
            <EnhancedButton
              variant="secondary"
              size="sm"
              icon={Edit}
              onClick={() => handleAction('edit')}
            >
              Edit
            </EnhancedButton>

            {event.status === 'draft' && (
              <EnhancedButton
                variant="primary"
                size="sm"
                icon={Play}
                onClick={() => handleAction('publish')}
              >
                Publish
              </EnhancedButton>
            )}

            {event.status === 'published' && (
              <>
                <EnhancedButton
                  variant="secondary"
                  size="sm"
                  icon={Pause}
                  onClick={() => handleAction('unpublish')}
                >
                  Unpublish
                </EnhancedButton>
                <EnhancedButton
                  variant="secondary"
                  size="sm"
                  icon={X}
                  onClick={() => handleAction('cancel')}
                >
                  Cancel
                </EnhancedButton>
              </>
            )}

            {(event.status === 'draft' || event.status === 'cancelled') && (
              <EnhancedButton
                variant="error"
                size="sm"
                icon={Trash2}
                onClick={() => handleAction('delete')}
              >
                Delete
              </EnhancedButton>
            )}
          </div>
        </div>

        <div className="bg-web3-card rounded-xl border border-gray-200/30 dark:border-gray-700/30 overflow-hidden">
          {event.media?.images?.[0] && (
            <div className="h-56 md:h-72 w-full overflow-hidden">
              <img
                src={event.media.images[0]}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
                    {event.title}
                  </h1>
                  <EventStatusBadge status={event.status} size="small" />
                </div>

                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed line-clamp-3">
                  {event.shortDescription || event.description}
                </p>
              </div>

              <div className="shrink-0">
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200/60 dark:border-gray-700/60">
                  <DollarSign className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {event.pricing && !event.pricing.isFree
                      ? `${event.pricing.currency} ${event.pricing.price}`
                      : 'Free'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/40 dark:bg-gray-900/20 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Revenue (This Event)
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadSalesReportPdf}
                    disabled={salesPdfLoading || !eventId}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-60"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    {salesPdfLoading ? 'Preparing…' : 'Sales report (PDF)'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!eventId) return;
                      try {
                        setFinanceLoading(true);
                        setFinanceError(null);
                        const response = await analyticsAPI.getEventFinance(eventId);
                        setFinance(response.data?.data || null);
                      } catch (err) {
                        setFinanceError(err?.response?.data?.error || 'Failed to load finance');
                      } finally {
                        setFinanceLoading(false);
                      }
                    }}
                    className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                    disabled={financeLoading}
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="relative mt-3">
                {financeLoading && <LoadingOverlay show={true} label="Loading revenue..." />}

                {financeError && !financeLoading && (
                  <div className="text-sm text-red-700 dark:text-red-300">
                    {financeError}
                  </div>
                )}

                {!financeError && !financeLoading && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-white/50 dark:bg-gray-900/30 p-3">
                      <div className="text-[11px] text-gray-600 dark:text-gray-400">Tickets sold</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{finance?.ticketsSold || 0}</div>
                    </div>
                    <div className="rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-white/50 dark:bg-gray-900/30 p-3">
                      <div className="text-[11px] text-gray-600 dark:text-gray-400">Net to you</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {event?.pricing?.currency || 'KES'} {Math.round(finance?.netToOrganizer || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-white/50 dark:bg-gray-900/30 p-3">
                      <div className="text-[11px] text-gray-600 dark:text-gray-400">Commission ({Number(finance?.commissionRate ?? 6)}%)</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {event?.pricing?.currency || 'KES'} {Math.round(finance?.commissionFees || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-violet-200/70 dark:border-violet-900/40 bg-violet-50/30 dark:bg-violet-950/20 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Affiliate payout structure (from commission config)
                </h2>
                <Link
                  to={`/organizer/events/${eventId}/marketing`}
                  className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
                >
                  Edit in marketing hub
                </Link>
              </div>
              {commissionBundleLoading && (
                <p className="text-xs text-gray-500">Loading commission settings…</p>
              )}
              {!commissionBundleLoading && !commissionBundle && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Commission settings could not be loaded. Open{' '}
                  <Link
                    to={`/organizer/events/${eventId}/marketing`}
                    className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
                  >
                    Affiliate &amp; commissions
                  </Link>{' '}
                  to configure agency programs and independent marketers.
                </p>
              )}
              {!commissionBundleLoading && commissionSummary && (
                <>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Percentages are <strong>of each ticket</strong> (before your net). Example amounts use{' '}
                    {commissionSummary.useSample ? (
                      <>
                        your listed ticket price{' '}
                        <strong>
                          {commissionSummary.cur} {commissionSummary.sample?.toLocaleString()}
                        </strong>
                      </>
                    ) : (
                      <>
                        a <strong>{commissionSummary.cur} 100</strong> placeholder (set a ticket price for accurate
                        examples)
                      </>
                    )}
                    {commissionSummary.platformPct != null && (
                      <> · platform / event fee {commissionSummary.platformPct}% applied first in live checkout math</>
                    )}
                    .
                  </p>
                  {!commissionSummary.hasStructure && !commissionSummary.legacyFlat && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No agency program or independent marketer rates on this event yet. Add them under{' '}
                      <Link
                        to={`/organizer/events/${eventId}/marketing`}
                        className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
                      >
                        Marketing hub
                      </Link>
                      .
                    </p>
                  )}
                  {commissionSummary.legacyFlat != null && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      <strong>Legacy flat referrer:</strong> {commissionSummary.legacyFlat}% of ticket (~
                      {formatMoney(commissionSummary.cur, commissionSummary.legacyFlatExample)} per ticket at the
                      example price).
                    </p>
                  )}
                  {commissionSummary.programs.length > 0 && (
                    <div className="space-y-3 mb-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Agency programs
                      </h3>
                      {commissionSummary.programs.map((p) => (
                        <div
                          key={p.agencyId}
                          className="rounded-lg border border-gray-200/70 dark:border-gray-600/60 bg-white/50 dark:bg-gray-900/30 p-3 text-sm"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">{p.agencyLabel}</div>
                          <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300 text-xs sm:text-sm">
                            <li>
                              <strong>Pool</strong> {p.pool}% of ticket (~
                              {formatMoney(commissionSummary.cur, p.examplePool)} per ticket)
                            </li>
                            <li>
                              <strong>Sub</strong> (marketer who shared the link): {p.sub}% (~
                              {formatMoney(commissionSummary.cur, p.exampleSub)})
                            </li>
                            <li>
                              <strong>Head</strong> (team lead): {p.head}% (~
                              {formatMoney(commissionSummary.cur, p.exampleHead)})
                            </li>
                            <li className="text-gray-500 dark:text-gray-400 pt-1">
                              If the head sells directly (no sub under them), they receive the{' '}
                              <strong>full pool</strong> ({p.pool}%, ~
                              {formatMoney(commissionSummary.cur, p.examplePool)}).
                            </li>
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                  {commissionSummary.independents.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Independent marketers
                      </h3>
                      <ul className="space-y-2">
                        {commissionSummary.independents.map((row) => (
                          <li
                            key={row.affiliateId}
                            className="rounded-lg border border-gray-200/70 dark:border-gray-600/60 bg-white/50 dark:bg-gray-900/30 px-3 py-2 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                          >
                            <span className="text-gray-900 dark:text-white">
                              {row.name}{' '}
                              <span className="font-mono text-xs text-violet-600 dark:text-violet-400">
                                {row.code}
                              </span>
                            </span>
                            <span className="text-gray-600 dark:text-gray-300">
                              <strong>{row.pct}%</strong> of ticket (~
                              {formatMoney(commissionSummary.cur, row.example)} per ticket)
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-6 rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/40 dark:bg-gray-900/20 backdrop-blur-sm p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Affiliate performance (paid orders)
                </h2>
                {affiliatePerf?.event_commission_rate != null && (
                  <span className="text-xs text-gray-500">
                    Event fee {affiliatePerf.event_commission_rate}% · estimates from your rules
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                One row per marketer / referral code from completed checkouts (
                <Link
                  to={`/organizer/events/${eventId}/marketing?tab=links`}
                  className="text-violet-600 dark:text-violet-400 hover:underline"
                >
                  manage links
                </Link>
                ).
              </p>
              {affiliatePerfLoading && (
                <p className="text-xs text-gray-500">Loading…</p>
              )}
              {!affiliatePerfLoading && (!affiliatePerf?.rows || affiliatePerf.rows.length === 0) && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No attributed paid orders yet. Share{' '}
                  <Link
                    to={`/organizer/events/${eventId}/marketing?tab=links`}
                    className="text-violet-600 dark:text-violet-400 font-medium hover:underline"
                  >
                    affiliate links
                  </Link>{' '}
                  or ask buyers to enter a referral code at checkout; results show here after payment completes.
                </p>
              )}
              {!affiliatePerfLoading && affiliatePerf?.rows?.length > 0 && (
                <div className="overflow-x-auto mt-2">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-200/60 dark:border-gray-600/60">
                        <th className="py-2 pr-2">Marketer</th>
                        <th className="py-2 pr-2">Code</th>
                        <th className="py-2 pr-2">Tickets</th>
                        <th className="py-2 pr-2">Attributed</th>
                        <th className="py-2 pr-2">Sub (est.)</th>
                        <th className="py-2 pr-2">Head (est.)</th>
                        <th className="py-2">Total (est.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {affiliatePerf.rows.map((row) => {
                        const subEst = row.estimated_sub_commission ?? 0;
                        const headEst = row.estimated_head_commission ?? 0;
                        const totalEst = row.estimated_commission_total ?? 0;
                        const isAgencySplit = headEst > 0;
                        const subDisplay = isAgencySplit ? subEst : totalEst;
                        return (
                        <tr
                          key={row.referral_code || row.affiliate_id}
                          className="border-b border-gray-100 dark:border-gray-700/50"
                        >
                          <td className="py-2 pr-2 text-gray-900 dark:text-white">
                            {row.marketer
                              ? `${row.marketer.first_name || ''} ${row.marketer.last_name || ''}`.trim()
                              : '—'}
                          </td>
                          <td className="py-2 pr-2 font-mono text-[11px]">{row.referral_code || '—'}</td>
                          <td className="py-2 pr-2">{row.tickets_sold}</td>
                          <td className="py-2 pr-2">
                            {event?.pricing?.currency || 'KES'}{' '}
                            {Math.round(row.gross_attributed || 0).toLocaleString()}
                          </td>
                          <td className="py-2 pr-2">
                            {event?.pricing?.currency || 'KES'}{' '}
                            {Math.round(subDisplay).toLocaleString()}
                          </td>
                          <td className="py-2 pr-2">
                            {event?.pricing?.currency || 'KES'}{' '}
                            {Math.round(headEst).toLocaleString()}
                          </td>
                          <td className="py-2">
                            {event?.pricing?.currency || 'KES'}{' '}
                            {Math.round(totalEst).toLocaleString()}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/40 dark:bg-gray-900/20 backdrop-blur-sm p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Date & Time
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {dateUtils.formatDate(event.dates?.startDate, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {`${dateUtils.formatDate(event.dates?.startDate, {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} – ${dateUtils.formatDate(event.dates?.endDate, {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}`}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/40 dark:bg-gray-900/20 backdrop-blur-sm p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  Location
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 truncate">
                  {event.location?.venueName || 'TBD'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {event.location?.city}
                  {event.location?.country ? `, ${event.location.country}` : ''}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200/60 dark:border-gray-700/60 bg-white/40 dark:bg-gray-900/20 backdrop-blur-sm p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  <Users className="w-4 h-4 text-gray-500" />
                  Capacity
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {event.attendees?.length || 0} / {event.capacity || '∞'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  attendees
                </div>
              </div>
            </div>

            {event.pricing?.ticketTypes?.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Ticket Types
                </h2>
                <div className="space-y-2">
                  {event.pricing.ticketTypes.map((t, idx) => (
                    <div
                      key={`${t.name || 'ticket'}-${idx}`}
                      className="flex items-center justify-between rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-white/40 dark:bg-gray-900/20 backdrop-blur-sm px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {t.name || 'Ticket'}
                        </div>
                        {t.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {t.description}
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {t.isFree || !t.price ? 'Free' : `${t.currency || event.pricing.currency} ${t.price}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizerEventPreview;
