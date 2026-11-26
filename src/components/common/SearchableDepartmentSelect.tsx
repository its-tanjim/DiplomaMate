import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Cpu, ChevronDown, Check, X, Sparkles } from 'lucide-react';
import { TECHNOLOGIES_DIRECTORY, normalizeTechnology } from '../../data/directoryData';
import { TechnologyItem } from '../../types';

interface SearchableDepartmentSelectProps {
  value: string;
  onChange: (departmentName: string, technologyItem: TechnologyItem) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const SearchableDepartmentSelect: React.FC<SearchableDepartmentSelectProps> = ({
  value,
  onChange,
  label = 'Department / Technology',
  placeholder = 'Search technologies...',
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

  // Find currently selected technology
  const selectedTech = useMemo(() => {
    return value ? normalizeTechnology(value) : undefined;
  }, [value]);

  // Filter technologies based on query
  const filteredTechs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TECHNOLOGIES_DIRECTORY;

    return TECHNOLOGIES_DIRECTORY.filter(tech => {
      const matchName = tech.name.toLowerCase().includes(q);
      const matchCode = tech.shortCode.toLowerCase().includes(q);
      const matchAliases = tech.aliases.some(a => a.toLowerCase().includes(q));
      return matchName || matchCode || matchAliases;
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

  const handleSelect = (tech: TechnologyItem) => {
    onChange(tech.name, tech);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', TECHNOLOGIES_DIRECTORY[3]);
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
        prev < filteredTechs.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev > 0 ? prev - 1 : filteredTechs.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredTechs[highlightedIndex]) {
        handleSelect(filteredTechs[highlightedIndex]);
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
            <Cpu aria-hidden="true" className="w-3.5 h-3.5 text-teal-600" />
            <span>{label}</span>
            {required && <span className="text-rose-500">*</span>}
          </span>
        </label>
      )}

      {/* Main trigger button */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-label={label || 'Select department / technology'}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          if ((e.target as HTMLElement).closest('button')) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(prev => !prev);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        className={`w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
          error ? 'border-rose-400 bg-rose-50/30' : isOpen ? 'border-teal-500 ring-2 ring-teal-500/20 bg-surface' : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(prev => !prev);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
          <Search aria-hidden="true" className="w-4 h-4 text-slate-400 shrink-0" />
          {selectedTech ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="bg-teal-50 text-teal-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md border border-teal-200 shrink-0">
                {selectedTech.shortCode}
              </span>
              <span className="font-semibold text-text-primary truncate">
                {selectedTech.name}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 truncate">Select department / technology...</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {selectedTech && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              aria-label="Clear selection"
              title="Clear selection"
            >
              <X aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown aria-hidden="true" className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
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
              <Search aria-hidden="true" className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
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
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-slate-200 rounded-lg text-text-primary placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* List of technologies */}
          <ul
            ref={listRef}
            className="max-h-60 overflow-y-auto divide-y divide-slate-100 py-1 text-xs"
            role="listbox"
          >
            {filteredTechs.length === 0 ? (
              <li className="p-4 text-center text-slate-400 text-xs">
                No matching technology found for "{query}".
                <div className="mt-1 text-[11px] text-slate-500">
                  Try searching by abbreviation (e.g. CST, RAC, MECH).
                </div>
              </li>
            ) : (
              filteredTechs.map((tech, idx) => {
                const isSelected = selectedTech?.id === tech.id;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={tech.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(tech)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-teal-50/80 text-teal-900 font-semibold'
                        : isHighlighted
                        ? 'bg-slate-50 text-text-primary'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                        {tech.shortCode}
                      </span>
                      <span className="font-medium text-xs text-text-primary truncate">
                        {tech.name}
                      </span>
                    </div>

                    {isSelected && (
                      <Check aria-hidden="true" className="w-4 h-4 text-teal-600 shrink-0" />
                    )}
                  </li>
                );
              })
            )}
          </ul>

          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Showing {filteredTechs.length} of 19 official technologies</span>
            <span>Use ↑↓ keys & Enter</span>
          </div>
        </div>
      )}
    </div>
  );
};
