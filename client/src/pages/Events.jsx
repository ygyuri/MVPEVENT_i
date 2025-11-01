import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  fetchEvents,
  fetchCategories,
  fetchFeaturedEvents,
} from "../store/slices/eventsSlice";
import EventCard from "../components/EventCard";
import EventSearch from "../components/EventSearch";
import Pagination from "../components/Pagination";
import FeaturedEventsMasonry from "../components/FeaturedEventsMasonry";
import { useInView } from "react-intersection-observer";

const shallowEqual = (a, b) => {
  const ak = Object.keys(a || {});
  const bk = Object.keys(b || {});
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
};

const Events = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { events, categories, loading, error, meta } = useSelector(
    (state) => state.events
  );

  const [searchParams, setSearchParams] = useState({
    page: 1,
    pageSize: 12,
    sort: "soonest",
  });

  const didInitRef = useRef(false);
  const lastDispatchedParamsRef = useRef(null);
  const abortControllerRef = useRef(null);
  const isLoadingMore = useRef(false);
  const { ref, inView } = useInView({ rootMargin: "200px" });

  const headerSubtitle = useMemo(() => {
    const total = meta?.total ?? 0;
    return total > 0
      ? `${total} events found`
      : "Discover experiences around you";
  }, [meta?.total]);

  // Navigation handler for event cards - go directly to checkout
  const handleEventView = useCallback(
    (slug) => {
      navigate(`/events/${slug}/checkout`);
    },
    [navigate]
  );

  // Favorite handler (placeholder for future implementation)
  const handleEventFavorite = useCallback((eventId) => {
    // TODO: Implement favorite functionality
  }, []);

  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    dispatch(fetchCategories());
    dispatch(fetchFeaturedEvents({ page: 1, pageSize: 50 }));
    // initial load
    void loadEvents({ page: 1 });
    return () => abortControllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (inView && !loading && meta?.hasMore && !isLoadingMore.current) {
      void loadMoreEvents();
    }
  }, [inView, loading, meta?.hasMore]);

  const dispatchIfChanged = useCallback(
    async (params, signal) => {
      if (shallowEqual(params, lastDispatchedParamsRef.current)) return;
      lastDispatchedParamsRef.current = params;
      await dispatch(fetchEvents({ ...params, signal })).unwrap();
    },
    [dispatch]
  );

  const loadEvents = useCallback(
    async (newParams = {}) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const params = { ...searchParams, ...newParams, page: 1 };
      setSearchParams(params);

      try {
        await dispatchIfChanged(params, controller.signal);
      } catch (_err) {}
    },
    [dispatchIfChanged]
  );

  const loadMoreEvents = useCallback(async () => {
    if (isLoadingMore.current) return;
    isLoadingMore.current = true;

    const nextPage = (searchParams.page || 1) + 1;
    const params = { ...searchParams, page: nextPage };
    setSearchParams(params);

    try {
      await dispatchIfChanged(params);
    } catch (_err) {
    } finally {
      isLoadingMore.current = false;
    }
  }, [searchParams, dispatchIfChanged]);

  // Stable search handler that doesn't depend on changing state
  const handleSearch = useCallback(
    (q) => {
      const trimmed = (q || "").trim();
      if (trimmed.length === 0) {
        // Explicitly override previous q so it is removed from params and query
        void loadEvents({ q: "" });
        return;
      }
      void loadEvents({ q: trimmed });
    },
    [loadEvents]
  );

  // Stable filter handler that doesn't depend on changing state
  const handleFilter = useCallback(
    (filters) => {
      void loadEvents(filters);
    },
    [loadEvents]
  );

  return (
    <div className="relative min-h-screen bg-white dark:bg-gray-900">
      {/* Modern Hero Section - Content on top */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50/90 via-white/70 to-purple-50/90 dark:from-gray-900/90 dark:via-gray-800/70 dark:to-gray-900/90 backdrop-blur-md">
        {/* Featured Events Masonry Background - Only in Hero Section */}
        <FeaturedEventsMasonry />
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 dark:bg-blue-800/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob" />
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 dark:bg-purple-800/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-200 dark:bg-pink-800/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000" />
        </div>

        <div className="container-modern relative z-30 pointer-events-none">
          <div className="py-12 md:py-16 lg:py-20 pointer-events-none">
            {/* Hero Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center max-w-4xl mx-auto mb-10 md:mb-12 pointer-events-none"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 rounded-full mb-6 md:mb-8"
              >
                <span className="text-sm md:text-base font-semibold text-blue-700 dark:text-blue-300">
                  🎉 Discover Amazing Events
                </span>
              </motion.div>

              {/* Main Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4 md:mb-6"
              >
                <span className="text-web3-primary dark:text-white">
                  Explore Event-i
                </span>
                <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Events
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-base md:text-lg lg:text-xl text-web3-secondary dark:text-gray-400 max-w-2xl mx-auto leading-relaxed"
              >
                {headerSubtitle}
              </motion.p>
            </motion.div>

            {/* Search Component */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="max-w-5xl mx-auto pointer-events-auto"
            >
              <EventSearch
                onSearch={handleSearch}
                onFilter={handleFilter}
                categories={categories}
              />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="section-modern relative z-10">
        <div className="container-modern">
          {error && !events.length && (
            <div className="min-h-[30vh] flex items-center justify-center">
              <div className="text-center">
                <div className="text-error-primary text-6xl mb-3">⚠️</div>
                <h2 className="text-xl md:text-2xl font-semibold text-web3-primary mb-2">
                  We couldn't load events
                </h2>
                <p className="text-web3-secondary mb-4">
                  Please try again or adjust your filters.
                </p>
                <button
                  onClick={() => loadEvents({})}
                  className="btn-web3-primary px-6 py-2 rounded-xl"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {events.length > 0 ? (
            <div className="grid-modern">
              {events.map((event, idx) => (
                <EventCard
                  key={event.id || idx}
                  event={event}
                  index={idx % 9}
                  onFavorite={handleEventFavorite}
                  onView={handleEventView}
                />
              ))}
            </div>
          ) : !loading && !error ? (
            <div className="min-h-[30vh] flex items-center justify-center">
              <div className="text-center">
                <div className="text-web3-secondary text-6xl mb-3">🔍</div>
                <h3 className="text-xl font-semibold text-web3-primary mb-2">
                  No events found
                </h3>
                <p className="text-web3-secondary">
                  Try different keywords or remove some filters.
                </p>
              </div>
            </div>
          ) : null}

          {/* Intelligent Pagination */}
          {events.length > 0 && meta?.totalPages > 1 && (
            <Pagination
              currentPage={meta.page || 1}
              totalPages={meta.totalPages || 1}
              onPageChange={(page) => loadEvents({ page })}
              loading={loading}
            />
          )}

          {/* Keep infinite scroll as fallback for mobile */}
          {meta?.hasMore && !meta?.totalPages && (
            <div ref={ref} className="mt-10 flex items-center justify-center">
              <div className="flex items-center space-x-2 text-gray-600">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-400" />
                </span>
                <span>Loading more events…</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Events;
