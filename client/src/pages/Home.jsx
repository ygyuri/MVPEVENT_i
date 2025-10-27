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
      <section className="hero-modern relative">
        <div className="container-modern">
          <div className="text-center-modern">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-4xl md:text-6xl font-extrabold text-web3-primary tracking-tight"
            >
              Discover. Collect. Experience.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="mt-4 text-lg md:text-xl text-web3-secondary"
            >
              A modern web3 way to explore events you love so much — curated
              feeds, real-time trends, and more.
            </motion.p>
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
