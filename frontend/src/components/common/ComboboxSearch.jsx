import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

export default function ComboboxSearch({ 
  value, 
  onChange, 
  onSearch, 
  placeholder = "Search...",
  initialName = ""
}) {
  const [query, setQuery] = useState(initialName);
  const [options, setOptions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value) {
      setQuery('');
    } else if (initialName && query === '') {
      setQuery(initialName);
    }
  }, [value, initialName]);

  const fetchOptions = async (searchText) => {
    setLoading(true);
    try {
      const results = await onSearch(searchText);
      setOptions(results || []);
    } catch (e) {
      console.error(e);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!isOpen) setIsOpen(true);
    fetchOptions(val);
  };

  const handleSelect = (option) => {
    setQuery(option.name);
    onChange(option.id);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          className="w-full bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--primary)] pr-10"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => { setIsOpen(true); fetchOptions(query); }}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">
          <Search className="w-4 h-4" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-sm text-muted text-center">Searching...</div>
          ) : options.length === 0 ? (
            <div className="p-3 text-sm text-muted text-center">No results found</div>
          ) : (
            <ul className="py-1">
              {options.map((opt) => (
                <li
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  className={`px-4 py-2 text-sm cursor-pointer hover:bg-surface ${value === opt.id ? 'text-[var(--primary)] font-bold bg-surface/50' : 'text-foreground'}`}
                >
                  <div>{opt.name}</div>
                  {opt.email && <div className="text-xs text-muted">{opt.email}</div>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
