import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import { fetchFeaturedEvents, fetchTrendingEvents, fetchSuggestedEvents } from '../store/slices/eventsSlice'
import EventCard from '../components/EventCard'

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
    )
  }
  return (
    <div className="min-h-[20vh] grid place-items-center">
      <p className="text-web3-secondary">{text}</p>
    </div>
  )
}

const Home = () => {
  const dispatch = useDispatch()
  const { featuredEvents, trendingEvents, suggestedEvents, loading } = useSelector(state => state.events)
  const didFetchRef = useRef(false)

  useEffect(() => {
    if (didFetchRef.current) return
    didFetchRef.current = true
    dispatch(fetchFeaturedEvents())
    dispatch(fetchTrendingEvents())
    dispatch(fetchSuggestedEvents())
  }, [dispatch])

  return (
    <div className="relative">
      {/* Background Accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-blob-primary blur-3xl blob-glow" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blob-secondary blur-3xl blob-glow" />
      </div>

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
              The web3 way to explore events you love so much — curated feeds, real-time trends, and more.
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
              <h2 className="text-2xl md:text-3xl font-bold text-web3-primary">Featured</h2>
            </div>
            {featuredEvents?.length ? (
              <div className="grid-modern">
                {featuredEvents.map((e, idx) => (
                  <EventCard key={e.id || idx} event={e} index={idx % 9} />
                ))}
              </div>
            ) : (
              <EmptyList loading={loading} text="No featured events right now" />
            )}
          </div>

          {/* Trending */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-web3-primary">Trending Now</h2>
            </div>
            {trendingEvents?.length ? (
              <div className="grid-modern">
                {trendingEvents.map((e, idx) => (
                  <EventCard key={e.id || idx} event={e} index={idx % 9} />
                ))}
              </div>
            ) : (
              <EmptyList loading={loading} text="No trending events right now" />
            )}
          </div>

          {/* Suggested */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-web3-primary">Suggested For You</h2>
            </div>
            {suggestedEvents?.length ? (
              <div className="grid-modern">
                {suggestedEvents.map((e, idx) => (
                  <EventCard key={e.id || idx} event={e} index={idx % 9} />
                ))}
              </div>
            ) : (
              <EmptyList loading={loading} text="No suggestions yet" />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home 