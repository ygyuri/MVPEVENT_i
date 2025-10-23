import React from 'react';
import { cn } from '../utils/cn';

export default function TicketCard({ ticket, onOpen, className }) {
  const statusColor = ticket.status === 'used' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400';
  return (
    <div className={cn('rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 md:p-5 hover:bg-white/10 transition', className)}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium px-2 py-1 rounded-full capitalize inline-flex items-center gap-2 bg-white/10 text-white/70">
          <span className={cn('w-2 h-2 rounded-full', ticket.status === 'used' ? 'bg-red-400' : 'bg-emerald-400')} />
          {ticket.status}
        </div>
        <div className={cn('text-xs px-2 py-1 rounded-full', statusColor)}>
          {ticket.ticketType}
        </div>
      </div>
      <div className="mt-4">
        <div className="text-white/90 font-semibold">{ticket.event?.title || 'Event'}</div>
        <div className="text-white/60 text-sm">{new Date(ticket.event?.startDate).toLocaleString()}</div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="text-white/70 text-sm">Holder: {ticket.holder?.name || `${ticket.holder?.firstName || ''} ${ticket.holder?.lastName || ''}`.trim()}</div>
        <button onClick={onOpen} className="px-3 py-2 text-sm rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow hover:opacity-90 disabled:opacity-40" disabled={ticket.status !== 'active'}>
          {ticket.status === 'active' ? 'Show QR' : 'Used'}
        </button>
      </div>
    </div>
  );
}


