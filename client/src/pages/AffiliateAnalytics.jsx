import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

export default function AffiliateAnalytics() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [performance, setPerformance] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const o = await fetch('/api/affiliates/dashboard/overview', { credentials: 'include' });
        const p = await fetch('/api/affiliates/dashboard/performance', { credentials: 'include' });
        if (o.ok) {
          const data = await o.json();
          setOverview(data.data);
        }
        if (p.ok) {
          const data = await p.json();
          setPerformance(data.data?.time_buckets || []);
        }
      } catch (e) {
        toast.error('Failed to load affiliate analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 text-gray-700 dark:text-gray-300">Loading...</div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Affiliate Analytics</h1>
        </div>

        {overview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Stat label="Total Clicks" value={overview.summary.total_clicks} />
            <Stat label="Unique Visitors" value={overview.summary.unique_visitors} />
            <Stat label="Conversions" value={overview.summary.total_conversions} />
            <Stat label="Commission Earned" value={`$${(overview.summary.total_commission_earned || 0).toFixed(2)}`} />
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-medium mb-3 text-gray-900 dark:text-white">Performance (Last 30 Days)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 dark:text-gray-300">
                  <th className="py-2 pr-4">Day</th>
                  <th className="py-2 pr-4">Conversions</th>
                  <th className="py-2 pr-4">Earnings ($)</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((b, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">{b._id?.day}</td>
                    <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">{b.conversions || 0}</td>
                    <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">{(b.earnings || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {performance.length === 0 && (
                  <tr><td className="py-3 text-gray-500 dark:text-gray-400" colSpan={3}>No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}


