import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchFeaturedEvents } from "../store/slices/eventsSlice";
import { cn } from "../utils/cn";

const FeaturedEventsMasonry = ({
  baseOpacity = 0.65,
  subtleAnimations = false,
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { featuredEvents } = useSelector((state) => state.events);
  const [expandedEvents, setExpandedEvents] = useState([]);

  useEffect(() => {
    // Fetch featured events if not already loaded
    if (!featuredEvents || featuredEvents.length === 0) {
      dispatch(fetchFeaturedEvents({ page: 1, pageSize: 50 }));
    }
  }, [dispatch, featuredEvents]);

  // Create repeating pattern of events to fill background
  const getEventsForMasonry = () => {
    if (!featuredEvents || featuredEvents.length === 0) return [];

    // Calculate how many events we need to fill the background
    // Rough estimate: ~150-200 events for full coverage across all screen sizes
    const targetCount = 200;
    const repeats = Math.ceil(targetCount / featuredEvents.length);
    const repeatedEvents = [];

    // Repeat and add index for uniqueness
    for (let i = 0; i < repeats; i++) {
      repeatedEvents.push(
        ...featuredEvents.map((event, idx) => ({
          ...event,
          _masonryId: `${event.id || event._id}-${i}-${idx}`,
        }))
      );
    }

    // Shuffle for random appearance
    return repeatedEvents.sort(() => Math.random() - 0.5).slice(0, targetCount);
  };

  const masonryEvents = getEventsForMasonry();

  if (masonryEvents.length === 0) {
    return null;
  }

  const handleEventClick = (slug) => {
    navigate(`/events/${slug}/checkout`);
  };

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden z-10 pointer-events-none">
      <div className="absolute inset-0 w-full h-full" style={{ padding: 0 }}>
        {/* Grid Container - Square Masonry - Full Width End to End */}
        <div
          className="grid w-full h-full"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gridAutoRows: "minmax(120px, auto)",
            gap: "0",
            padding: "0",
          }}
        >
          {masonryEvents.map((event, index) => {
            // Random sizes for masonry effect - mostly squares with some variation
            const sizeVariants = [
              { col: 1, row: 1, ratio: "1/1" }, // Small square (most common)
              { col: 2, row: 1, ratio: "2/1" }, // Horizontal rectangle
              { col: 1, row: 2, ratio: "1/2" }, // Vertical rectangle
              { col: 2, row: 2, ratio: "1/1" }, // Large square
              { col: 1, row: 1, ratio: "1/1" }, // More small squares
              { col: 1, row: 1, ratio: "1/1" }, // Even more small squares
            ];

            // Use index-based pattern for consistent layout, but vary occasionally
            const patternIndex = index % 10;
            let size;
            if (patternIndex < 7) {
              size = sizeVariants[0]; // Mostly 1x1 squares
            } else if (patternIndex === 7) {
              size = sizeVariants[1]; // Horizontal rectangle
            } else if (patternIndex === 8) {
              size = sizeVariants[2]; // Vertical rectangle
            } else {
              size = sizeVariants[3]; // Large square
            }

            // Calculate grid span based on size
            const gridColumnSpan = size.col;
            const gridRowSpan = size.row;

            // Random delay for stagger effect (0-1 second)
            const delay = (index * 0.03) % 1.5;

            return (
              <motion.div
                key={event._masonryId || `${event.id || event._id}-${index}`}
                initial={{ opacity: 0, scale: subtleAnimations ? 0.98 : 0.9 }}
                animate={{ opacity: baseOpacity, scale: 1 }}
                transition={{
                  delay,
                  duration: subtleAnimations ? 0.8 : 0.6,
                  ease: subtleAnimations ? [0.25, 0.46, 0.45, 0.94] : "easeOut",
                }}
                whileHover={{
                  opacity: subtleAnimations
                    ? baseOpacity + 0.1
                    : baseOpacity + 0.2,
                  scale: subtleAnimations ? 1.03 : 1.08,
                  zIndex: 10,
                  transition: {
                    type: "spring",
                    stiffness: subtleAnimations ? 200 : 300,
                    damping: subtleAnimations ? 30 : 25,
                    mass: subtleAnimations ? 1 : 0.8,
                  },
                }}
                className={cn(
                  "relative overflow-hidden",
                  "bg-gray-300 dark:bg-gray-700",
                  "cursor-pointer",
                  "group",
                  "w-full h-full",
                  "pointer-events-auto"
                )}
                style={{
                  gridColumn: `span ${gridColumnSpan}`,
                  gridRow: `span ${gridRowSpan}`,
                  aspectRatio: size.ratio,
                  minHeight: 0,
                  minWidth: 0,
                }}
                onClick={() => {
                  if (event.slug) {
                    handleEventClick(event.slug);
                  }
                }}
              >
                {/* Event Image */}
                {event.coverImageUrl ? (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                    <motion.img
                      src={event.coverImageUrl}
                      alt={event.title || "Event"}
                      className="w-full h-full object-cover object-center brightness-125 contrast-125 saturate-110"
                      loading="lazy"
                      style={{
                        display: "block",
                        objectFit: "cover",
                        objectPosition: "center",
                        transformOrigin: "center",
                      }}
                      whileHover={{
                        scale: subtleAnimations ? 1.08 : 1.25,
                        filter: subtleAnimations
                          ? "brightness(1.15) contrast(1.1)"
                          : "brightness(1.35) contrast(1.3)",
                        transition: {
                          type: "spring",
                          stiffness: subtleAnimations ? 150 : 200,
                          damping: subtleAnimations ? 25 : 20,
                          mass: subtleAnimations ? 1.2 : 1,
                        },
                      }}
                    />
                    {/* Gradient Overlay - More visible on hover */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-40 pointer-events-none"
                      whileHover={{
                        opacity: subtleAnimations ? 0.35 : 0.2,
                        transition: {
                          duration: subtleAnimations ? 0.6 : 0.4,
                          ease: [0.4, 0, 0.2, 1],
                        },
                      }}
                    />

                    {/* Shine effect on hover - animated sweep */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none"
                      initial={{ opacity: 0, x: "-150%" }}
                      whileHover={{
                        opacity: subtleAnimations
                          ? [0, 0.6, 0.6, 0]
                          : [0, 1, 1, 0],
                        x: ["-150%", "250%", "250%", "250%"],
                        transition: {
                          duration: subtleAnimations ? 1.2 : 0.8,
                          ease: subtleAnimations
                            ? [0.25, 0.46, 0.45, 0.94]
                            : [0.25, 0.46, 0.45, 0.94],
                          times: [0, 0.3, 0.7, 1],
                        },
                      }}
                      style={{
                        transform: "skewX(-20deg)",
                      }}
                    />
                  </div>
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#4f0f69]/60 to-[#8A4FFF]/60" />
                )}

                {/* Event Title Overlay (slides up on hover) */}
                <motion.div
                  className="absolute inset-0 flex items-end justify-center z-20 pointer-events-none overflow-hidden"
                  initial={{ y: "100%" }}
                  whileHover={{
                    y: 0,
                    transition: {
                      type: "spring",
                      stiffness: subtleAnimations ? 180 : 250,
                      damping: subtleAnimations ? 35 : 30,
                      mass: subtleAnimations ? 1.2 : 1,
                    },
                  }}
                >
                  <div className="bg-gradient-to-t from-black/90 via-black/70 to-transparent w-full p-2 sm:p-3">
                    <p className="text-white text-[10px] sm:text-xs font-bold line-clamp-2 drop-shadow-xl text-center mb-1">
                      {event.title}
                    </p>
                    {event.location?.city && (
                      <p className="text-white/90 text-[9px] sm:text-[10px] text-center flex items-center justify-center gap-1">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {event.location.city}
                      </p>
                    )}
                  </div>
                </motion.div>

                {/* Glow effect on hover */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-[#4f0f69]/0 via-transparent to-[#8A4FFF]/0 pointer-events-none rounded-lg"
                  initial={{ opacity: 0 }}
                  whileHover={{
                    opacity: subtleAnimations ? 0.15 : 0.3,
                    transition: {
                      duration: subtleAnimations ? 0.7 : 0.5,
                      ease: [0.4, 0, 0.2, 1],
                    },
                  }}
                />

                {/* Minimal Pattern Overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_80%,_rgba(0,0,0,0.05)_100%)] opacity-20 pointer-events-none" />

                {/* Border - Enhanced on hover */}
                <motion.div
                  className="absolute inset-0 border border-black/5 dark:border-white/5 pointer-events-none rounded-lg"
                  initial={{
                    borderColor: "rgba(0,0,0,0.05)",
                    boxShadow: "0 0 0px rgba(79, 15, 105, 0)",
                  }}
                  whileHover={{
                    borderColor: subtleAnimations
                      ? "rgba(79, 15, 105, 0.25)"
                      : "rgba(79, 15, 105, 0.4)",
                    boxShadow: subtleAnimations
                      ? "0 0 12px rgba(79, 15, 105, 0.2)"
                      : "0 0 20px rgba(79, 15, 105, 0.3)",
                  }}
                  transition={{
                    duration: subtleAnimations ? 0.6 : 0.4,
                    ease: [0.4, 0, 0.2, 1],
                  }}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Gradient Overlays - Minimal for maximum visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/15 to-white/30 dark:from-gray-900/40 dark:via-gray-900/15 dark:to-gray-900/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-white/8 via-transparent to-white/8 dark:from-gray-900/8 dark:via-transparent dark:to-gray-900/8 pointer-events-none" />
      </div>
    </div>
  );
};

export default FeaturedEventsMasonry;
