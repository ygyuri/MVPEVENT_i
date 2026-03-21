import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';

const EventILoader = ({
  label = 'Loading...',
  className = ''
}) => {
  const { isDarkMode } = useTheme();

  const logoSrc = isDarkMode
    ? '/logos/event-i_dark_mode_logo.png'
    : '/logos/event-i_light_mode_logo.png';

  const rings = [
    { size: 120, opacity: 0.25, duration: 2.2, delay: 0 },
    { size: 180, opacity: 0.18, duration: 2.8, delay: 0.15 },
    { size: 240, opacity: 0.12, duration: 3.4, delay: 0.3 }
  ];

  return (
    <div className={`w-full flex items-center justify-center py-16 ${className}`}>
      <div className="flex flex-col items-center">
        <div className="relative flex items-center justify-center">
          {rings.map((r, idx) => (
            <motion.div
              key={idx}
              className="absolute rounded-full border border-white/40 dark:border-white/20"
              style={{ width: r.size, height: r.size, opacity: r.opacity }}
              animate={{
                scale: [0.85, 1.05, 0.85],
                rotate: [0, 180, 360]
              }}
              transition={{
                duration: r.duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: r.delay
              }}
            />
          ))}

          <motion.div
            className="relative z-10"
            animate={{
              scale: [1, 1.03, 1]
            }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            <img
              src={logoSrc}
              alt="Event-i"
              className="h-16 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </motion.div>

          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              width: 80,
              height: 80,
              background: isDarkMode
                ? 'radial-gradient(circle, rgba(138,79,255,0.18), rgba(58,125,255,0))'
                : 'radial-gradient(circle, rgba(58,125,255,0.18), rgba(138,79,255,0))'
            }}
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {label && (
          <div className="mt-6 text-sm font-semibold text-gray-600 dark:text-gray-300">
            {label}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventILoader;
