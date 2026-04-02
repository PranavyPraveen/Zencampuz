import React, { useState } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';

export default function PasswordInput({ 
  value = '', 
  onChange, 
  placeholder = "••••••••",
  className = '',
  required = false,
  showStrengthIndicator = true,
  name = "password",
  autoComplete = "off"
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  // Validation rules
  const checks = [
    { label: '8+ chars', valid: value.length >= 8 },
    { label: 'Number', valid: /\d/.test(value) },
    { label: 'Symbol', valid: /[!@#$%^&*(),.?":{}|<>]/.test(value) },
    { label: 'Capital', valid: /[A-Z]/.test(value) },
  ];

  const allValid = checks.every(c => c.valid);

  return (
    <div className="space-y-2 w-full">
      <div className={`relative flex items-center bg-background border rounded-xl overflow-hidden transition-all ${focused ? 'border-[#22D3EE] ring-1 ring-[#22D3EE]/50' : 'border-border hover:border-[#2563EB]/50'} ${className}`}>
        <input
          name={name}
          type={show ? 'text' : 'password'}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent px-4 py-2.5 text-foreground focus:outline-none placeholder-[#64748B]"
        />
        <button
          type="button"
          tabIndex="-1"
          onClick={() => setShow(!show)}
          className="px-4 text-muted hover:text-[var(--primary)] transition-colors focus:outline-none"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {showStrengthIndicator && value.length > 0 && (
        <div className="bg-surface/50 rounded-lg p-3 border border-border space-y-2 mt-2">
          {/* Progress bar */}
          <div className="h-1.5 w-full bg-foreground/5 rounded-full overflow-hidden flex">
            {checks.map((c, i) => (
              <div 
                key={i} 
                className={`h-full flex-1 transition-all duration-300 border-r border-[#0E1630] last:border-0 ${
                  c.valid 
                    ? (allValid ? 'bg-[#10B981]' : 'bg-[#F59E0B]') 
                    : 'bg-foreground/5'
                }`} 
              />
            ))}
          </div>
          
          {/* Check labels */}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
            {checks.map((check, i) => (
              <div key={i} className={`flex items-center gap-1.5 text-xs ${check.valid ? 'text-[#10B981]' : 'text-muted'}`}>
                {check.valid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                <span>{check.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
