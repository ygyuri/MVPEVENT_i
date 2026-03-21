import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import EventILoader from './EventILoader';

const LoadingOverlay = ({
  show,
  label = 'Loading...',
  className = ''
}) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
        >
          <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-sm" />
          <div className="relative">
            <EventILoader label={label} className="py-0" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingOverlay;
