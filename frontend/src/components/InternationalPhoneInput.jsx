import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, Check, AlertCircle } from 'lucide-react';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import {
  getAllCountries,
  getCountryByCode,
  formatToE164,
  validatePhoneNumber
} from '../utils/countryData';

const InternationalPhoneInput = ({
  value = '',
  onChange,
  onBlur,
  defaultCountry = 'IN',
  error,
  disabled = false,
  required = false,
  id = 'phone-input',
  name = 'phone',
  placeholder,
  className = ''
}) => {
  const allCountries = useMemo(() => getAllCountries(), []);

  // Determine initial country and national number from incoming value
  const initialData = useMemo(() => {
    if (value && typeof value === 'string' && value.startsWith('+')) {
      try {
        const parsed = parsePhoneNumberFromString(value);
        if (parsed) {
          const matchedCountry = getCountryByCode(parsed.country);
          return {
            country: matchedCountry,
            number: parsed.nationalNumber || ''
          };
        }
      } catch (e) {}
    }
    return {
      country: getCountryByCode(defaultCountry),
      number: (value || '').replace(/\D/g, '')
    };
  }, []);

  const [selectedCountry, setSelectedCountry] = useState(initialData.country);
  const [nationalNumber, setNationalNumber] = useState(initialData.number);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [touched, setTouched] = useState(false);

  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const numberInputRef = useRef(null);

  // Sync if external value changes (e.g. form reset or prefill)
  useEffect(() => {
    if (!value) {
      setNationalNumber('');
      return;
    }
    if (typeof value === 'string' && value.startsWith('+')) {
      try {
        const parsed = parsePhoneNumberFromString(value);
        if (parsed && parsed.country) {
          const matched = getCountryByCode(parsed.country);
          setSelectedCountry(matched);
          setNationalNumber(parsed.nationalNumber || '');
          return;
        }
      } catch (e) {}
    }
    // If digits only
    const digits = String(value).replace(/\D/g, '');
    if (digits && digits !== nationalNumber) {
      setNationalNumber(digits);
    }
  }, [value]);

  // Filter countries by search query (name, dial code, or ISO code)
  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return allCountries;
    const q = searchQuery.toLowerCase().trim();
    return allCountries.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.dialCode.includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  }, [allCountries, searchQuery]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      numberInputRef.current?.focus();
    }
  };

  // When user types national number
  const handleNumberChange = (e) => {
    // Keep only digits and spaces/hyphens entered
    const inputVal = e.target.value;
    const cleanDigits = inputVal.replace(/[^\d\s-]/g, '');
    const digitsOnly = cleanDigits.replace(/\D/g, '');
    setNationalNumber(cleanDigits);

    const e164 = formatToE164(digitsOnly, selectedCountry.code);
    const validation = validatePhoneNumber(digitsOnly, selectedCountry.code);

    if (onChange) {
      onChange(e164, {
        country: selectedCountry.code,
        dialCode: selectedCountry.dialCode,
        nationalNumber: digitsOnly,
        e164,
        isValid: validation.isValid
      });
    }
  };

  // When user selects a new country
  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    setIsOpen(false);

    const digitsOnly = nationalNumber.replace(/\D/g, '');
    const e164 = formatToE164(digitsOnly, country.code);
    const validation = validatePhoneNumber(digitsOnly, country.code);

    if (onChange) {
      onChange(e164, {
        country: country.code,
        dialCode: country.dialCode,
        nationalNumber: digitsOnly,
        e164,
        isValid: validation.isValid
      });
    }

    // Return focus to number input
    setTimeout(() => {
      numberInputRef.current?.focus();
    }, 50);
  };

  const handleBlurInternal = (e) => {
    setTouched(true);
    if (onBlur) onBlur(e);
  };

  // Validation status
  const currentValidation = useMemo(() => {
    if (!nationalNumber.trim()) {
      return { isValid: !required, message: required ? 'Phone number is required.' : '' };
    }
    return validatePhoneNumber(nationalNumber, selectedCountry.code);
  }, [nationalNumber, selectedCountry, required]);

  const displayError = error || (touched && nationalNumber.trim() && !currentValidation.isValid ? currentValidation.message : null);

  // Dynamic placeholder based on selected country
  const dynamicPlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    switch (selectedCountry.code) {
      case 'IN': return '98765 43210';
      case 'US':
      case 'CA': return '(555) 000-0000';
      case 'GB': return '7123 456789';
      case 'AE': return '50 123 4567';
      case 'AU': return '412 345 678';
      case 'DE': return '151 2345678';
      default: return 'Enter phone number';
    }
  }, [placeholder, selectedCountry]);

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Phone Field Container */}
      <div
        className={`flex items-center rounded-2xl glass-input border transition-all duration-200 overflow-hidden ${
          displayError
            ? 'border-red-500/80 ring-2 ring-red-500/10'
            : 'border-[#D9CABB] dark:border-[rgba(230,211,191,0.15)] focus-within:border-[#4A1917] dark:focus-within:border-[#895047] focus-within:ring-2 focus-within:ring-[#4A1917]/15'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {/* Country Selector Button */}
        <button
          type="button"
          id={`${id}-country-btn`}
          data-testid="phone-country-btn"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`Select country code. Current: ${selectedCountry.name} ${selectedCountry.dialCode}`}
          className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2.5 bg-[#EAE1D4]/60 dark:bg-[#352920]/70 hover:bg-[#EAE1D4] dark:hover:bg-[#403127] transition-colors border-r border-[#D9CABB] dark:border-[rgba(230,211,191,0.12)] text-xs font-semibold text-[#39251F] dark:text-[#F6EEE3] shrink-0 select-none group"
        >
          <span className="text-lg leading-none" role="img" aria-label={selectedCountry.name}>
            {selectedCountry.flag}
          </span>
          <span className="font-semibold text-[#77665A] dark:text-[#D1C1B0] hidden md:inline truncate max-w-[90px]">
            {selectedCountry.name}
          </span>
          <span className="text-[#4A1917] dark:text-[#D1C1B0] font-bold tracking-tight">
            {selectedCountry.dialCode}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#968577] group-hover:text-[#39251F] dark:group-hover:text-[#F6EEE3] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* National Number Input */}
        <div className="relative flex-1">
          <input
            ref={numberInputRef}
            type="tel"
            id={id}
            data-testid="phone-national-input"
            name={name}
            value={nationalNumber}
            onChange={handleNumberChange}
            onBlur={handleBlurInternal}
            placeholder={dynamicPlaceholder}
            disabled={disabled}
            autoComplete="tel-national"
            className="w-full bg-transparent px-3.5 py-2.5 text-sm text-[#39251F] dark:text-[#F6EEE3] placeholder:text-[#968577] focus:outline-none"
          />
        </div>
      </div>

      {/* Inline Validation / Error Message */}
      {displayError && (
        <div
          id={`${id}-error-msg`}
          data-testid="phone-error-msg"
          className="flex items-center gap-1 text-[11px] text-[#8B2622] mt-1 pl-1 animate-fadeIn"
        >
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Searchable Dropdown Popup */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-2 w-full sm:w-80 max-h-72 glass-panel-elevated rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-fadeIn"
        >
          {/* Search Header */}
          <div className="p-2 border-b border-[#D9CABB]/60 dark:border-[rgba(230,211,191,0.12)] sticky top-0 bg-[#F5EFE5] dark:bg-[#2B211B] z-10">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#968577]" />
              <input
                ref={searchInputRef}
                type="text"
                id="country-search-input"
                data-testid="country-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or dial code..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#EAE1D4]/70 dark:bg-[#352920]/80 rounded-xl text-[#39251F] dark:text-[#F6EEE3] placeholder:text-[#968577] focus:outline-none focus:ring-1 focus:ring-[#4A1917]"
              />
            </div>
          </div>

          {/* Country List Items */}
          <div className="overflow-y-auto max-h-56 divide-y divide-[#D9CABB]/30 dark:divide-[rgba(230,211,191,0.08)] overscroll-contain">
            {filteredCountries.map((c) => {
              const isSelected = c.code === selectedCountry.code;
              return (
                <button
                  key={`${c.code}-${c.dialCode}`}
                  type="button"
                  id={`country-opt-${c.code}`}
                  data-testid={`country-opt-${c.code}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectCountry(c)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left transition-colors duration-150 ${
                    isSelected
                      ? 'bg-[#4A1917]/10 dark:bg-[#754039]/20 text-[#4A1917] dark:text-[#F6EEE3] font-bold'
                      : 'text-[#39251F] dark:text-[#D1C1B0] hover:bg-[#EAE1D4]/60 dark:hover:bg-[#352920]/70'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate mr-2">
                    <span className="text-base shrink-0 select-none">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-[#968577] font-semibold">{c.dialCode}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#4A1917] dark:text-[#895047] shrink-0" />}
                  </div>
                </button>
              );
            })}
            {filteredCountries.length === 0 && (
              <div className="p-6 text-center text-xs text-[#968577]">
                No matching countries found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InternationalPhoneInput;
