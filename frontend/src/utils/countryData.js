import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, isValidPhoneNumber } from 'libphonenumber-js';

// English display names for regions
const regionNames = typeof Intl !== 'undefined' && Intl.DisplayNames
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

// Convert 2-letter ISO code to emoji flag
export const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// Priority/Top countries to show at the top of the list
const PRIORITY_COUNTRY_CODES = ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'DE', 'FR', 'SG', 'SA', 'JP'];

// Generate full sorted country list
let cachedCountries = null;

export const getAllCountries = () => {
  if (cachedCountries) return cachedCountries;

  const rawList = getCountries().map(code => {
    let name = code;
    try {
      name = regionNames ? regionNames.of(code) || code : code;
    } catch (e) {
      name = code;
    }
    let dialCode = '';
    try {
      dialCode = '+' + getCountryCallingCode(code);
    } catch (e) {
      dialCode = '';
    }
    return {
      code,
      name,
      dialCode,
      flag: getFlagEmoji(code)
    };
  }).filter(c => c.dialCode);

  // Sort alphabetically
  rawList.sort((a, b) => a.name.localeCompare(b.name));

  // Extract priority countries in order
  const priority = [];
  const others = [];

  for (const code of PRIORITY_COUNTRY_CODES) {
    const found = rawList.find(c => c.code === code);
    if (found) priority.push(found);
  }

  for (const c of rawList) {
    if (!PRIORITY_COUNTRY_CODES.includes(c.code)) {
      others.push(c);
    }
  }

  cachedCountries = [...priority, ...others];
  return cachedCountries;
};

// Get single country by 2-letter code
export const getCountryByCode = (code = 'IN') => {
  const upper = (code || 'IN').toUpperCase();
  const list = getAllCountries();
  return list.find(c => c.code === upper) || list.find(c => c.code === 'IN') || {
    code: 'IN',
    name: 'India',
    dialCode: '+91',
    flag: '🇮🇳'
  };
};

// Find country by calling code
export const findCountryByDialCode = (dialCode) => {
  if (!dialCode) return null;
  const normalized = dialCode.startsWith('+') ? dialCode : '+' + dialCode;
  const list = getAllCountries();
  return list.find(c => c.dialCode === normalized) || null;
};

// Format phone number to E.164
export const formatToE164 = (nationalNumber, countryCode = 'IN') => {
  if (!nationalNumber) return '';
  const digits = nationalNumber.replace(/\D/g, '');
  if (!digits) return '';

  const country = getCountryByCode(countryCode);
  const fullWithCode = country.dialCode + digits;

  try {
    const parsed = parsePhoneNumberFromString(digits, countryCode);
    if (parsed && parsed.isValid()) {
      return parsed.format('E.164');
    }
    const parsedFull = parsePhoneNumberFromString(fullWithCode);
    if (parsedFull && parsedFull.isValid()) {
      return parsedFull.format('E.164');
    }
  } catch (e) {}

  // Fallback direct concatenation
  return country.dialCode + digits;
};

// Validate phone number for a given country
export const validatePhoneNumber = (nationalNumber, countryCode = 'IN') => {
  if (!nationalNumber || !nationalNumber.trim()) {
    return { isValid: false, message: 'Phone number is required.' };
  }
  const digits = nationalNumber.replace(/\D/g, '');
  if (digits.length < 5) {
    return { isValid: false, message: 'Please enter a valid phone number.' };
  }

  const country = getCountryByCode(countryCode);
  const fullWithCode = country.dialCode + digits;

  try {
    if (isValidPhoneNumber(digits, countryCode) || isValidPhoneNumber(fullWithCode)) {
      return { isValid: true, message: '' };
    }
  } catch (e) {}

  return { isValid: false, message: 'Please enter a valid phone number.' };
};
