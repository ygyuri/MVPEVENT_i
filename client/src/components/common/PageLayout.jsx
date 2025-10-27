import React from "react";
import { motion } from "framer-motion";

/**
 * Standardized page layout wrapper with framer-motion animations
 * Provides consistent page transitions and structure
 */
const PageLayout = ({
  children,
  className = "",
  maxWidth = "container-modern",
  animateOnMount = true,
}) => {
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.4,
  };

  const content = <div className={`${maxWidth} ${className}`}>{children}</div>;

  if (!animateOnMount) {
    return <div className={`${maxWidth} ${className}`}>{children}</div>;
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="relative"
    >
      {content}
    </motion.div>
  );
};

/**
 * Page section wrapper with consistent spacing
 */
export const PageSection = ({
  children,
  className = "",
  delay = 0,
  fullWidth = false,
}) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className={fullWidth ? className : `section-modern ${className}`}
    >
      {children}
    </motion.section>
  );
};

/**
 * Container with consistent max-width
 */
export const PageContainer = ({
  children,
  className = "",
  size = "default",
}) => {
  const sizeClasses = {
    default: "container-modern",
    small: "max-w-3xl mx-auto px-4",
    large: "max-w-7xl mx-auto px-4",
    full: "w-full",
  };

  return <div className={`${sizeClasses[size]} ${className}`}>{children}</div>;
};

/**
 * Stagger animation for list items
 */
export const useStagger = (delay = 0.05) => {
  return {
    container: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: delay,
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0 },
    },
  };
};

export default PageLayout;
