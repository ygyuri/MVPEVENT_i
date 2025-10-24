import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Eye,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  ChevronDown,
  SortAsc,
  SortDesc,
  CheckSquare,
  Square,
} from "lucide-react";
import EventStatusBadge from "./EventStatusBadge";
import EventActions from "./EventActions";
import { dateUtils } from "../../utils/eventHelpers";

const EventList = ({
  events = [],
  loading = false,
  error = null,
  onEventAction,
  onEventSelect,
  onSelectAll,
  selectedEvents = [],
  sortBy = "createdAt",
  sortOrder = "desc",
  onSortChange,
}) => {
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // Handle event selection
  const handleEventSelect = useCallback(
    (eventId, selected) => {
      onEventSelect?.(eventId, selected);
    },
    [onEventSelect]
  );

  // Handle select all
  const handleSelectAll = useCallback(
    (selected) => {
      onSelectAll?.(selected);
    },
    [onSelectAll]
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (field) => {
      onSortChange?.(field);
    },
    [onSortChange]
  );

  // Handle event action
  const handleEventAction = useCallback(
    (action, eventId, eventData) => {
      onEventAction?.(action, eventId, eventData);
      setActionMenuOpen(null);
    },
    [onEventAction]
  );

  // Toggle event expansion
  const toggleExpanded = useCallback(
    (eventId) => {
      setExpandedEvent(expandedEvent === eventId ? null : eventId);
    },
    [expandedEvent]
  );

  // Toggle action menu
  const toggleActionMenu = useCallback(
    (eventId) => {
      setActionMenuOpen(actionMenuOpen === eventId ? null : eventId);
    },
    [actionMenuOpen]
  );

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="bg-web3-card rounded-xl p-6 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-700 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="w-20 h-8 bg-gray-300 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <div className="text-red-600 dark:text-red-400 mb-2">
          <svg
            className="w-12 h-12 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
          Failed to load events
        </h3>
        <p className="text-red-600 dark:text-red-400">
          {error.message ||
            "An error occurred while loading events. Please try again."}
        </p>
      </div>
    );
  }

  // Empty state
  if (events.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-12 text-center">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <Calendar className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No events found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Get started by creating your first event or adjust your filters to see
          more results.
        </p>
        <button
          onClick={() => onEventAction?.("create")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          Create Your First Event
        </button>
      </div>
    );
  }

  // Sort headers
  const sortHeaders = [
    { key: "title", label: "Event", sortable: true },
    { key: "startDate", label: "Date", sortable: true },
    { key: "location", label: "Location", sortable: false },
    { key: "capacity", label: "Capacity", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "actions", label: "Actions", sortable: false },
  ];

  return (
    <div className="space-y-4">
      {/* Table Header */}
      <div className="hidden lg:block bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 overflow-x-auto">
        <div className="grid grid-cols-12 gap-4 items-center">
          {/* Select All */}
          <div className="col-span-1">
            <button
              onClick={() =>
                handleSelectAll(selectedEvents.length !== events.length)
              }
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors duration-200"
            >
              {selectedEvents.length === events.length ? (
                <CheckSquare className="w-5 h-5 text-blue-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>

          {/* Sortable Headers */}
          {sortHeaders.map((header) => (
            <div
              key={header.key}
              className={`${
                header.key === "title" ? "col-span-3" : "col-span-2"
              }`}
            >
              <button
                onClick={() => header.sortable && handleSortChange(header.key)}
                className={`flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 ${
                  header.sortable
                    ? "hover:text-gray-900 dark:hover:text-white cursor-pointer"
                    : "cursor-default"
                }`}
              >
                {header.label}
                {header.sortable &&
                  sortBy === header.key &&
                  (sortOrder === "asc" ? (
                    <SortAsc className="w-4 h-4" />
                  ) : (
                    <SortDesc className="w-4 h-4" />
                  ))}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Event Cards */}
      <div className="space-y-4">
        {events.map((event) => (
          <motion.div
            key={event._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-web3-card rounded-none p-6 hover:bg-web3-card-hover transition-all duration-200 border border-gray-200/30 dark:border-gray-700/30"
          >
            {/* Mobile Layout */}
            <div className="lg:hidden">
              <div className="flex items-start gap-4">
                {/* Selection Checkbox */}
                <button
                  onClick={() =>
                    handleEventSelect(
                      event._id,
                      !selectedEvents.includes(event._id)
                    )
                  }
                  className="mt-1 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors duration-200"
                >
                  {selectedEvents.includes(event._id) ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {/* Event Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                      {event.title}
                    </h3>
                    <EventStatusBadge status={event.status} />
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                    {event.shortDescription || event.description}
                  </p>

                  {/* Event Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {dateUtils.formatDate(event.dates?.startDate, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">
                          {event.location.venueName}, {event.location.city}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>
                        {event.attendees?.length || 0} / {event.capacity || "∞"}{" "}
                        attendees
                      </span>
                    </div>

                    {event.pricing && !event.pricing.isFree && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <DollarSign className="w-4 h-4" />
                        <span>
                          {event.pricing.currency} {event.pricing.price}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <EventActions
                    event={event}
                    onAction={handleEventAction}
                    compact={true}
                  />
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Selection Checkbox */}
                <div className="col-span-1">
                  <button
                    onClick={() =>
                      handleEventSelect(
                        event._id,
                        !selectedEvents.includes(event._id)
                      )
                    }
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors duration-200"
                  >
                    {selectedEvents.includes(event._id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>

                {/* Event Title */}
                <div className="col-span-3 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                    {event.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-1">
                    {event.shortDescription || event.description}
                  </p>
                </div>

                {/* Event Date */}
                <div className="col-span-2 min-w-[10rem]">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {dateUtils.formatDate(event.dates?.startDate, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {`${dateUtils.formatDate(event.dates?.startDate, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} - ${dateUtils.formatDate(event.dates?.endDate, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`}
                  </div>
                </div>

                {/* Location */}
                <div className="col-span-2 min-w-[10rem]">
                  <div className="text-sm text-gray-900 dark:text-white truncate">
                    {event.location?.venueName || "TBD"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {event.location?.city}, {event.location?.country}
                  </div>
                </div>

                {/* Capacity */}
                <div className="col-span-2 min-w-[8rem]">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {event.attendees?.length || 0} / {event.capacity || "∞"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {event.pricing && !event.pricing.isFree
                      ? `${event.pricing.currency} ${event.pricing.price}`
                      : "Free"}
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-1 flex items-center">
                  <EventStatusBadge
                    status={event.status}
                    className="whitespace-nowrap"
                  />
                </div>

                {/* Actions */}
                <div className="col-span-1">
                  <EventActions
                    event={event}
                    onAction={handleEventAction}
                    compact={true}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default EventList;
