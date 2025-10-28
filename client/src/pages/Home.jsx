import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import {
  fetchFeaturedEvents,
  fetchTrendingEvents,
  fetchSuggestedEvents,
} from "../store/slices/eventsSlice";
import EventCard from "../components/EventCard";
import ViewMoreButton from "../components/common/ViewMoreButton";

const EmptyList = ({ loading, text }) => {
  if (loading) {
    return (
      <div className="min-h-[20vh] grid place-items-center">
        <div className="flex items-center space-x-2 text-web3-secondary">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-web3-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-web3-accent" />
          </span>
          <span>Loading…</span>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-[20vh] grid place-items-center">
      <p className="text-web3-secondary">{text}</p>
    </div>
  );
};

const Home = () => {
  const dispatch = useDispatch();
  const {
    featuredEvents,
    trendingEvents,
    suggestedEvents,
    loading,
    featuredMeta,
    suggestedMeta,
  } = useSelector((state) => state.events);
  const didFetchRef = useRef(false);
  const [featuredPage, setFeaturedPage] = useState(1);
  const [suggestedPage, setSuggestedPage] = useState(1);

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    dispatch(fetchFeaturedEvents({ page: 1, pageSize: 12 }));
    dispatch(fetchTrendingEvents());
    dispatch(fetchSuggestedEvents({ page: 1, pageSize: 12 }));
  }, [dispatch]);

  const loadMoreFeatured = () => {
    const nextPage = featuredPage + 1;
    setFeaturedPage(nextPage);
    dispatch(fetchFeaturedEvents({ page: nextPage, pageSize: 12 }));
  };

  const loadMoreSuggested = () => {
    const nextPage = suggestedPage + 1;
    setSuggestedPage(nextPage);
    dispatch(fetchSuggestedEvents({ page: nextPage, pageSize: 12 }));
  };

  return (
    <div className="relative">
      {/* Hero */}
      <section className="hero-modern relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900" />

        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-40 h-40 sm:w-56 sm:h-56 lg:w-72 lg:h-72 bg-blue-200 dark:bg-blue-800/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob" />
        <div className="absolute top-40 right-10 w-40 h-40 sm:w-56 sm:h-56 lg:w-72 lg:h-72 bg-purple-200 dark:bg-purple-800/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-1/2 w-40 h-40 sm:w-56 sm:h-56 lg:w-72 lg:h-72 bg-pink-200 dark:bg-pink-800/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000" />

        <div className="container-modern relative z-10">
          <div className="text-center-modern py-12 sm:py-16 md:py-20 lg:py-32 px-4">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full mb-4 sm:mb-6 md:mb-8"
            >
              <span className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300">
                ✨ The event platform for the modern age
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-web3-primary tracking-tight mb-4 sm:mb-5 md:mb-6"
            >
              The Modern Way to
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Manage Events
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="text-base sm:text-lg md:text-xl lg:text-2xl text-web3-secondary leading-relaxed max-w-3xl mx-auto mb-6 sm:mb-8 md:mb-12 px-2"
            >
              Effortless event management for organizers. Seamless discovery for
              attendees.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex flex-nowrap justify-start sm:justify-center items-center gap-3 sm:gap-4 md:gap-6 mb-8 sm:mb-10 md:mb-12 overflow-x-auto pb-2 scrollbar-hide"
            >
              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 bg-white dark:bg-gray-800 rounded-full shadow-md hover:shadow-lg transition-shadow whitespace-nowrap flex-shrink-0">
                <span className="text-base sm:text-lg md:text-xl lg:text-2xl text-green-500">✓</span>
                <span className="text-xs sm:text-sm font-medium text-web3-primary">
                  <span className="hidden sm:inline">Interactive polls & feedback</span>
                  <span className="sm:hidden">Interactive polls</span>
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 bg-white dark:bg-gray-800 rounded-full shadow-md hover:shadow-lg transition-shadow whitespace-nowrap flex-shrink-0">
                <span className="text-base sm:text-lg md:text-xl lg:text-2xl text-green-500">✓</span>
                <span className="text-xs sm:text-sm font-medium text-web3-primary">
                  <span className="hidden sm:inline">Easy fund access</span>
                  <span className="sm:hidden">Easy access</span>
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3 bg-white dark:bg-gray-800 rounded-full shadow-md hover:shadow-lg transition-shadow whitespace-nowrap flex-shrink-0">
                <span className="text-base sm:text-lg md:text-xl lg:text-2xl text-green-500">✓</span>
                <span className="text-xs sm:text-sm font-medium text-web3-primary">
                  <span className="hidden sm:inline">Affordable pricing</span>
                  <span className="sm:hidden">Affordable</span>
                </span>
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Sections */}
      <section className="section-modern relative">
        <div className="container-modern space-y-12">
          {/* Featured */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-web3-primary">
                Recently Published
              </h2>
            </div>
            {featuredEvents?.length ? (
              <>
                <div className="grid-modern">
                  {featuredEvents.map((e, idx) => (
                    <EventCard key={e.id || idx} event={e} index={idx % 9} />
                  ))}
                </div>
                <ViewMoreButton
                  onClick={loadMoreFeatured}
                  isLoading={loading}
                  hasMore={featuredMeta?.hasMore}
                  text="Load More Events"
                />
              </>
            ) : (
              <EmptyList loading={loading} text="No recent events right now" />
            )}
          </div>

          {/* Trending */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-web3-primary">
                Trending Now
              </h2>
            </div>
            {trendingEvents?.length ? (
              <div className="grid-modern">
                {trendingEvents.map((e, idx) => (
                  <EventCard key={e.id || idx} event={e} index={idx % 9} />
                ))}
              </div>
            ) : (
              <EmptyList
                loading={loading}
                text="No trending events right now"
              />
            )}
          </div>

          {/* Suggested */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-web3-primary">
                Suggested For You
              </h2>
            </div>
            {suggestedEvents?.length ? (
              <>
                <div className="grid-modern">
                  {suggestedEvents.map((e, idx) => (
                    <EventCard key={e.id || idx} event={e} index={idx % 9} />
                  ))}
                </div>
                <ViewMoreButton
                  onClick={loadMoreSuggested}
                  isLoading={loading}
                  hasMore={suggestedMeta?.hasMore}
                  text="Load More Suggestions"
                />
              </>
            ) : (
              <EmptyList
                loading={loading}
                text="Sign up to get personalized event suggestions"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
