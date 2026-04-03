import React from "react";
import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { cn } from "../utils/cn";

export default function TicketCard({ ticket, onOpen, className }) {
  const statusColor =
    ticket.status === "used"
      ? "bg-red-500/10 text-red-600 dark:text-red-400"
      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 md:p-5 transition",
        "border-gray-200 bg-white shadow-sm hover:shadow-md",
        "dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-md dark:shadow-none dark:hover:bg-white/10",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium px-2 py-1 rounded-full capitalize inline-flex items-center gap-2 bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white/70">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              ticket.status === "used" ? "bg-red-500 dark:bg-red-400" : "bg-emerald-500 dark:bg-emerald-400"
            )}
          />
          {ticket.status}
        </div>
        <div className={cn("text-xs px-2 py-1 rounded-full", statusColor)}>
          {ticket.ticketType}
        </div>
      </div>
      <div className="mt-4">
        <div className="text-gray-900 dark:text-white/90 font-semibold">
          {ticket.event?.title || "Event"}
        </div>
        <div className="text-gray-600 dark:text-white/60 text-sm">
          {new Date(ticket.event?.startDate).toLocaleString()}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-gray-600 dark:text-white/70 text-sm">
          Holder:{" "}
          {ticket.holder?.name ||
            `${ticket.holder?.firstName || ""} ${
              ticket.holder?.lastName || ""
            }`.trim()}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {ticket.event?.id && ticket.orderPaid && ticket.status === "active" && (
            <Link
              to={`/events/${ticket.event.id}/polls`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-gray-300 text-gray-800 hover:bg-gray-50 dark:border-white/20 dark:text-white/90 dark:hover:bg-white/10 transition"
            >
              <BarChart3 className="w-4 h-4" />
              Polls
            </Link>
          )}
          <button
            onClick={onOpen}
            className="px-3 py-2 text-sm rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow hover:opacity-90 disabled:opacity-40"
            disabled={
              ticket.status !== "active" ||
              !ticket.orderPaid ||
              !ticket.qrAvailable
            }
          >
            {ticket.status === "active" && ticket.orderPaid && ticket.qrAvailable
              ? "Show QR"
              : ticket.status !== "active"
              ? "Used"
              : !ticket.orderPaid
              ? "Payment Pending"
              : "QR Not Available"}
          </button>
        </div>
      </div>
    </div>
  );
}
