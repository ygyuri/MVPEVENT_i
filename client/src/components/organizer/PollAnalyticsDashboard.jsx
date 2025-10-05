import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Download, TrendingUp, Users, Target } from 'lucide-react';
import { fetchPolls, fetchResults } from '../../store/slices/pollsSlice';
import { pollApi } from '../../services/api/pollApi';

const PollAnalyticsDashboard = ({ eventId }) => {
  const dispatch = useDispatch();
  const { polls, activePolls, pollResults, loading } = useSelector(state => state.polls);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    if (!eventId) return;
    dispatch(fetchPolls({ eventId, status: 'active' }));
  }, [dispatch, eventId]);

  // Ensure results are fetched for visible polls
  useEffect(() => {
    activePolls.forEach((pollId) => {
      if (!pollResults[pollId]) {
        dispatch(fetchResults({ pollId }));
      }
    });
  }, [activePolls, pollResults, dispatch]);

  const analytics = useMemo(() => {
    const resultsArray = activePolls
      .map(id => pollResults[id])
      .filter(Boolean);

    const totalPolls = activePolls.length;
    const totalVotes = resultsArray.reduce((sum, r) => sum + (r.analytics?.total_votes || 0), 0);
    const avgParticipation = totalPolls > 0
      ? resultsArray.reduce((sum, r) => sum + (r.analytics?.participation_rate || 0), 0) / totalPolls
      : 0;

    return { totalPolls, totalVotes, avgParticipation };
  }, [activePolls, pollResults]);

  const exportResults = async (pollId, format = 'csv') => {
    try {
      setExporting(pollId);
      const blob = await pollApi.exportResults(pollId, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `poll-${pollId}-results.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  if (loading?.polls && activePolls.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-600 dark:text-gray-300">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AnalyticsCard
          title="Total Polls"
          value={analytics.totalPolls}
          icon={<Target className="w-8 h-8" />}
          accent="purple"
        />
        <AnalyticsCard
          title="Total Votes"
          value={analytics.totalVotes}
          icon={<Users className="w-8 h-8" />}
          accent="indigo"
        />
        <AnalyticsCard
          title="Avg Participation"
          value={`${analytics.avgParticipation.toFixed(1)}%`}
          icon={<TrendingUp className="w-8 h-8" />}
          accent="purple"
        />
      </div>

      {/* Individual Poll Results */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Poll Results</h3>
        {activePolls.map(pollId => {
          const poll = polls[pollId];
          const results = pollResults[pollId];
          if (!poll || !results) return null;

          const data = Object.entries(results.results || {}).map(([id, d]) => ({
            id,
            name: d.label,
            votes: d.vote_count,
            percentage: d.percentage
          }));

          return (
            <div key={pollId} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div>
                  <h4 className="font-semibold text-lg text-gray-900 dark:text-white">{poll.question}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {results.analytics?.total_votes || 0} votes • {(results.analytics?.participation_rate || 0).toFixed(1)}% participation
                  </p>
                </div>
                <button
                  onClick={() => exportResults(pollId)}
                  disabled={exporting === pollId}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {exporting === pollId ? 'Exporting...' : 'Export'}
                </button>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RBarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip contentStyle={{ background: '#111827', color: '#F9FAFB', border: '1px solid #374151' }} />
                    <Bar dataKey="votes" fill="#9333ea" />
                  </RBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
        {activePolls.length === 0 && (
          <div className="text-center text-gray-600 dark:text-gray-300 py-8">No polls yet.</div>
        )}
      </div>
    </div>
  );
};

const AnalyticsCard = ({ title, value, icon, accent }) => {
  const accentClasses = useMemo(() => {
    switch (accent) {
      case 'indigo':
        return {
          container: 'from-indigo-50 to-white border-indigo-100',
          icon: 'text-indigo-600'
        };
      case 'purple':
      default:
        return {
          container: 'from-purple-50 to-white border-purple-100',
          icon: 'text-purple-600'
        };
    }
  }, [accent]);

  return (
    <div className={`bg-gradient-to-br ${accentClasses.container} p-6 rounded-xl shadow-sm border dark:bg-gray-800 dark:border-gray-700`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
        <div className={`${accentClasses.icon}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default PollAnalyticsDashboard;
