import React, { createContext, useContext, useEffect, useState } from 'react';
import type { JSX } from 'react';
import { strings } from '../i18n/strings';

export type Language = 'en' | 'bn';

const LANGUAGE_STORAGE_KEY = 'diplomamate-language';

interface LanguageContextValue {
  lang: Language;
  setLanguage: (l: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getInitialLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'bn') return stored;
  } catch {
    // localStorage unavailable (e.g. private mode) — fall back to English.
  }
  return 'en';
}

export function LanguageProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [lang, setLangState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Ignore persistence failures; the in-memory language still applies.
    }
  }, [lang]);

  const setLanguage = (l: Language) => {
    setLangState(l);
  };

  // English fallback, then the key itself — never crash on a missing key.
  const t = (key: string): string => strings[lang][key] ?? strings.en[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): { lang: Language; setLanguage: (l: Language) => void; t: (key: string) => string } {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
