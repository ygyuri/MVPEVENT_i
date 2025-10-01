import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchReminders, selectPageData, setFilters, setPage, setPageSize, toggleSelect, clearSelection, selectAllOnPage, setSort, setReminderPreferences, deleteReminder } from '../store/slices/remindersSlice';

export default function ReminderHistory() {
  const dispatch = useDispatch();
  const user = useSelector(s => s.auth.user);
  const { items: pageItems, total, page, pageSize } = useSelector(selectPageData);
  const loading = useSelector(s => s.reminders.loading);
  const ui = useSelector(s => s.reminders);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    const userId = user?.id || user?._id;
    console.log('ReminderHistory: user =', user);
    console.log('ReminderHistory: userId =', userId);
    if (userId) {
      dispatch(fetchReminders(userId));
    }
  }, [user?.id, user?._id, dispatch]);

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const onBulkSelectPage = () => {
    const ids = pageItems.map(r => r.id || r._id);
    dispatch(selectAllOnPage(ids));
  };

  const selectedIds = useMemo(() => Object.keys(ui.selection).filter(k => ui.selection[k]), [ui.selection]);

  const onExportCsv = () => {
    const headers = ['id','event','scheduledTime','status','deliveryMethod'];
    const rows = pageItems.map(r => [r.id || r._id, r.eventId?.title || '', new Date(r.scheduledTime).toISOString(), r.status, r.deliveryMethod]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reminders.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const onExportJson = () => {
    const blob = new Blob([JSON.stringify(pageItems, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reminders.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status) => {
    const map = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      queued: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      sent: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    };
    return map[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Reminder History</h1>

      {/* Controls */}
      <div className="mb-4 grid grid-cols-1 sm:grid-cols-6 gap-3">
        <input
          className="sm:col-span-2 rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Search event"
          value={ui.filters.query}
          onChange={e => dispatch(setFilters({ query: e.target.value }))}
        />
        <select className="rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={ui.filters.status} onChange={e => dispatch(setFilters({ status: e.target.value }))}>
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="queued">Queued</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={ui.filters.method} onChange={e => dispatch(setFilters({ method: e.target.value }))}>
          <option value="all">All methods</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="both">Both</option>
        </select>
        <input type="date" className="rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={ui.filters.from || ''} onChange={e => dispatch(setFilters({ from: e.target.value }))} />
        <input type="date" className="rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value={ui.filters.to || ''} onChange={e => dispatch(setFilters({ to: e.target.value }))} />
        <div className="flex items-center gap-2">
          <button onClick={onExportCsv} className="px-3 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500">Export CSV</button>
          <button onClick={onExportJson} className="px-3 py-2 text-sm rounded-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">Export JSON</button>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="mb-3 flex items-center gap-2">
        <button onClick={onBulkSelectPage} className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">Select page</button>
        <button onClick={() => dispatch(clearSelection())} className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">Clear</button>
        <button disabled={selectedIds.length === 0} onClick={() => selectedIds.forEach(id => dispatch(deleteReminder(id)))} className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500">Cancel selected</button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {pageItems.map(r => (
          <div key={r.id || r._id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-white/70 dark:bg-gray-900/60">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={!!ui.selection[r.id || r._id]} onChange={() => dispatch(toggleSelect(r.id || r._id))} className="mt-1" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">{r.eventId?.title || 'Event'}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <span title={new Date(r.scheduledTime).toLocaleString()}>{new Date(r.scheduledTime).toLocaleString()}</span>
                    {r.timezone ? <span className="ml-1">({r.timezone})</span> : null}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs ${statusBadge(r.status)}`}>{r.status}</span>
                <select value={r.deliveryMethod} onChange={e => dispatch(setReminderPreferences({ id: r.id || r._id, deliveryMethod: e.target.value }))} className="text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="email">Email</option>
                  <option value="sms">SMS</option>
                  <option value="both">Both</option>
                </select>
                <button onClick={() => dispatch(deleteReminder(r.id || r._id))} className="text-xs px-2 py-1 rounded-md bg-red-600 text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500">Cancel</button>
                <button onClick={() => toggleExpand(r.id || r._id)} className="text-xs px-2 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500">{expanded[r.id || r._id] ? 'Hide' : 'Preview'}</button>
              </div>
            </div>
            {expanded[r.id || r._id] && (
              <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="mb-1 font-medium">Email subject:</div>
                <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">{r.payload?.subject || '(none)'}</div>
                <div className="mb-1 font-medium">Email HTML:</div>
                <div className="mb-3 text-xs text-gray-600 dark:text-gray-400">{r.payload?.html || '(none)'}</div>
                <div className="mb-1 font-medium">SMS text:</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{r.payload?.text || '(none)'}</div>
              </div>
            )}
          </div>
        ))}
        {pageItems.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400">No reminders found.</div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">{(total === 0) ? '0' : ((page - 1) * pageSize + 1)}–{Math.min(page * pageSize, total)} of {total}</div>
        <div className="flex items-center gap-2">
          <select className="text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500" value={pageSize} onChange={e => dispatch(setPageSize(parseInt(e.target.value)))}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
          <button disabled={page <= 1} onClick={() => dispatch(setPage(page - 1))} className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">Prev</button>
          <button disabled={page * pageSize >= total} onClick={() => dispatch(setPage(page + 1))} className="px-3 py-1.5 text-sm rounded-md bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-indigo-500">Next</button>
        </div>
      </div>
    </div>
  );
}




