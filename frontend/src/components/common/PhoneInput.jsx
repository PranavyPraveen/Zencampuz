import React from 'react';
import { ChevronDown } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+91', label: 'IN (+91)', maxLen: 10 },
  { code: '+1', label: 'US/CA (+1)', maxLen: 10 },
  { code: '+44', label: 'UK (+44)', maxLen: 10 },
  { code: '+61', label: 'AU (+61)', maxLen: 9 },
  { code: '+971', label: 'UAE (+971)', maxLen: 9 },
];

export default function PhoneInput({ 
  value = '', 
  countryCode = '+91', 
  onChangePhone, 
  onChangeCode, 
  required = false,
  className = ''
}) {
  // Allow only digits
  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    const currentCodeObj = COUNTRY_CODES.find(c => c.code === countryCode) || COUNTRY_CODES[0];
    if (val.length <= currentCodeObj.maxLen) {
      onChangePhone(val);
    }
  };

  return (
    <div className={`flex items-stretch focus-within:ring-1 focus-within:ring-[#22D3EE] rounded-xl overflow-hidden border border-border bg-background transition-all ${className}`}>
      {/* Country Code Dropdown */}
      <div className="relative border-r border-border bg-surface/30 min-w-[100px]">
        <select
          value={countryCode}
          onChange={(e) => onChangeCode(e.target.value)}
          className="w-full h-full appearance-none bg-transparent px-3 py-2.5 text-foreground text-sm font-medium focus:outline-none cursor-pointer"
        >
          {COUNTRY_CODES.map(c => (
            <option key={c.code} value={c.code} className="bg-background text-foreground">
              {c.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none text-muted">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {/* Phone Number Input */}
      <input
        type="tel"
        required={required}
        value={value}
        onChange={handlePhoneChange}
        placeholder="Phone Number"
        className="flex-1 bg-transparent px-4 py-2.5 text-foreground focus:outline-none min-w-0"
      />
    </div>
  );
}
