import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { fetchEvents, fetchCategories } from '../store/slices/eventsSlice'
import EventCard from '../components/EventCard'
import EventSearch from '../components/EventSearch'
import { useInView } from 'react-intersection-observer'

const shallowEqual = (a, b) => {
  const ak = Object.keys(a || {})
  const bk = Object.keys(b || {})
  if (ak.length !== bk.length) return false
  for (const k of ak) {
    if (a[k] !== b[k]) return false
  }
  return true
}

const Events = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { events, categories, loading, error, meta } = useSelector(state => state.events)
  
  // Debug: Log events data
  useEffect(() => {
    console.log('Events page - events data:', events)
    console.log('Events page - events count:', events?.length)
  }, [events])

  const [searchParams, setSearchParams] = useState({
    page: 1,
    pageSize: 12,
    sort: 'soonest'
  })

  const didInitRef = useRef(false)
  const lastDispatchedParamsRef = useRef(null)
  const abortControllerRef = useRef(null)
  const isLoadingMore = useRef(false)
  const { ref, inView } = useInView({ rootMargin: '200px' })

  const headerSubtitle = useMemo(() => {
    const total = meta?.total ?? 0
    return total > 0 ? `${total} events found` : 'Discover experiences around you'
  }, [meta?.total])

  // Navigation handler for event cards
  const handleEventView = useCallback((slug) => {
    console.log('EventCard clicked, navigating to:', slug)
    navigate(`/events/${slug}`)
  }, [navigate])

  // Favorite handler (placeholder for future implementation)
  const handleEventFavorite = useCallback((eventId) => {
    // TODO: Implement favorite functionality
    console.log('Favorite event:', eventId)
  }, [])

  useEffect(() => {
    if (didInitRef.current) return
    didInitRef.current = true
    dispatch(fetchCategories())
    // initial load
    void loadEvents({ page: 1 })
    return () => abortControllerRef.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (inView && !loading && meta?.hasMore && !isLoadingMore.current) {
      void loadMoreEvents()
    }
  }, [inView, loading, meta?.hasMore])

  const dispatchIfChanged = useCallback(async (params, signal) => {
    if (shallowEqual(params, lastDispatchedParamsRef.current)) return
    lastDispatchedParamsRef.current = params
    await dispatch(fetchEvents({ ...params, signal })).unwrap()
  }, [dispatch])

  const loadEvents = useCallback(async (newParams = {}) => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    const params = { ...searchParams, ...newParams, page: 1 }
    setSearchParams(params)

    try {
      await dispatchIfChanged(params, controller.signal)
    } catch (_err) {}
  }, [dispatchIfChanged])

  const loadMoreEvents = useCallback(async () => {
    if (isLoadingMore.current) return
    isLoadingMore.current = true

    const nextPage = (searchParams.page || 1) + 1
    const params = { ...searchParams, page: nextPage }
    setSearchParams(params)

    try {
      await dispatchIfChanged(params)
    } catch (_err) {
    } finally {
      isLoadingMore.current = false
    }
  }, [searchParams, dispatchIfChanged])

  // Stable search handler that doesn't depend on changing state
  const handleSearch = useCallback((q) => {
    const trimmed = (q || '').trim()
    if (trimmed.length === 0) {
      // Explicitly override previous q so it is removed from params and query
      void loadEvents({ q: '' })
      return
    }
    void loadEvents({ q: trimmed })
  }, [loadEvents])

  // Stable filter handler that doesn't depend on changing state
  const handleFilter = useCallback((filters) => {
    void loadEvents(filters)
  }, [loadEvents])

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-blob-primary blur-3xl blob-glow" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blob-secondary blur-3xl blob-glow" />
      </div>

      <section className="hero-modern relative z-10">
        <div className="container-modern">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center-modern"
          >
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-web3-primary">Explore Event-i Events</h1>
            <p className="mt-3 text-base md:text-lg text-web3-secondary">{headerSubtitle}</p>
          </motion.div>

          <div className="mt-8">
            <EventSearch onSearch={handleSearch} onFilter={handleFilter} categories={categories} />
          </div>
        </div>
      </section>

      <section className="section-modern relative z-10">
        <div className="container-modern">
          {error && !events.length && (
            <div className="min-h-[30vh] flex items-center justify-center">
              <div className="text-center">
                <div className="text-error-primary text-6xl mb-3">⚠️</div>
                <h2 className="text-xl md:text-2xl font-semibold text-web3-primary mb-2">We couldn't load events</h2>
                <p className="text-web3-secondary mb-4">Please try again or adjust your filters.</p>
                <button onClick={() => loadEvents({})} className="btn-web3-primary px-6 py-2 rounded-xl">Retry</button>
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
                <h3 className="text-xl font-semibold text-web3-primary mb-2">No events found</h3>
                <p className="text-web3-secondary">Try different keywords or remove some filters.</p>
              </div>
            </div>
          ) : null}

          {meta?.hasMore && (
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
  )
}

export default Events 