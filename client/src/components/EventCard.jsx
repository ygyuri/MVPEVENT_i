import { motion } from "framer-motion";
import {
  Heart,
  MapPin,
  Calendar,
  Star,
  Zap,
  Users,
  Clock,
  Share2,
  Eye,
  Bookmark,
  TrendingUp,
  Award,
  Sparkles,
} from "lucide-react";
import { cn } from "../utils/cn";
import { useNavigate } from "react-router-dom";
import CategoryBadge from "./CategoryBadge";
import { PriceDisplay } from "./CurrencyConverter";
import { useState } from "react";

const EventCard = ({ event, onFavorite, onView, index = 0 }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getDaysUntilEvent = (dateString) => {
    const eventDate = new Date(dateString);
    const today = new Date();
    const diffTime = eventDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getEventStatus = () => {
    const daysUntil = getDaysUntilEvent(event.startDate);
    if (daysUntil < 0) return { text: "Ended", color: "bg-gray-500" };
    if (daysUntil === 0) return { text: "Today", color: "bg-red-500" };
    if (daysUntil === 1) return { text: "Tomorrow", color: "bg-orange-500" };
    if (daysUntil <= 7) return { text: "This Week", color: "bg-yellow-500" };
    return { text: "Upcoming", color: "bg-green-500" };
  };

  const openDetails = () => {
    if (onView) onView(event.slug);
    else navigate(`/events/${event.slug}/checkout`);
  };

  const status = getEventStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.1,
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -12,
        scale: 1.03,
        transition: { duration: 0.3, ease: "easeOut" },
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative overflow-hidden cursor-pointer bg-white dark:bg-gray-900 shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-100 dark:border-gray-800"
      onClick={openDetails}
    >
      {/* Premium Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-900/20 dark:via-transparent dark:to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Floating Particles Effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
            initial={{
              x: Math.random() * 300,
              y: Math.random() * 200,
              opacity: 0,
            }}
            animate={
              isHovered
                ? {
                    y: [null, -20],
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }
                : {}
            }
            transition={{
              duration: 2,
              delay: i * 0.2,
              repeat: Infinity,
              repeatDelay: 3,
            }}
          />
        ))}
      </div>

      {/* Premium Badges */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
        {event.isFeatured && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 shadow-lg backdrop-blur-sm"
          >
            <Sparkles className="w-3 h-3" />
            <span>Featured</span>
          </motion.div>
        )}

        {event.isTrending && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-rose-400 to-pink-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center space-x-1 shadow-lg backdrop-blur-sm"
          >
            <TrendingUp className="w-3 h-3" />
            <span>Trending</span>
          </motion.div>
        )}
      </div>

      {/* Premium Action Buttons */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onFavorite?.(event.id);
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "p-2.5 rounded-full transition-all duration-300 backdrop-blur-md shadow-lg",
            event.isFavorited
              ? "bg-red-500 text-white"
              : "bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 hover:bg-red-500 hover:text-white"
          )}
        >
          <Heart
            className={cn("w-4 h-4", event.isFavorited && "fill-current")}
          />
        </motion.button>

        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement share functionality
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="p-2.5 rounded-full bg-white/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 hover:bg-blue-500 hover:text-white backdrop-blur-md shadow-lg transition-all duration-300"
        >
          <Share2 className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Premium Image Section */}
      <div className="relative h-64 overflow-hidden">
        {/* Image Loading Skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse" />
        )}

        <motion.img
          src={
            event.coverImageUrl ||
            `https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop`
          }
          alt={event.title}
          className={cn(
            "w-full h-full object-cover transition-all duration-700",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            e.target.src = `https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop`;
            e.target.onerror = null;
          }}
          loading="lazy"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.6 }}
        />

        {/* Premium Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Image Overlay Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Bottom Left - Category */}
        <div className="absolute bottom-4 left-4">
          <CategoryBadge
            category={event.category?.name || "tech"}
            variant="solid"
            size="sm"
          />
        </div>

        {/* Bottom Right - Status */}
        <div className="absolute bottom-4 right-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className={cn(
              "text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm shadow-lg",
              status.color
            )}
          >
            {status.text}
          </motion.div>
        </div>

        {/* Premium Rating Overlay */}
        {event.rating && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center space-x-1 shadow-lg"
            >
              <Star className="w-3 h-3 text-yellow-500 fill-current" />
              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                {event.rating}
              </span>
            </motion.div>
          </div>
        )}
      </div>

      {/* Premium Content Section */}
      <div className="p-6 relative">
        {/* Content Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-800/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Title with Premium Typography */}
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 leading-tight"
        >
          {event.title}
        </motion.h3>

        {/* Premium Description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed"
        >
          {event.shortDescription}
        </motion.p>

        {/* Premium Event Details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3 mb-5"
        >
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="font-semibold">
                {formatDate(event.startDate)}
              </span>
            </div>
            <span className="mx-2 text-gray-400">•</span>
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>{formatTime(event.startDate)}</span>
            </div>
          </div>

          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4 text-blue-500 mr-2" />
            <span className="truncate font-medium">
              {event.venueName}, {event.city}
            </span>
          </div>

          {event.attendees && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-4 h-4 text-blue-500 mr-2" />
              <span className="font-medium">
                {event.attendees.length} attending
              </span>
              {event.capacity && (
                <span className="text-gray-400 ml-1">of {event.capacity}</span>
              )}
            </div>
          )}
        </motion.div>

        {/* Premium Bottom Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between pt-4 border-t border-gray-200/50 dark:border-gray-700/50"
        >
          {/* Premium Pricing */}
          <div className="flex flex-col">
            {event.isFree ? (
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-green-500" />
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  Free Event
                </span>
              </div>
            ) : event.ticketTypes && event.ticketTypes.length > 0 ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold">
                    From
                  </span>
                  <PriceDisplay
                    amount={Math.min(
                      ...event.ticketTypes.map((t) => t.price || 0)
                    )}
                    originalCurrency="KES"
                    className="text-xl font-bold text-gray-900 dark:text-white"
                  />
                </div>
                {event.ticketTypes.length > 1 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {event.ticketTypes.length} ticket options
                  </span>
                )}
              </>
            ) : (
              <PriceDisplay
                amount={event.price || 0}
                originalCurrency="KES"
                className="text-xl font-bold text-gray-900 dark:text-white"
              />
            )}
          </div>

          {/* Premium Action Button */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/events/${event.slug}/checkout`);
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center space-x-2"
          >
            <Eye className="w-4 h-4" />
            <span>View Details</span>
          </motion.button>
        </motion.div>
      </div>

      {/* Premium Hover Glow Effect */}
      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    </motion.div>
  );
};

export default EventCard;
