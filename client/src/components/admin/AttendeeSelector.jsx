import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { Calendar, Users, RefreshCw, ChevronDown } from "lucide-react";
import api from "../../utils/api";
import {
  fetchAttendees,
  setEventId,
  toggleSelectAll,
  toggleAttendee,
} from "../../store/slices/bulkEmailSlice";

const AttendeeSelector = () => {
  const dispatch = useDispatch();
  const {
    eventId,
    attendees,
    pagination,
    selectedAttendeeIds,
    loadingAttendees,
    error,
  } = useSelector((state) => state.bulkEmail);

  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      setEventsLoading(true);
      try {
        const res = await api.get("/api/admin/events?limit=200");
        if (res.data?.success && res.data.data?.events) {
          setEvents(res.data.data.events);
        }
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setEventsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (eventId) {
      dispatch(fetchAttendees({ eventId, page, limit: pagination.limit }));
    }
  }, [eventId, page, dispatch, pagination.limit]);

  const currentEvent = events.find((e) => e._id === eventId);
  const selectedSet = new Set(selectedAttendeeIds);
  const pageIds = attendees.map((a) => a._id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedSet.has(id));

  const handleSelectAll = () => {
    dispatch(toggleSelectAll(pageIds));
  };

  const handleEventSelect = (id) => {
    dispatch(setEventId(id));
    setEventDropdownOpen(false);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Event
          </label>
          <button
            type="button"
            onClick={() => setEventDropdownOpen(!eventDropdownOpen)}
            className="flex items-center gap-2 w-full sm:w-72 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
          >
            <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
            <span className="truncate">
              {currentEvent ? currentEvent.title : "Select an event"}
            </span>
            <ChevronDown
              className={`h-4 w-4 ml-auto flex-shrink-0 transition-transform ${eventDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>
          {eventDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full sm:w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
              {eventsLoading ? (
                <div className="p-3 text-sm text-gray-500">Loading events...</div>
              ) : events.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">No events found</div>
              ) : (
                events.map((ev) => (
                  <button
                    key={ev._id}
                    type="button"
                    onClick={() => handleEventSelect(ev._id)}
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${eventId === ev._id ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "text-gray-900 dark:text-gray-200"}`}
                  >
                    {ev.title}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        {eventId && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Users className="h-4 w-4" />
            <span>
              Selected {selectedAttendeeIds.length} of {pagination.total} attendees
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!eventId && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Select an event to list attendees</p>
        </div>
      )}

      {eventId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden"
        >
          <div className="overflow-x-auto">
            {loadingAttendees ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
              </div>
            ) : attendees.length === 0 ? (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                No attendees found for this event
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/80">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Ticket type
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800/50">
                  {attendees.map((a) => (
                    <tr
                      key={a._id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedSet.has(a._id)}
                          onChange={() => dispatch(toggleAttendee(a._id))}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {a.holder?.email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {[a.holder?.firstName, a.holder?.lastName].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {a.ticketType ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1 || loadingAttendees}
                  className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={pagination.page >= pagination.pages || loadingAttendees}
                  className="px-3 py-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default AttendeeSelector;
