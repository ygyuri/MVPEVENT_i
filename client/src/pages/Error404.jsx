import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Home, Search, ArrowLeft, AlertCircle } from "lucide-react";
import FeaturedEventsMasonry from "../components/FeaturedEventsMasonry";

const Error404 = () => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 dark:from-gray-900/80 dark:via-gray-800/60 dark:to-gray-900/80 backdrop-blur-sm z-0" />

      {/* Featured Events Masonry Background */}
      <FeaturedEventsMasonry baseOpacity={0.2} subtleAnimations={true} />

      {/* Decorative blobs */}
      <div className="absolute top-20 left-10 w-40 h-40 sm:w-56 sm:h-56 lg:w-72 lg:h-72 bg-blue-200 dark:bg-blue-800/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob pointer-events-none z-0" />
      <div className="absolute top-40 right-10 w-40 h-40 sm:w-56 sm:h-56 lg:w-72 lg:h-72 bg-purple-200 dark:bg-purple-800/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000 pointer-events-none z-0" />
      <div className="absolute bottom-20 left-1/2 w-40 h-40 sm:w-56 sm:h-56 lg:w-72 lg:h-72 bg-pink-200 dark:bg-pink-800/30 rounded-full mix-blend-multiply filter blur-xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000 pointer-events-none z-0" />

      {/* Content */}
      <div className="relative z-30 min-h-screen flex items-center justify-center px-4 py-12">
        <div className="container-modern">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="inline-flex items-center justify-center w-32 h-32 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full mb-8"
            >
              <AlertCircle className="w-16 h-16 text-purple-600 dark:text-purple-400" />
            </motion.div>

            {/* Error Code */}
            <motion.h1
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-9xl md:text-[12rem] font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent mb-6 leading-none"
            >
              404
            </motion.h1>

            {/* Error Message */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4"
            >
              Page Not Found
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto"
            >
              Oops! The page you're looking for doesn't exist. It might have
              been moved, deleted, or you entered the wrong URL.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link
                to="/"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
              >
                <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Go to Homepage
              </Link>

              <Link
                to="/events"
                className="group inline-flex items-center gap-2 px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-semibold rounded-xl shadow-lg hover:shadow-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transform hover:-translate-y-1 transition-all duration-300"
              >
                <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Browse Events
              </Link>

              <button
                onClick={() => window.history.back()}
                className="group inline-flex items-center gap-2 px-8 py-4 bg-transparent text-gray-700 dark:text-gray-300 font-semibold rounded-xl border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transform hover:-translate-y-1 transition-all duration-300"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                Go Back
              </button>
            </motion.div>

            {/* Helpful Links */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                You might be looking for:
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  to="/events"
                  className="text-purple-600 dark:text-purple-400 hover:underline text-sm font-medium"
                >
                  Browse Events
                </Link>
                <span className="text-gray-400 dark:text-gray-600">•</span>
                <Link
                  to="/organizer"
                  className="text-purple-600 dark:text-purple-400 hover:underline text-sm font-medium"
                >
                  Organizer Dashboard
                </Link>
                <span className="text-gray-400 dark:text-gray-600">•</span>
                <Link
                  to="/profile"
                  className="text-purple-600 dark:text-purple-400 hover:underline text-sm font-medium"
                >
                  My Profile
                </Link>
                <span className="text-gray-400 dark:text-gray-600">•</span>
                <Link
                  to="/wallet"
                  className="text-purple-600 dark:text-purple-400 hover:underline text-sm font-medium"
                >
                  My Tickets
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Error404;
