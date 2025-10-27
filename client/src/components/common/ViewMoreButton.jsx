import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, Loader2 } from "lucide-react";

const ViewMoreButton = ({
  onClick,
  isLoading = false,
  hasMore = true,
  text = "View More",
  className = "",
}) => {
  if (!hasMore) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex justify-center mt-8 mb-4"
    >
      <motion.button
        onClick={onClick}
        disabled={isLoading}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          group relative inline-flex items-center justify-center
          px-6 py-3 text-base font-medium
          rounded-xl border border-purple-300 dark:border-purple-700
          bg-white dark:bg-gray-800
          text-purple-700 dark:text-purple-300
          hover:bg-purple-50 dark:hover:bg-purple-900/20
          hover:border-purple-400 dark:hover:border-purple-600
          transition-all duration-300
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span>Loading...</span>
          </>
        ) : (
          <>
            <span>{text}</span>
            <ChevronDown className="w-5 h-5 ml-2 transform group-hover:translate-y-1 transition-transform" />
          </>
        )}

        {/* Hover effect background */}
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity"
          initial={false}
        />
      </motion.button>
    </motion.div>
  );
};

export default ViewMoreButton;
