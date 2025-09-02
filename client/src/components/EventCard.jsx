import { motion } from 'framer-motion'
import { Heart, MapPin, Calendar, Users, Star, Zap, Wallet } from 'lucide-react'
import { cn } from '../utils/cn'
import { useNavigate } from 'react-router-dom'
import CategoryBadge from './CategoryBadge'

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
    console.log('EventCard openDetails called, event.slug:', event.slug, 'onView:', !!onView)
    if (onView) onView(event.slug)
    else navigate(`/events/${event.slug}`)
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
      {/* Web3 Badge */}
      <div className="absolute top-4 left-4 z-20">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1 backdrop-blur-sm">
          <Wallet className="w-3 h-3" />
          <span>Web3</span>
        </div>
      </div>

      {/* Featured Badge */}
      {event.isFeatured && (
        <div className="absolute top-4 left-20 z-20">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1">
            <Star className="w-3 h-3" />
            <span>Featured</span>
          </div>
        </div>
      )}

      {/* Trending Badge */}
      {event.isTrending && (
        <div className="absolute top-4 right-4 z-20">
          <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center">
            <Zap className="w-3 h-3 mr-1" />
            🔥 Trending
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
      <div className="relative h-48 overflow-hidden">
        <img
          src={event.coverImageUrl || `https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop`}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
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
        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors duration-200">
          {event.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {event.shortDescription}
        </p>

        {/* Event Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2 text-primary-500" />
            <span>{formatDate(event.startDate)} at {formatTime(event.startDate)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2 text-primary-500" />
            <span>{event.venueName}, {event.city}, {event.state}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2 text-primary-500" />
            <span>{event.currentAttendees || 0} attending</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary-600">
              {formatPrice(event.price)}
            </span>
            {event.isFree && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Free
              </span>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              openDetails()
            }}
            className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-2 rounded-xl font-medium hover:from-primary-700 hover:to-primary-800 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
          >
            View Details
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default EventCard 