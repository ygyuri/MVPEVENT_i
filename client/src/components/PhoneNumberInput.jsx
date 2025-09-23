import React, { useState, useEffect } from 'react';
import { Phone, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const PhoneNumberInput = ({ value, onChange, error, placeholder, className = '', onFullNumberChange }) => {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState({
    code: 'KE',
    name: 'Kenya',
    dialCode: '+254',
    flag: '🇰🇪'
  });

  // Country data with Kenya as default
  const countries = [
    { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
    { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬' },
    { code: 'TZ', name: 'Tanzania', dialCode: '+255', flag: '🇹🇿' },
    { code: 'RW', name: 'Rwanda', dialCode: '+250', flag: '🇷🇼' },
    { code: 'ET', name: 'Ethiopia', dialCode: '+251', flag: '🇪🇹' },
    { code: 'SO', name: 'Somalia', dialCode: '+252', flag: '🇸🇴' },
    { code: 'SS', name: 'South Sudan', dialCode: '+211', flag: '🇸🇸' },
    { code: 'DJ', name: 'Djibouti', dialCode: '+253', flag: '🇩🇯' },
    { code: 'ER', name: 'Eritrea', dialCode: '+291', flag: '🇪🇷' },
    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
    { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
    { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
    { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
    { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
    { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
    { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
    { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
    { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
    { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹' },
    { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
    { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴' },
    { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
    { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮' },
    { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱' },
    { code: 'CZ', name: 'Czech Republic', dialCode: '+420', flag: '🇨🇿' },
    { code: 'HU', name: 'Hungary', dialCode: '+36', flag: '🇭🇺' },
    { code: 'RO', name: 'Romania', dialCode: '+40', flag: '🇷🇴' },
    { code: 'BG', name: 'Bulgaria', dialCode: '+359', flag: '🇧🇬' },
    { code: 'HR', name: 'Croatia', dialCode: '+385', flag: '🇭🇷' },
    { code: 'SI', name: 'Slovenia', dialCode: '+386', flag: '🇸🇮' },
    { code: 'SK', name: 'Slovakia', dialCode: '+421', flag: '🇸🇰' },
    { code: 'LT', name: 'Lithuania', dialCode: '+370', flag: '🇱🇹' },
    { code: 'LV', name: 'Latvia', dialCode: '+371', flag: '🇱🇻' },
    { code: 'EE', name: 'Estonia', dialCode: '+372', flag: '🇪🇪' },
    { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
    { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
    { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷' },
    { code: 'CY', name: 'Cyprus', dialCode: '+357', flag: '🇨🇾' },
    { code: 'MT', name: 'Malta', dialCode: '+356', flag: '🇲🇹' },
    { code: 'LU', name: 'Luxembourg', dialCode: '+352', flag: '🇱🇺' },
    { code: 'IS', name: 'Iceland', dialCode: '+354', flag: '🇮🇸' },
    { code: 'LI', name: 'Liechtenstein', dialCode: '+423', flag: '🇱🇮' },
    { code: 'MC', name: 'Monaco', dialCode: '+377', flag: '🇲🇨' },
    { code: 'SM', name: 'San Marino', dialCode: '+378', flag: '🇸🇲' },
    { code: 'VA', name: 'Vatican City', dialCode: '+379', flag: '🇻🇦' },
    { code: 'AD', name: 'Andorra', dialCode: '+376', flag: '🇦🇩' },
    { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
    { code: 'UA', name: 'Ukraine', dialCode: '+380', flag: '🇺🇦' },
    { code: 'BY', name: 'Belarus', dialCode: '+375', flag: '🇧🇾' },
    { code: 'MD', name: 'Moldova', dialCode: '+373', flag: '🇲🇩' },
    { code: 'GE', name: 'Georgia', dialCode: '+995', flag: '🇬🇪' },
    { code: 'AM', name: 'Armenia', dialCode: '+374', flag: '🇦🇲' },
    { code: 'AZ', name: 'Azerbaijan', dialCode: '+994', flag: '🇦🇿' },
    { code: 'KZ', name: 'Kazakhstan', dialCode: '+7', flag: '🇰🇿' },
    { code: 'UZ', name: 'Uzbekistan', dialCode: '+998', flag: '🇺🇿' },
    { code: 'TM', name: 'Turkmenistan', dialCode: '+993', flag: '🇹🇲' },
    { code: 'TJ', name: 'Tajikistan', dialCode: '+992', flag: '🇹🇯' },
    { code: 'KG', name: 'Kyrgyzstan', dialCode: '+996', flag: '🇰🇬' },
    { code: 'AF', name: 'Afghanistan', dialCode: '+93', flag: '🇦🇫' },
    { code: 'PK', name: 'Pakistan', dialCode: '+92', flag: '🇵🇰' },
    { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
    { code: 'BD', name: 'Bangladesh', dialCode: '+880', flag: '🇧🇩' },
    { code: 'LK', name: 'Sri Lanka', dialCode: '+94', flag: '🇱🇰' },
    { code: 'MV', name: 'Maldives', dialCode: '+960', flag: '🇲🇻' },
    { code: 'BT', name: 'Bhutan', dialCode: '+975', flag: '🇧🇹' },
    { code: 'NP', name: 'Nepal', dialCode: '+977', flag: '🇳🇵' },
    { code: 'MM', name: 'Myanmar', dialCode: '+95', flag: '🇲🇲' },
    { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭' },
    { code: 'LA', name: 'Laos', dialCode: '+856', flag: '🇱🇦' },
    { code: 'KH', name: 'Cambodia', dialCode: '+855', flag: '🇰🇭' },
    { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
    { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
    { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
    { code: 'BN', name: 'Brunei', dialCode: '+673', flag: '🇧🇳' },
    { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },
    { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
    { code: 'TL', name: 'East Timor', dialCode: '+670', flag: '🇹🇱' },
    { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
    { code: 'TW', name: 'Taiwan', dialCode: '+886', flag: '🇹🇼' },
    { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰' },
    { code: 'MO', name: 'Macau', dialCode: '+853', flag: '🇲🇴' },
    { code: 'MN', name: 'Mongolia', dialCode: '+976', flag: '🇲🇳' },
    { code: 'KP', name: 'North Korea', dialCode: '+850', flag: '🇰🇵' },
    { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
    { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
    { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
    { code: 'FJ', name: 'Fiji', dialCode: '+679', flag: '🇫🇯' },
    { code: 'PG', name: 'Papua New Guinea', dialCode: '+675', flag: '🇵🇬' },
    { code: 'SB', name: 'Solomon Islands', dialCode: '+677', flag: '🇸🇧' },
    { code: 'VU', name: 'Vanuatu', dialCode: '+678', flag: '🇻🇺' },
    { code: 'NC', name: 'New Caledonia', dialCode: '+687', flag: '🇳🇨' },
    { code: 'PF', name: 'French Polynesia', dialCode: '+689', flag: '🇵🇫' },
    { code: 'WS', name: 'Samoa', dialCode: '+685', flag: '🇼🇸' },
    { code: 'TO', name: 'Tonga', dialCode: '+676', flag: '🇹🇴' },
    { code: 'KI', name: 'Kiribati', dialCode: '+686', flag: '🇰🇮' },
    { code: 'TV', name: 'Tuvalu', dialCode: '+688', flag: '🇹🇻' },
    { code: 'NR', name: 'Nauru', dialCode: '+674', flag: '🇳🇷' },
    { code: 'PW', name: 'Palau', dialCode: '+680', flag: '🇵🇼' },
    { code: 'FM', name: 'Micronesia', dialCode: '+691', flag: '🇫🇲' },
    { code: 'MH', name: 'Marshall Islands', dialCode: '+692', flag: '🇲🇭' },
    { code: 'CK', name: 'Cook Islands', dialCode: '+682', flag: '🇨🇰' },
    { code: 'NU', name: 'Niue', dialCode: '+683', flag: '🇳🇺' },
    { code: 'TK', name: 'Tokelau', dialCode: '+690', flag: '🇹🇰' },
    { code: 'WF', name: 'Wallis and Futuna', dialCode: '+681', flag: '🇼🇫' },
    { code: 'AS', name: 'American Samoa', dialCode: '+1', flag: '🇦🇸' },
    { code: 'GU', name: 'Guam', dialCode: '+1', flag: '🇬🇺' },
    { code: 'MP', name: 'Northern Mariana Islands', dialCode: '+1', flag: '🇲🇵' },
    { code: 'VI', name: 'U.S. Virgin Islands', dialCode: '+1', flag: '🇻🇮' },
    { code: 'PR', name: 'Puerto Rico', dialCode: '+1', flag: '🇵🇷' },
    { code: 'AI', name: 'Anguilla', dialCode: '+1', flag: '🇦🇮' },
    { code: 'AG', name: 'Antigua and Barbuda', dialCode: '+1', flag: '🇦🇬' },
    { code: 'AW', name: 'Aruba', dialCode: '+297', flag: '🇦🇼' },
    { code: 'BS', name: 'Bahamas', dialCode: '+1', flag: '🇧🇸' },
    { code: 'BB', name: 'Barbados', dialCode: '+1', flag: '🇧🇧' },
    { code: 'BZ', name: 'Belize', dialCode: '+501', flag: '🇧🇿' },
    { code: 'BM', name: 'Bermuda', dialCode: '+1', flag: '🇧🇲' },
    { code: 'VG', name: 'British Virgin Islands', dialCode: '+1', flag: '🇻🇬' },
    { code: 'KY', name: 'Cayman Islands', dialCode: '+1', flag: '🇰🇾' },
    { code: 'CR', name: 'Costa Rica', dialCode: '+506', flag: '🇨🇷' },
    { code: 'CU', name: 'Cuba', dialCode: '+53', flag: '🇨🇺' },
    { code: 'DM', name: 'Dominica', dialCode: '+1', flag: '🇩🇲' },
    { code: 'DO', name: 'Dominican Republic', dialCode: '+1', flag: '🇩🇴' },
    { code: 'SV', name: 'El Salvador', dialCode: '+503', flag: '🇸🇻' },
    { code: 'GD', name: 'Grenada', dialCode: '+1', flag: '🇬🇩' },
    { code: 'GT', name: 'Guatemala', dialCode: '+502', flag: '🇬🇹' },
    { code: 'HT', name: 'Haiti', dialCode: '+509', flag: '🇭🇹' },
    { code: 'HN', name: 'Honduras', dialCode: '+504', flag: '🇭🇳' },
    { code: 'JM', name: 'Jamaica', dialCode: '+1', flag: '🇯🇲' },
    { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
    { code: 'NI', name: 'Nicaragua', dialCode: '+505', flag: '🇳🇮' },
    { code: 'PA', name: 'Panama', dialCode: '+507', flag: '🇵🇦' },
    { code: 'KN', name: 'Saint Kitts and Nevis', dialCode: '+1', flag: '🇰🇳' },
    { code: 'LC', name: 'Saint Lucia', dialCode: '+1', flag: '🇱🇨' },
    { code: 'VC', name: 'Saint Vincent and the Grenadines', dialCode: '+1', flag: '🇻🇨' },
    { code: 'TT', name: 'Trinidad and Tobago', dialCode: '+1', flag: '🇹🇹' },
    { code: 'TC', name: 'Turks and Caicos Islands', dialCode: '+1', flag: '🇹🇨' },
    { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
    { code: 'BO', name: 'Bolivia', dialCode: '+591', flag: '🇧🇴' },
    { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
    { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
    { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
    { code: 'EC', name: 'Ecuador', dialCode: '+593', flag: '🇪🇨' },
    { code: 'FK', name: 'Falkland Islands', dialCode: '+500', flag: '🇫🇰' },
    { code: 'GF', name: 'French Guiana', dialCode: '+594', flag: '🇬🇫' },
    { code: 'GY', name: 'Guyana', dialCode: '+592', flag: '🇬🇾' },
    { code: 'PY', name: 'Paraguay', dialCode: '+595', flag: '🇵🇾' },
    { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
    { code: 'SR', name: 'Suriname', dialCode: '+597', flag: '🇸🇷' },
    { code: 'UY', name: 'Uruguay', dialCode: '+598', flag: '🇺🇾' },
    { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪' },
    { code: 'DZ', name: 'Algeria', dialCode: '+213', flag: '🇩🇿' },
    { code: 'AO', name: 'Angola', dialCode: '+244', flag: '🇦🇴' },
    { code: 'BW', name: 'Botswana', dialCode: '+267', flag: '🇧🇼' },
    { code: 'BI', name: 'Burundi', dialCode: '+257', flag: '🇧🇮' },
    { code: 'CM', name: 'Cameroon', dialCode: '+237', flag: '🇨🇲' },
    { code: 'CV', name: 'Cape Verde', dialCode: '+238', flag: '🇨🇻' },
    { code: 'CF', name: 'Central African Republic', dialCode: '+236', flag: '🇨🇫' },
    { code: 'TD', name: 'Chad', dialCode: '+235', flag: '🇹🇩' },
    { code: 'KM', name: 'Comoros', dialCode: '+269', flag: '🇰🇲' },
    { code: 'CG', name: 'Congo', dialCode: '+242', flag: '🇨🇬' },
    { code: 'CD', name: 'Democratic Republic of the Congo', dialCode: '+243', flag: '🇨🇩' },
    { code: 'CI', name: 'Côte d\'Ivoire', dialCode: '+225', flag: '🇨🇮' },
    { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
    { code: 'GQ', name: 'Equatorial Guinea', dialCode: '+240', flag: '🇬🇶' },
    { code: 'GA', name: 'Gabon', dialCode: '+241', flag: '🇬🇦' },
    { code: 'GM', name: 'Gambia', dialCode: '+220', flag: '🇬🇲' },
    { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
    { code: 'GN', name: 'Guinea', dialCode: '+224', flag: '🇬🇳' },
    { code: 'GW', name: 'Guinea-Bissau', dialCode: '+245', flag: '🇬🇼' },
    { code: 'LR', name: 'Liberia', dialCode: '+231', flag: '🇱🇷' },
    { code: 'LY', name: 'Libya', dialCode: '+218', flag: '🇱🇾' },
    { code: 'MG', name: 'Madagascar', dialCode: '+261', flag: '🇲🇬' },
    { code: 'MW', name: 'Malawi', dialCode: '+265', flag: '🇲🇼' },
    { code: 'ML', name: 'Mali', dialCode: '+223', flag: '🇲🇱' },
    { code: 'MR', name: 'Mauritania', dialCode: '+222', flag: '🇲🇷' },
    { code: 'MU', name: 'Mauritius', dialCode: '+230', flag: '🇲🇺' },
    { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
    { code: 'MZ', name: 'Mozambique', dialCode: '+258', flag: '🇲🇿' },
    { code: 'NA', name: 'Namibia', dialCode: '+264', flag: '🇳🇦' },
    { code: 'NE', name: 'Niger', dialCode: '+227', flag: '🇳🇪' },
    { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
    { code: 'SN', name: 'Senegal', dialCode: '+221', flag: '🇸🇳' },
    { code: 'SC', name: 'Seychelles', dialCode: '+248', flag: '🇸🇨' },
    { code: 'SL', name: 'Sierra Leone', dialCode: '+232', flag: '🇸🇱' },
    { code: 'ST', name: 'São Tomé and Príncipe', dialCode: '+239', flag: '🇸🇹' },
    { code: 'SD', name: 'Sudan', dialCode: '+249', flag: '🇸🇩' },
    { code: 'SZ', name: 'Eswatini', dialCode: '+268', flag: '🇸🇿' },
    { code: 'TN', name: 'Tunisia', dialCode: '+216', flag: '🇹🇳' },
    { code: 'ZM', name: 'Zambia', dialCode: '+260', flag: '🇿🇲' },
    { code: 'ZW', name: 'Zimbabwe', dialCode: '+263', flag: '🇿🇼' },
  ];

  // Extract only the phone digits from the value (remove country code)
  const getPhoneDigits = (value) => {
    if (!value) return '';
    
    // If value is already just digits (no country code), return as is
    if (/^\d+$/.test(value)) {
      return value;
    }
    
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Remove country code if it's already there
    const countryCode = selectedCountry.dialCode.replace('+', '');
    let phoneDigits = digits;
    
    if (digits.startsWith(countryCode)) {
      phoneDigits = digits.substring(countryCode.length);
    }
    
    
    // Return only the phone digits (without country code) for display
    return phoneDigits;
  };

  // Handle country selection
  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    
    // Extract phone digits from current value
    if (value) {
      const phoneDigits = getPhoneDigits(value);
      onChange(phoneDigits);
      
      // Update full number with new country code
      if (onFullNumberChange) {
        const fullNumber = phoneDigits ? `${country.dialCode}${phoneDigits}` : '';
        onFullNumberChange(fullNumber);
      }
    }
  };

  // Handle phone number input
  const handlePhoneChange = (e) => {
    const inputValue = e.target.value;
    // Remove all non-digits and limit based on country
    const maxLength = selectedCountry.code === 'KE' ? 9 : 15;
    const digits = inputValue.replace(/\D/g, '').substring(0, maxLength);
    onChange(digits);
    
    // Also provide the full international number
    if (onFullNumberChange) {
      const fullNumber = digits ? `${selectedCountry.dialCode}${digits}` : '';
      onFullNumberChange(fullNumber);
    }
  };

  // Initialize with empty value
  useEffect(() => {
    if (!value) {
      onChange('');
    }
  }, []);

  return (
    <div className="space-y-3">
      {/* Country Selector */}
      <div className="relative">
        <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Country <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-all duration-200 ${
            isDarkMode
              ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600'
              : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg">{selectedCountry.flag}</span>
            <div className="text-left">
              <div className="font-medium">{selectedCountry.name}</div>
              <div className="text-sm opacity-75">{selectedCountry.dialCode}</div>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Dropdown */}
        {isOpen && (
          <div className={`absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-2xl shadow-lg border z-20 ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            {countries.map((country) => (
              <button
                key={country.code}
                type="button"
                onClick={() => handleCountrySelect(country)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  selectedCountry.code === country.code 
                    ? isDarkMode ? 'bg-gray-700 text-white' : 'bg-blue-50 text-blue-700'
                    : isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{country.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{country.name}</div>
                  <div className="text-sm opacity-75">{country.dialCode}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Phone Number Input */}
      <div className="relative">
        <label className={`block text-sm font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Phone Number <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Phone className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          
          <input
            type="tel"
            value={getPhoneDigits(value)}
            onChange={handlePhoneChange}
            className={`w-full pl-10 pr-4 py-3 rounded-2xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
              error
                ? isDarkMode
                  ? 'bg-gray-700 border-red-500 text-white'
                  : 'bg-white border-red-500 text-gray-900'
                : isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
            } ${className}`}
            placeholder={selectedCountry.code === 'KE' ? '712345678' : 'Enter phone number'}
            maxLength={selectedCountry.code === 'KE' ? 9 : 15}
          />
        </div>
        
        {/* Error Message */}
        {error && (
          <p className={`mt-1 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
            {error}
          </p>
        )}
        
        {/* Format Help */}
        <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {selectedCountry.code === 'KE' 
            ? `Enter 9 digits (e.g., 712345678) - Country code ${selectedCountry.dialCode} is automatically added`
            : `Enter phone digits - Country code ${selectedCountry.dialCode} is automatically added`
          }
        </p>
      </div>
    </div>
  );
};

export default PhoneNumberInput;