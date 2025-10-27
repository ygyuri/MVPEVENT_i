import React from "react";
import { motion } from "framer-motion";

/**
 * Standard page layout wrapper that ensures consistency across all pages
 * Provides: Hero section, section wrapper, animations, and continual
 */
const StandardPageLayout = ({
  children,
  heroTitle,
  heroSubtitle,
  className = "",
}) => {
  return (
    <div className={`relative ${className}`}>
      {/* Hero Section */}
      {heroTitle && (
        <section className="hero-modern">
          <div className="container-modern">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center-modern"
            >
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-web3-primary">
                {heroTitle}
              </h1>
              {heroSubtitle && (
                <p className="mt-3 text-base md:text-lg text-web3-secondary">
                  {heroSubtitle}
                </p>
              )}
            </motion.div>
          </div>
        </section>
      )}

      {/* Main Content Section */}
      <section className="section-modern">
        <div className="container-modern">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            {children}
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default StandardPageLayout;
