import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Megaphone, Users, Percent, Link2, FileText } from 'lucide-react';
import api from '../utils/api';
import {
  mapProgramsFromApi,
  defaultCommissionConfig,
  formatCommissionApiError
} from '../utils/commissionConfigHelpers';
import MarketingPartnersStep from '../components/organizer/promote/MarketingPartnersStep';
import IndependentMarketersStep from '../components/organizer/promote/IndependentMarketersStep';
import AffiliateLinksStep from '../components/organizer/promote/AffiliateLinksStep';
import RulesStep from '../components/organizer/promote/RulesStep';

const glass =
  'rounded-2xl border border-gray-200/70 dark:border-white/10 bg-white/50 dark:bg-gray-900/30 backdrop-blur-md shadow-sm';

const TABS = [
  { id: 'partners', label: 'Step 1 · Partners', icon: Users },
  { id: 'independents', label: 'Step 2 · Independents', icon: Percent },
  { id: 'links', label: 'Step 3 · Links', icon: Link2 },
  { id: 'rules', label: 'Step 4 · Rules', icon: FileText }
];

export default function OrganizerEventMarketingHub() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab = TABS.some((t) => t.id === tabParam) ? tabParam : 'partners';

  useEffect(() => {
    if (!tabParam || !TABS.some((t) => t.id === tabParam)) {
      setSearchParams({ tab: 'partners' }, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  const setTab = (id) => {
    setSearchParams({ tab: id }, { replace: true });
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(() => defaultCommissionConfig());
  const [eventCommissionRate, setEventCommissionRate] = useState(6);
  const [eventTitle, setEventTitle] = useState('');
  const [agencies, setAgencies] = useState([]);
  const [soloMarketers, setSoloMarketers] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
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
        setConfig(defaultCommissionConfig());
      }
      setAgencies(agRes.data?.items || agRes.data?.payouts || []);
      setSoloMarketers(soloRes.data?.items || []);
    } catch (e) {
      if (e.response?.status === 404 && e.response?.data?.error === 'EVENT_NOT_FOUND') {
        toast.error('Event not found');
      } else {
        toast.error(formatCommissionApiError(e, 'Failed to load'));
      }
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

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
      affiliate: Number(affiliate.toFixed(2)),
      headExtra: Number(headExtra.toFixed(2)),
      tier2: Number(tier2.toFixed(2)),
      net: Number(net.toFixed(2)),
      netPct: Number(((net / mockPrice) * 100).toFixed(2))
    };
  }, [config, eventCommissionRate]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => navigate(`/organizer/events/${eventId}`)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-[#4f0f69] dark:hover:text-violet-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to event
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="w-8 h-8 text-violet-600" />
            Marketing &amp; affiliates
          </h1>
          {eventTitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{eventTitle}</p>}
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Work through the steps: partners (or independents), then links, then optional referral rules. Platform fee % is
        set by admin on the event.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeTab === id
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
        {activeTab === 'partners' && (
          <MarketingPartnersStep
            eventId={eventId}
            config={config}
            setConfig={setConfig}
            agencies={agencies}
            onRefresh={load}
            onGoToIndependents={() => setTab('independents')}
          />
        )}
        {activeTab === 'independents' && (
          <IndependentMarketersStep
            eventId={eventId}
            config={config}
            setConfig={setConfig}
            soloMarketers={soloMarketers}
            onRefresh={load}
            saving={saving}
            setSaving={setSaving}
          />
        )}
        {activeTab === 'links' && <AffiliateLinksStep eventId={eventId} />}
        {activeTab === 'rules' && (
          <RulesStep
            eventId={eventId}
            config={config}
            setConfig={setConfig}
            saving={saving}
            setSaving={setSaving}
          />
        )}
      </div>

      <div className={`${glass} p-5 sm:p-6`}>
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Quick preview ($100 ticket)</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Example only. Uses event commission {eventCommissionRate}% when enabled.
        </p>
        <pre className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap bg-black/5 dark:bg-white/5 rounded-xl p-4">
          {`Ticket: $${mockPrice.toFixed(2)}
├ Platform / event fee (${config.use_event_commission_for_waterfall ? `${eventCommissionRate}%` : 'advanced'}): -$${preview.platform_fee.toFixed(2)}
└ Organizer revenue: $${preview.organizer_revenue.toFixed(2)}
   ├ Sub / independent marketer: -$${preview.affiliate.toFixed(2)}
   ${preview.headExtra > 0 ? `├ Head (agency pool): -$${preview.headExtra.toFixed(2)}\n   ` : ''}${config.enable_multi_tier && preview.tier2 > 0 ? `├ Upline: -$${preview.tier2.toFixed(2)}\n   ` : ''}└ Your net: $${preview.net.toFixed(2)} (${preview.netPct}%)`}
        </pre>
        <p className="text-xs text-gray-500 mt-2">
          Event platform fee % is configured by an admin on the event record.
        </p>
      </div>
    </div>
  );
}
