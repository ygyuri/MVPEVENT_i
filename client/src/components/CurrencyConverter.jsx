import React from 'react'
import { useSelector } from 'react-redux'
import { 
  selectSelectedCurrency, 
  selectExchangeRates,
  convertCurrency,
  formatCurrency,
  SUPPORTED_CURRENCIES
} from '../store/slices/currencySlice'

const CurrencyConverter = ({ 
  amount, 
  originalCurrency = 'KES', 
  showOriginal = true, 
  showConverted = true,
  className = '',
  size = 'normal' // 'small', 'normal', 'large'
}) => {
  const selectedCurrency = useSelector(selectSelectedCurrency)
  const exchangeRates = useSelector(selectExchangeRates)

  if (!amount || amount <= 0) {
    return <span className={`text-web3-secondary ${className}`}>Price not available</span>
  }

  const convertedAmount = convertCurrency(amount, originalCurrency, selectedCurrency, exchangeRates)
  const originalFormatted = formatCurrency(amount, originalCurrency)
  const convertedFormatted = formatCurrency(convertedAmount, selectedCurrency)

  const sizeClasses = {
    small: 'text-sm',
    normal: 'text-base',
    large: 'text-lg'
  }

  const textSize = sizeClasses[size] || sizeClasses.normal

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Original Price */}
      {showOriginal && originalCurrency !== selectedCurrency && (
        <div className={`${textSize} text-web3-secondary line-through`}>
          {originalFormatted}
        </div>
      )}
      
      {/* Converted Price */}
      {showConverted && (
        <div className={`${textSize} font-semibold text-web3-accent`}>
          {convertedFormatted}
        </div>
      )}
      
      {/* Exchange Rate Info */}
      {originalCurrency !== selectedCurrency && exchangeRates[originalCurrency] && exchangeRates[selectedCurrency] && (
        <div className="text-xs text-web3-secondary mt-1">
          1 {originalCurrency} = {formatCurrency(
            exchangeRates[selectedCurrency] / exchangeRates[originalCurrency], 
            selectedCurrency
          )}
        </div>
      )}
    </div>
  )
}

// Price display component for event cards and lists
export const PriceDisplay = ({ 
  amount, 
  originalCurrency = 'KES', 
  className = '',
  showCurrencyInfo = false 
}) => {
  const selectedCurrency = useSelector(selectSelectedCurrency)
  const exchangeRates = useSelector(selectExchangeRates)

  if (!amount || amount <= 0) {
    return <span className={`text-web3-secondary ${className}`}>Free</span>
  }

  const convertedAmount = convertCurrency(amount, originalCurrency, selectedCurrency, exchangeRates)
  const convertedFormatted = formatCurrency(convertedAmount, selectedCurrency)
  const currencyInfo = SUPPORTED_CURRENCIES[selectedCurrency]

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <span className="font-bold text-web3-accent">{convertedFormatted}</span>
      {showCurrencyInfo && currencyInfo && (
        <span className="text-sm text-web3-secondary">({currencyInfo.symbol})</span>
      )}
    </div>
  )
}

// Compact price display for small spaces
export const CompactPrice = ({ 
  amount, 
  originalCurrency = 'KES', 
  className = '' 
}) => {
  const selectedCurrency = useSelector(selectSelectedCurrency)
  const exchangeRates = useSelector(selectExchangeRates)

  if (!amount || amount <= 0) {
    return <span className={`text-web3-secondary ${className}`}>Free</span>
  }

  const convertedAmount = convertCurrency(amount, originalCurrency, selectedCurrency, exchangeRates)
  const currencyInfo = SUPPORTED_CURRENCIES[selectedCurrency]

  return (
    <span className={`font-semibold text-web3-accent ${className}`}>
      {currencyInfo?.symbol}{convertedAmount.toFixed(0)}
    </span>
  )
}

export default CurrencyConverter

