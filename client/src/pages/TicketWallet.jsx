import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyTickets, issueTicketQr, setTicketsStatusFilter } from '../store/slices/ticketsSlice';
import TicketCard from '../components/TicketCard';
import QRModal from '../components/QRModal';

export default function TicketWallet() {
  const dispatch = useDispatch();
  const { list, pagination, loadingList, listError, qrByTicketId, issuingQr, statusFilter } = useSelector(s => s.tickets);
  const [openFor, setOpenFor] = useState(null);

  useEffect(() => {
    dispatch(fetchMyTickets({ page: pagination.page, limit: pagination.limit }));
  }, [dispatch]);

  const currentQr = openFor ? qrByTicketId[openFor] : null;
  const onIssue = () => dispatch(issueTicketQr({ ticketId: openFor, rotate: false }));
  const onRotate = () => dispatch(issueTicketQr({ ticketId: openFor, rotate: true }));

  const filtered = list.filter(t => statusFilter === 'all' ? true : t.status === statusFilter);

  const goPage = (p) => dispatch(fetchMyTickets({ page: Math.max(1, Math.min(p, pagination.pages)), limit: pagination.limit }));

  const errorMsg = listError?.code || listError?.error || (listError ? 'Failed to load' : null);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-white">My Tickets</h1>
        <select value={statusFilter} onChange={e => dispatch(setTicketsStatusFilter(e.target.value))} className="bg-white/10 text-white rounded-xl px-3 py-2 text-sm">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="used">Used</option>
        </select>
      </div>
      {loadingList && <div className="mt-6 text-white/70">Loading…</div>}
      {errorMsg && <div className="mt-6 text-red-400">{errorMsg}</div>}
      <div className="mt-6 grid gap-4">
        {filtered.map(t => (
          <TicketCard key={t.id} ticket={t} onOpen={() => setOpenFor(t.id)} />
        ))}
        {!loadingList && filtered.length === 0 && (
          <div className="text-white/60">No tickets to show.</div>
        )}
      </div>
      <div className="mt-6 flex items-center justify-center gap-2 text-white/60 text-sm">
        <button className="px-3 py-1 rounded-lg bg-white/10" onClick={() => goPage(pagination.page - 1)} disabled={pagination.page <= 1}>Prev</button>
        <div>Page {pagination.page} of {pagination.pages}</div>
        <button className="px-3 py-1 rounded-lg bg-white/10" onClick={() => goPage(pagination.page + 1)} disabled={pagination.page >= pagination.pages}>Next</button>
      </div>

      <QRModal
        isOpen={!!openFor}
        onClose={() => setOpenFor(null)}
        ticketId={openFor}
        onIssue={onIssue}
        qrData={currentQr}
        issuing={issuingQr[openFor || '']}
        error={null}
        onRotate={onRotate}
      />
    </div>
  );
}


