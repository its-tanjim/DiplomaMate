import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Building2, ChevronDown, Check, X } from 'lucide-react';
import { COLLEGES_DIRECTORY, normalizeCollege } from '../../data/directoryData';
import { CollegeItem } from '../../types';

interface SearchableCollegeSelectProps {
  value: string;
  onChange: (collegeName: string, collegeItem: CollegeItem) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const SearchableCollegeSelect: React.FC<SearchableCollegeSelectProps> = ({
  value,
  onChange,
  label = 'Polytechnic Institution',
  placeholder = 'Search colleges...',
  error,
  disabled = false,
  required = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Find currently selected college item
  const selectedCollege = useMemo(() => {
    return value ? normalizeCollege(value) : undefined;
  }, [value]);

  // Filter colleges based on search query
  const filteredColleges = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COLLEGES_DIRECTORY;

    return COLLEGES_DIRECTORY.filter(college => {
      const matchName = college.name.toLowerCase().includes(q);
      const matchShort = college.shortName?.toLowerCase().includes(q);
      const matchDistrict = college.district.toLowerCase().includes(q);
      const matchDivision = college.division.toLowerCase().includes(q);
      const matchAliases = college.aliases.some(a => a.toLowerCase().includes(q));
      return matchName || matchShort || matchDistrict || matchDivision || matchAliases;
    });
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (college: CollegeItem) => {
    onChange(college.name, college);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', COLLEGES_DIRECTORY[0]);
    setQuery('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredColleges.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev > 0 ? prev - 1 : filteredColleges.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredColleges[highlightedIndex]) {
        handleSelect(filteredColleges[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-text-primary mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>{label}</span>
            {required && <span className="text-rose-500">*</span>}
          </span>
        </label>
      )}

      {/* Main trigger / input button */}
      <div
        className={`w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
          error ? 'border-rose-400 bg-rose-50/30' : isOpen ? 'border-blue-500 ring-2 ring-blue-500/20 bg-surface' : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(prev => !prev);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          {selectedCollege ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-text-primary truncate">
                {selectedCollege.name}
              </span>
              {selectedCollege.isWomenOnly && (
                <span className="bg-pink-50 text-pink-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-pink-200 shrink-0">
                  Mohila
                </span>
              )}
              <span className="bg-blue-50 text-blue-700 text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-blue-200 shrink-0">
                {selectedCollege.district}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 truncate">Select your polytechnic institution...</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {selectedCollege && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-rose-500 mt-1 font-medium">{error}</p>
      )}

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-surface border border-slate-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Autocomplete Search input inside dropdown */}
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-slate-200 rounded-lg text-text-primary placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* List of colleges */}
          <ul
            ref={listRef}
            className="max-h-60 overflow-y-auto divide-y divide-slate-100 py-1 text-xs"
            role="listbox"
          >
            {filteredColleges.length === 0 ? (
              <li className="p-4 text-center text-slate-400 text-xs">
                No matching polytechnic found for "{query}".
                <div className="mt-1 text-[11px] text-slate-500">
                  Please check the spelling or district name.
                </div>
              </li>
            ) : (
              filteredColleges.map((college, idx) => {
                const isSelected = selectedCollege?.id === college.id;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={college.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(college)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-blue-50/80 text-blue-900 font-semibold'
                        : isHighlighted
                        ? 'bg-slate-50 text-text-primary'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-xs text-text-primary">
                          {college.name}
                        </span>
                        {college.shortName && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({college.shortName})
                          </span>
                        )}
                        {college.isWomenOnly && (
                          <span className="bg-pink-100 text-pink-700 text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                            Female Campus
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                        <span>District: <strong className="text-slate-600 font-normal">{college.district}</strong></span>
                        <span>•</span>
                        <span>Division: <strong className="text-slate-600 font-normal">{college.division}</strong></span>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </li>
                );
              })
            )}
          </ul>

          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Showing {filteredColleges.length} of 46 institutions</span>
            <span>Use ↑↓ keys & Enter</span>
          </div>
        </div>
      )}
    </div>
  );
};
