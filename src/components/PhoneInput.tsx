import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import '../styles/components/PhoneInput.css';

// Curated list of country dial codes (common first)
export const COUNTRY_CODES = [
  { code: '+34', iso: 'es', name: 'España' },
  { code: '+376', iso: 'ad', name: 'Andorra' },
  { code: '+351', iso: 'pt', name: 'Portugal' },
  { code: '+33', iso: 'fr', name: 'Francia' },
  { code: '+49', iso: 'de', name: 'Alemania' },
  { code: '+39', iso: 'it', name: 'Italia' },
  { code: '+44', iso: 'gb', name: 'Reino Unido' },
  { code: '+1', iso: 'us', name: 'Estados Unidos' },
  { code: '+52', iso: 'mx', name: 'México' },
  { code: '+54', iso: 'ar', name: 'Argentina' },
  { code: '+57', iso: 'co', name: 'Colombia' },
  { code: '+56', iso: 'cl', name: 'Chile' },
  { code: '+51', iso: 'pe', name: 'Perú' },
  { code: '+58', iso: 've', name: 'Venezuela' },
  { code: '+593', iso: 'ec', name: 'Ecuador' },
  { code: '+598', iso: 'uy', name: 'Uruguay' },
  { code: '+591', iso: 'bo', name: 'Bolivia' },
  { code: '+595', iso: 'py', name: 'Paraguay' },
  { code: '+502', iso: 'gt', name: 'Guatemala' },
  { code: '+503', iso: 'sv', name: 'El Salvador' },
  { code: '+504', iso: 'hn', name: 'Honduras' },
  { code: '+505', iso: 'ni', name: 'Nicaragua' },
  { code: '+506', iso: 'cr', name: 'Costa Rica' },
  { code: '+507', iso: 'pa', name: 'Panamá' },
  { code: '+53', iso: 'cu', name: 'Cuba' },
  { code: '+1809', iso: 'do', name: 'Rep. Dominicana' },
  { code: '+55', iso: 'br', name: 'Brasil' },
  { code: '+32', iso: 'be', name: 'Bélgica' },
  { code: '+31', iso: 'nl', name: 'Países Bajos' },
  { code: '+41', iso: 'ch', name: 'Suiza' },
  { code: '+43', iso: 'at', name: 'Austria' },
  { code: '+48', iso: 'pl', name: 'Polonia' },
  { code: '+30', iso: 'gr', name: 'Grecia' },
  { code: '+212', iso: 'ma', name: 'Marruecos' },
  { code: '+213', iso: 'dz', name: 'Argelia' },
  { code: '+216', iso: 'tn', name: 'Túnez' },
  { code: '+20', iso: 'eg', name: 'Egipto' },
  { code: '+86', iso: 'cn', name: 'China' },
  { code: '+81', iso: 'jp', name: 'Japón' },
  { code: '+82', iso: 'kr', name: 'Corea del Sur' },
  { code: '+91', iso: 'in', name: 'India' },
  { code: '+7', iso: 'ru', name: 'Rusia' },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  id?: string;
  name?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export function PhoneInput({
  value,
  onChange,
  required = false,
  id,
  name,
  placeholder = '600 000 000',
  className = '',
  disabled = false,
  onFocus,
  onBlur
}: PhoneInputProps) {
  const [internalCountryCode, setInternalCountryCode] = useState('+34');
  const [internalPhone, setInternalPhone] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Split external value on mount or change when externally provided
  useEffect(() => {
    let matchedCode = '+34';
    let phonePart = value || '';

    // If there is a space, try to find a code matching the first part
    if (value && value.includes(' ')) {
      const parts = value.split(' ');
      const potentialCode = parts[0];
      const match = COUNTRY_CODES.find(c => c.code === potentialCode);
      if (match) {
        matchedCode = match.code;
        phonePart = parts.slice(1).join(' ');
      }
    } else if (value && value.startsWith('+')) {
      // Find the longest matching prefix
      let longestMatch = null;
      for (const c of COUNTRY_CODES) {
        if (value.startsWith(c.code)) {
          if (!longestMatch || c.code.length > longestMatch.code.length) {
            longestMatch = c;
          }
        }
      }
      if (longestMatch) {
        matchedCode = longestMatch.code;
        phonePart = value.substring(longestMatch.code.length).trim();
      }
    }

    setInternalCountryCode(matchedCode);
    setInternalPhone(phonePart);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setInternalPhone(rawVal);
    // If the phone value is empty, emit empty string so we don't save just the country code.
    if (rawVal.trim() === '') {
      onChange('');
    } else {
      onChange(`${internalCountryCode} ${rawVal}`);
    }
  };

  const handleCountrySelect = (code: string) => {
    setInternalCountryCode(code);
    setIsDropdownOpen(false);
    setSearchQuery('');
    if (internalPhone.trim() !== '') {
      onChange(`${code} ${internalPhone}`);
    }
  };

  const filteredCountries = COUNTRY_CODES.filter(country => 
    country.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    country.code.includes(searchQuery)
  );

  return (
    <div className={`phone-input-group ${className} ${disabled ? 'disabled' : ''}`} style={disabled ? { opacity: 0.6, cursor: 'not-allowed' } : {}}>
      <div className="custom-country-select" ref={dropdownRef}>
        <div 
          className="custom-country-select-trigger" 
          onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {(() => {
              const selected = COUNTRY_CODES.find(c => c.code === internalCountryCode) || COUNTRY_CODES[0];
              return (
                <>
                  <img src={`https://flagcdn.com/w20/${selected.iso}.png`} srcSet={`https://flagcdn.com/w40/${selected.iso}.png 2x`} width="20" alt={selected.name} style={{ borderRadius: '2px', objectFit: 'cover' }} />
                  {selected.code}
                </>
              );
            })()}
          </span>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
        </div>
        
        {isDropdownOpen && (
          <div className="country-dropdown">
            <div className="country-search-container">
              <Search size={14} className="country-search-icon" />
              <input
                type="text"
                className="country-search"
                placeholder="Buscar país..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="country-options">
              {filteredCountries.map((c) => (
                <div 
                  key={c.code + c.name} 
                  className={`country-option ${internalCountryCode === c.code ? 'selected' : ''}`}
                  onClick={() => handleCountrySelect(c.code)}
                >
                  <img src={`https://flagcdn.com/w20/${c.iso}.png`} srcSet={`https://flagcdn.com/w40/${c.iso}.png 2x`} width="20" alt={c.name} style={{ borderRadius: '2px', objectFit: 'cover' }} />
                  <span>{c.name}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>{c.code}</span>
                </div>
              ))}
              {filteredCountries.length === 0 && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No se encontraron países
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <input
        id={id}
        name={name}
        type="tel"
        value={internalPhone}
        onChange={handlePhoneChange}
        onFocus={onFocus}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        className="phone-number-input"
        placeholder={placeholder}
        inputMode="numeric"
      />
    </div>
  );
}
