import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

const Pagination = ({ currentPage, totalPages, onPageChange, loading }) => {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages = []
    const showMax = 5
    
    if (totalPages <= showMax) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    
    return pages
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center gap-2 mt-12"
    >
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        className="p-2 rounded-lg border border-web3-secondary-border hover:border-web3-accent 
                   text-web3-secondary hover:text-web3-accent disabled:opacity-30 
                   disabled:cursor-not-allowed transition-all duration-200"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, idx) => (
          <button
            key={idx}
            onClick={() => typeof page === 'number' && onPageChange(page)}
            disabled={page === '...' || page === currentPage || loading}
            className={`min-w-[40px] h-10 px-3 rounded-lg font-medium text-sm transition-all duration-200
              ${page === currentPage 
                ? 'bg-web3-accent text-white shadow-lg' 
                : page === '...'
                ? 'cursor-default text-web3-secondary/50'
                : 'text-web3-secondary hover:text-web3-accent hover:bg-web3-secondary-bg'
              } ${loading ? 'opacity-50 cursor-wait' : ''}`}
          >
            {page}
          </button>
        ))}
      </div>

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || loading}
        className="p-2 rounded-lg border border-web3-secondary-border hover:border-web3-accent 
                   text-web3-secondary hover:text-web3-accent disabled:opacity-30 
                   disabled:cursor-not-allowed transition-all duration-200"
        aria-label="Next page"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </motion.div>
  )
}

export default Pagination

