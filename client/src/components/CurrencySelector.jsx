import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ChevronDown, Globe, RefreshCw } from 'lucide-react'
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

  // Fetch exchange rates on component mount
  useEffect(() => {
    dispatch(fetchExchangeRates())
  }, [dispatch])

  // Auto-refresh rates every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchExchangeRates())
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
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
      {/* Currency Display */}
      <div className="flex items-center space-x-2 px-4 py-2 bg-web3-secondary border border-web3-secondary-border rounded-lg hover:bg-web3-card-hover transition-all duration-200 text-web3-primary">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 flex-1"
        >
          <Globe className="w-4 h-4 text-web3-accent" />
          <span className="text-lg">{selectedCurrencyInfo?.flag}</span>
          <span className="font-medium">{selectedCurrency}</span>
          <span className="text-sm text-web3-secondary">({selectedCurrencyInfo?.symbol})</span>
          <ChevronDown className={`w-4 h-4 text-web3-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="ml-2 p-1 rounded hover:bg-web3-card transition-colors"
        >
          <RefreshCw className={`w-3 h-3 text-web3-accent ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-web3-card border border-web3-secondary-border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-web3-secondary-border">
            <input
              type="text"
              placeholder="Search currencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-web3-secondary border border-web3-secondary-border rounded-lg text-web3-primary placeholder-web3-secondary focus:outline-none focus:border-web3-accent"
            />
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

