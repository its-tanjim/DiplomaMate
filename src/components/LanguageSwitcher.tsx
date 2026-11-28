import React from 'react';
import type { JSX } from 'react';
import { Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Two pill buttons: English | বাংলা.
// Selected pill is a blue gradient with a white checkmark circle on the
// right; the unselected pill is grey with an empty circle outline.
// Self-contained — no props needed. Used only by SettingsScreen.
export function LanguageSwitcher(): JSX.Element {
  const { lang, setLanguage } = useLanguage();

  return (
    <div className="relative flex flex-wrap gap-2" role="group" aria-label="Language">
      {([
        { value: 'en', label: 'English' },
        { value: 'bn', label: 'বাংলা' },
      ] as const).map(({ value, label }) => {
        const selected = lang === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setLanguage(value)}
            aria-pressed={selected}
            className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-full text-sm font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
              selected
                ? 'bg-gradient-to-r from-[#2b6fe0] to-[#4338ca] text-white shadow-lg shadow-blue-600/30 ring-2 ring-white/70'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            <span>{label}</span>
            {selected ? (
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-[#2b6fe0]" aria-hidden="true" />
              </span>
            ) : (
              <span aria-hidden="true" className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
