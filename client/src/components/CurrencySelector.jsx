import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Globe, RefreshCw } from 'lucide-react'
import { 
  setCurrency, 
  fetchExchangeRates, 
  selectSelectedCurrency, 
  selectExchangeRates, 
  selectCurrencyLoading, 
  selectLastUpdated,
  SUPPORTED_CURRENCIES,
  convertCurrency,
  formatCurrency
} from '../store/slices/currencySlice'

const CurrencySelector = ({ className = '', showConversion = true }) => {
  const dispatch = useDispatch()
  const selectedCurrency = useSelector(selectSelectedCurrency)
  const exchangeRates = useSelector(selectExchangeRates)
  const loading = useSelector(selectCurrencyLoading)
  const lastUpdated = useSelector(selectLastUpdated)
  
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch exchange rates on component mount (only if not already loaded)
  useEffect(() => {
    if (!exchangeRates || Object.keys(exchangeRates).length === 0) {
      dispatch(fetchExchangeRates());
    }
  }, [dispatch, exchangeRates])

  // Auto-refresh rates every 5 minutes (only if component is still mounted)
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchExchangeRates());
    }, 5 * 60 * 1000) // 5 minutes

    return () => {
      clearInterval(interval);
    }
  }, [dispatch])

  const handleCurrencySelect = (currencyCode) => {
    dispatch(setCurrency(currencyCode))
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleRefresh = (e) => {
    e.stopPropagation()
    dispatch(fetchExchangeRates())
  }

  const filteredCurrencies = Object.entries(SUPPORTED_CURRENCIES).filter(([code, info]) =>
    code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    info.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedCurrencyInfo = SUPPORTED_CURRENCIES[selectedCurrency]

  return (
    <div className={`relative ${className}`}>
      {/* Subtle Currency Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-web3-secondary/60 hover:text-web3-primary hover:bg-web3-secondary/30 rounded-lg transition-all duration-200"
        title={`${selectedCurrency} (${selectedCurrencyInfo?.symbol})`}
        aria-label={`Currency selector: ${selectedCurrency}`}
      >
        <Globe className="w-4 h-4" />
        <span className="absolute -top-0.5 -right-0.5 text-[8px] font-semibold">
          {selectedCurrencyInfo?.flag}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 w-72 mt-2 bg-web3-card border border-web3-secondary-border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Search Input with Refresh Button */}
          <div className="p-3 border-b border-web3-secondary-border">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Search currencies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 bg-web3-secondary border border-web3-secondary-border rounded-lg text-web3-primary placeholder-web3-secondary focus:outline-none focus:border-web3-accent"
              />
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="p-2 text-web3-secondary hover:text-web3-primary hover:bg-web3-secondary/30 rounded-lg transition-colors"
                title="Refresh exchange rates"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Currency List */}
          <div className="max-h-80 overflow-y-auto">
            {filteredCurrencies.map(([code, info]) => (
              <button
                key={code}
                onClick={() => handleCurrencySelect(code)}
                className={`w-full flex items-center justify-between px-4 py-3 hover:bg-web3-card-hover transition-colors ${
                  selectedCurrency === code ? 'bg-web3-accent text-web3-primary' : 'text-web3-primary'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{info.flag}</span>
                  <div className="text-left">
                    <div className="font-medium">{code}</div>
                    <div className="text-sm text-web3-secondary">{info.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{info.symbol}</div>
                  {showConversion && exchangeRates[code] && (
                    <div className="text-xs text-web3-secondary">
                      {formatCurrency(1, code)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <div className="p-3 border-t border-web3-secondary-border text-xs text-web3-secondary text-center">
              Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default CurrencySelector

