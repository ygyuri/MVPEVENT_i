import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "../../contexts/ThemeContext";

const ModernBackground = () => {
  const { isDarkMode } = useTheme();

  // Floating animation variants
  const floatAnimation = {
    animate: {
      y: [0, 20, 0],
      x: [0, 10, 0],
      opacity: [0.6, 0.8, 0.6],
    },
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut",
    },
  };

  const slowFloat = {
    animate: {
      y: [0, -30, 0],
      x: [0, -15, 0],
      opacity: [0.4, 0.6, 0.4],
    },
    transition: {
      duration: 12,
      repeat: Infinity,
      ease: "easeInOut",
    },
  };

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Gradient backgrounds */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background: isDarkMode
            ? "radial-gradient(ellipse at top, rgba(139, 92, 246, 0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(99, 102, 241, 0.12) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(168, 85, 247, 0.1) 0%, transparent 50%), linear-gradient(180deg, #0f172a 0%, #1e293b 100%)"
            : "radial-gradient(ellipse at top, rgba(147, 197, 253, 0.3) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(196, 181, 253, 0.25) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(165, 243, 252, 0.2) 0%, transparent 50%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        }}
      />

      {/* Floating blob shapes */}
      {isDarkMode ? (
        // Dark mode blobs
        <>
          {/* Purple blob - top right */}
          <motion.div
            className="absolute top-20 right-20 w-96 h-96 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%)",
            }}
            initial={{ opacity: 0 }}
            animate={{
              ...floatAnimation.animate,
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={floatAnimation.transition}
          />

          {/* Blue blob - bottom left */}
          <motion.div
            className="absolute bottom-40 left-10 w-80 h-80 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)",
            }}
            initial={{ opacity: 0 }}
            animate={{
              ...slowFloat.animate,
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={slowFloat.transition}
          />

          {/* Purple blob - center */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)",
            }}
            initial={{ opacity: 0 }}
            animate={{
              y: [0, 30, 0],
              x: [0, 20, 0],
              opacity: [0.15, 0.25, 0.15],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </>
      ) : (
        // Light mode blobs
        <>
          {/* Sky blue blob - top right */}
          <motion.div
            className="absolute top-20 right-20 w-96 h-96 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(147, 197, 253, 0.4) 0%, transparent 70%)",
            }}
            initial={{ opacity: 0 }}
            animate={{
              ...floatAnimation.animate,
              opacity: [0.3, 0.4, 0.3],
            }}
            transition={floatAnimation.transition}
          />

          {/* Purple blob - bottom left */}
          <motion.div
            className="absolute bottom-40 left-10 w-80 h-80 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(196, 181, 253, 0.35) 0%, transparent 70%)",
            }}
            initial={{ opacity: 0 }}
            animate={{
              ...slowFloat.animate,
              opacity: [0.25, 0.35, 0.25],
            }}
            transition={slowFloat.transition}
          />

          {/* Cyan blob - center */}
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(165, 243, 252, 0.3) 0%, transparent 70%)",
            }}
            initial={{ opacity: 0 }}
            animate={{
              y: [0, 30, 0],
              x: [0, 20, 0],
              opacity: [0.2, 0.3, 0.2],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </>
      )}

      {/* Subtle grid overlay - very faint */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 0.5px, transparent 0.5px), linear-gradient(90deg, currentColor 0.5px, transparent 0.5px)",
          backgroundSize: "50px 50px",
        }}
      />
    </div>
  );
};

export default ModernBackground;
