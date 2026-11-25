import React from 'react';
import type { JSX } from 'react';
import { useLanguage } from '../context/LanguageContext';

// Two-button segmented toggle: English | বাংলা.
// Self-contained — no props needed.
export function LanguageSwitcher(): JSX.Element {
  const { lang, setLanguage } = useLanguage();

  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-1 gap-1" role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={lang === 'en'}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
          lang === 'en' ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-700'
        }`}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => setLanguage('bn')}
        aria-pressed={lang === 'bn'}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
          lang === 'bn' ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-700'
        }`}
      >
        বাংলা
      </button>
    </div>
  );
}
