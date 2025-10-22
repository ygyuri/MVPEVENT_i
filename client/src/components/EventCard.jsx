import { motion } from 'framer-motion'
import { Heart, MapPin, Calendar, Star, Zap } from 'lucide-react'
import { cn } from '../utils/cn'
import { useNavigate } from 'react-router-dom'
import CategoryBadge from './CategoryBadge'
import { PriceDisplay } from './CurrencyConverter'

const EventCard = ({ event, onFavorite, onView, index = 0 }) => {
  const navigate = useNavigate()
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatPrice = (price) => {
    if (!price || price === 0) return 'Free'
    return `$${price}`
  }

  const openDetails = () => {
    if (onView) onView(event.slug)
    else navigate(`/events/${event.slug}/checkout`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="event-card-modern group relative overflow-hidden cursor-pointer z-10"
      onClick={openDetails}
    >
      {/* Featured Badge */}
      {event.isFeatured && (
        <div className="absolute top-4 left-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-amber-500/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center space-x-1 border border-amber-500/30">
            <Star className="w-2.5 h-2.5" />
            <span>Featured</span>
          </div>
        </div>
      )}

      {/* Trending Badge */}
      {event.isTrending && (
        <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-rose-500/20 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center border border-rose-500/30">
            <Zap className="w-2.5 h-2.5 mr-1" />
            <span>Trending</span>
          </div>
        </div>
      )}

      {/* Favorite Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onFavorite?.(event.id)
        }}
        className={cn(
          "absolute top-4 right-4 z-20 p-2 rounded-full transition-all duration-200",
          event.isFavorited
            ? "bg-red-500 text-white shadow-lg"
            : "bg-white/80 backdrop-blur-sm text-gray-600 hover:bg-red-500 hover:text-white shadow-lg"
        )}
      >
        <Heart className={cn("w-5 h-5", event.isFavorited && "fill-current")} />
      </button>

      {/* Event Image */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-500/10 to-purple-500/10">
        <img
          src={event.coverImageUrl || `https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop`}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            e.target.src = `https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop`;
            e.target.onerror = null; // Prevent infinite loop
          }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Category Badge */}
        <div className="absolute bottom-4 left-4">
          <CategoryBadge 
            category={event.category?.name || 'tech'} 
            variant="solid" 
            size="sm"
          />
        </div>
      </div>

      {/* Event Content */}
      <div className="p-6">
        {/* Title */}
        <h3 className="text-xl font-bold text-web3-primary mb-2 line-clamp-2 group-hover:text-web3-accent transition-colors duration-200">
          {event.title}
        </h3>

        {/* Description */}
        <p className="text-web3-secondary text-sm mb-4 line-clamp-2">
          {event.shortDescription}
        </p>

        {/* Event Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm text-web3-secondary">
            <Calendar className="w-4 h-4 mr-2 text-web3-accent" />
            <span>{formatDate(event.startDate)} at {formatTime(event.startDate)}</span>
          </div>
          <div className="flex items-center text-sm text-web3-secondary">
            <MapPin className="w-4 h-4 mr-2 text-web3-accent" />
            <span>{event.venueName}, {event.city}, {event.state}</span>
          </div>
        </div>

        <div className="flex items-end justify-between pt-4 border-t border-web3-secondary-border/50">
          {/* Pricing Section - More Subtle */}
          <div className="flex flex-col gap-1">
            {event.isFree ? (
              <span className="text-xl font-bold text-success-primary">Free Event</span>
            ) : event.ticketTypes && event.ticketTypes.length > 0 ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs text-web3-secondary/70 uppercase tracking-wide">From</span>
                  <PriceDisplay 
                    amount={Math.min(...event.ticketTypes.map(t => t.price || 0))} 
                    originalCurrency="KES"
                    className="text-xl font-bold"
                  />
                </div>
                {event.ticketTypes.length > 1 && (
                  <span className="text-xs text-web3-secondary/60">
                    {event.ticketTypes.length} options
                  </span>
                )}
              </>
            ) : (
              <PriceDisplay 
                amount={event.price || 0} 
                originalCurrency="KES"
                className="text-xl font-bold"
              />
            )}
          </div>

          {/* Smaller, Subtle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/events/${event.slug}/checkout`)
            }}
            className="px-4 py-1.5 text-sm font-medium text-web3-accent hover:text-white 
                       border border-web3-accent hover:bg-web3-accent 
                       rounded-lg transition-all duration-200"
          >
            View
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default EventCard 