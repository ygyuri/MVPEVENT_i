import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

// Currency API for real-time rates
const CURRENCY_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD'

// Request deduplication cache for currency API
const currencyRequestCache = new Map();

// Supported currencies with their details
export const SUPPORTED_CURRENCIES = {
  KES: { name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪', default: true },
  USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺' },
  GBP: { name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  JPY: { name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  AUD: { name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  CHF: { name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  CNY: { name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  INR: { name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  BRL: { name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  MXN: { name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
  ZAR: { name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  RUB: { name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
  KRW: { name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
  SEK: { name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
  NOK: { name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
  DKK: { name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' },
  PLN: { name: 'Polish Złoty', symbol: 'zł', flag: '🇵🇱' },
  CZK: { name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿' },
  HUF: { name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺' },
  ILS: { name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱' },
  TRY: { name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  THB: { name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
  PHP: { name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
  VND: { name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
  EGP: { name: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬' },
  NGN: { name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  GHS: { name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭' },
  UGX: { name: 'Ugandan Shilling', symbol: 'USh', flag: '🇺🇬' },
  TZS: { name: 'Tanzanian Shilling', symbol: 'TSh', flag: '🇹🇿' },
  ETB: { name: 'Ethiopian Birr', symbol: 'Br', flag: '🇪🇹' },
  MAD: { name: 'Moroccan Dirham', symbol: 'MAD', flag: '🇲🇦' },
  AED: { name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  SAR: { name: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦' },
  QAR: { name: 'Qatari Riyal', symbol: 'ر.ق', flag: '🇶🇦' },
  KWD: { name: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼' },
  BHD: { name: 'Bahraini Dinar', symbol: '.د.ب', flag: '🇧🇭' },
  OMR: { name: 'Omani Rial', symbol: 'ر.ع.', flag: '🇴🇲' },
  JOD: { name: 'Jordanian Dinar', symbol: 'د.ا', flag: '🇯🇴' },
  LBP: { name: 'Lebanese Pound', symbol: 'ل.ل', flag: '🇱🇧' },
  IQD: { name: 'Iraqi Dinar', symbol: 'ع.د', flag: '🇮🇶' },
  IRR: { name: 'Iranian Rial', symbol: '﷼', flag: '🇮🇷' },
  AFN: { name: 'Afghan Afghani', symbol: '؋', flag: '🇦🇫' },
  PKR: { name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰' },
  BDT: { name: 'Bangladeshi Taka', symbol: '৳', flag: '🇧🇩' },
  LKR: { name: 'Sri Lankan Rupee', symbol: 'Rs', flag: '🇱🇰' },
  NPR: { name: 'Nepalese Rupee', symbol: '₨', flag: '🇳🇵' },
  MMK: { name: 'Myanmar Kyat', symbol: 'K', flag: '🇲🇲' },
  LAK: { name: 'Lao Kip', symbol: '₭', flag: '🇱🇦' },
  KHR: { name: 'Cambodian Riel', symbol: '៛', flag: '🇰🇭' },
  MNT: { name: 'Mongolian Tugrik', symbol: '₮', flag: '🇲🇳' },
      UZS: { name: 'Uzbekistani Som', symbol: "so'm", flag: '🇺🇿' },
  KZT: { name: 'Kazakhstani Tenge', symbol: '₸', flag: '🇰🇿' },
  GEL: { name: 'Georgian Lari', symbol: '₾', flag: '🇬🇪' },
  AMD: { name: 'Armenian Dram', symbol: '֏', flag: '🇦🇲' },
  AZN: { name: 'Azerbaijani Manat', symbol: '₼', flag: '🇦🇿' },
  MDL: { name: 'Moldovan Leu', symbol: 'L', flag: '🇲🇩' },
  UAH: { name: 'Ukrainian Hryvnia', symbol: '₴', flag: '🇺🇦' },
  BYN: { name: 'Belarusian Ruble', symbol: 'Br', flag: '🇧🇾' },
  RON: { name: 'Romanian Leu', symbol: 'lei', flag: '🇷🇴' },
  BGN: { name: 'Bulgarian Lev', symbol: 'лв', flag: '🇧🇬' },
  HRK: { name: 'Croatian Kuna', symbol: 'kn', flag: '🇭🇷' },
  RSD: { name: 'Serbian Dinar', symbol: 'дин', flag: '🇷🇸' },
  BAM: { name: 'Bosnia-Herzegovina Convertible Mark', symbol: 'KM', flag: '🇧🇦' },
  ALL: { name: 'Albanian Lek', symbol: 'L', flag: '🇦🇱' },
  MKD: { name: 'Macedonian Denar', symbol: 'ден', flag: '🇲🇰' },
  MNT: { name: 'Mongolian Tugrik', symbol: '₮', flag: '🇲🇳' },
  NPR: { name: 'Nepalese Rupee', symbol: '₨', flag: '🇳🇵' },
  BDT: { name: 'Bangladeshi Taka', symbol: '৳', flag: '🇧🇩' },
  LKR: { name: 'Sri Lankan Rupee', symbol: 'Rs', flag: '🇱🇰' },
  PKR: { name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰' },
  AFN: { name: 'Afghan Afghani', symbol: '؋', flag: '🇦🇫' },
  IRR: { name: 'Iranian Rial', symbol: '﷼', flag: '🇮🇷' },
  IQD: { name: 'Iraqi Dinar', symbol: 'ع.د', flag: '🇮🇶' },
  LBP: { name: 'Lebanese Pound', symbol: 'ل.ل', flag: '🇱🇧' },
  JOD: { name: 'Jordanian Dinar', symbol: 'د.ا', flag: '🇯🇴' },
  OMR: { name: 'Omani Rial', symbol: 'ر.ع.', flag: '🇴🇲' },
  BHD: { name: 'Bahraini Dinar', symbol: '.د.ب', flag: '🇧🇭' },
  KWD: { name: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼' },
  QAR: { name: 'Qatari Riyal', symbol: 'ر.ق', flag: '🇶🇦' },
  SAR: { name: 'Saudi Riyal', symbol: 'ر.س', flag: '🇸🇦' },
  AED: { name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  MAD: { name: 'Moroccan Dirham', symbol: 'MAD', flag: '🇲🇦' },
  ETB: { name: 'Ethiopian Birr', symbol: 'Br', flag: '🇪🇹' },
  TZS: { name: 'Tanzanian Shilling', symbol: 'TSh', flag: '🇹🇿' },
  UGX: { name: 'Ugandan Shilling', symbol: 'USh', flag: '🇺🇬' },
  GHS: { name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭' },
  NGN: { name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  EGP: { name: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬' },
  VND: { name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
  PHP: { name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
  IDR: { name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
  MYR: { name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  THB: { name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  TRY: { name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  ILS: { name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱' },
  HUF: { name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺' },
  CZK: { name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿' },
  PLN: { name: 'Polish Złoty', symbol: 'zł', flag: '🇵🇱' },
  DKK: { name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' },
  NOK: { name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
  SEK: { name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  KRW: { name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
  RUB: { name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
  ZAR: { name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  MXN: { name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
  BRL: { name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  INR: { name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  CNY: { name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  CHF: { name: 'Swiss Franc', symbol: 'CHF', flag: '🇨🇭' },
  AUD: { name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  JPY: { name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  GBP: { name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺' },
  USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸' }
}

// Fetch exchange rates from API
export const fetchExchangeRates = createAsyncThunk(
  'currency/fetchExchangeRates',
  async () => {
    try {
      const now = Date.now();
      const requestKey = CURRENCY_API_URL;
      
      // Check if we have a recent request for the same URL
      if (currencyRequestCache.has(requestKey)) {
        const lastRequest = currencyRequestCache.get(requestKey);
        if (now - lastRequest < 30000) { // 30 seconds cache for currency
          console.log('🚫 [CURRENCY API] Deduplicating request:', requestKey);
          return new Promise((resolve) => {
            // Return cached promise or wait for ongoing request
            setTimeout(() => {
              resolve(currencyRequestCache.get(requestKey + '_result'));
            }, 100);
          });
        }
      }
      
      // Store request timestamp
      currencyRequestCache.set(requestKey, now);
      
      console.log('🔄 [CURRENCY API] Request:', {
        url: requestKey,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(CURRENCY_API_URL)
      const data = await response.json()
      
      // Store result in cache
      currencyRequestCache.set(requestKey + '_result', data.rates);
      
      console.log('✅ [CURRENCY API] Response:', {
        status: response.status,
        timestamp: new Date().toISOString()
      });

      return data.rates
    } catch (error) {
      console.error('❌ [CURRENCY API] Error:', error)
      // Fallback rates (approximate)
      return {
        KES: 150, USD: 1, EUR: 0.85, GBP: 0.73, JPY: 110, CAD: 1.25,
        AUD: 1.35, CHF: 0.92, CNY: 6.45, INR: 75, BRL: 5.2, MXN: 20,
        ZAR: 15, RUB: 75, KRW: 1100, SGD: 1.35, HKD: 7.8, SEK: 8.5,
        NOK: 8.8, DKK: 6.2, PLN: 3.8, CZK: 21.5, HUF: 300, ILS: 3.2,
        TRY: 8.5, THB: 32, MYR: 4.2, IDR: 14200, PHP: 50, VND: 23000,
        EGP: 15.7, NGN: 410, GHS: 5.8, UGX: 3500, TZS: 2300, ETB: 43,
        MAD: 9, AED: 3.67, SAR: 3.75, QAR: 3.64, KWD: 0.3, BHD: 0.38,
        OMR: 0.38, JOD: 0.71, LBP: 1500, IQD: 1460, IRR: 42000, AFN: 85,
        PKR: 160, BDT: 85, LKR: 200, NPR: 120, MMK: 1600, LAK: 9500,
        KHR: 4100, MNT: 2850, UZS: 10500, KZT: 420, GEL: 3.1, AMD: 520,
        AZN: 1.7, MDL: 17.5, UAH: 27, BYN: 2.5, RON: 4.1, BGN: 1.65,
        HRK: 6.3, RSD: 100, BAM: 1.65, ALL: 100, MKD: 51
      }
    }
  }
)

const initialState = {
  selectedCurrency: 'KES',
  exchangeRates: {},
  loading: false,
  error: null,
  lastUpdated: null
}

const currencySlice = createSlice({
  name: 'currency',
  initialState,
  reducers: {
    setCurrency: (state, action) => {
      state.selectedCurrency = action.payload
    },
    updateExchangeRates: (state, action) => {
      state.exchangeRates = action.payload
      state.lastUpdated = new Date().toISOString()
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExchangeRates.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchExchangeRates.fulfilled, (state, action) => {
        state.loading = false
        state.exchangeRates = action.payload
        state.lastUpdated = new Date().toISOString()
      })
      .addCase(fetchExchangeRates.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message
      })
  }
})

export const { setCurrency, updateExchangeRates, clearError } = currencySlice.actions

// Selectors
export const selectSelectedCurrency = (state) => state.currency.selectedCurrency
export const selectExchangeRates = (state) => state.currency.exchangeRates
export const selectCurrencyLoading = (state) => state.currency.loading
export const selectCurrencyError = (state) => state.currency.error
export const selectLastUpdated = (state) => state.currency.lastUpdated

// Utility functions
export const convertCurrency = (amount, fromCurrency, toCurrency, rates) => {
  if (!rates || !rates[fromCurrency] || !rates[toCurrency]) {
    return amount // Return original amount if conversion not possible
  }
  
  // Convert to USD first (base currency), then to target currency
  const usdAmount = amount / rates[fromCurrency]
  return usdAmount * rates[toCurrency]
}

export const formatCurrency = (amount, currency) => {
  const currencyInfo = SUPPORTED_CURRENCIES[currency]
  if (!currencyInfo) return `${amount} ${currency}`
  
  // Format based on currency
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })
  
  return formatter.format(amount)
}

export default currencySlice.reducer
