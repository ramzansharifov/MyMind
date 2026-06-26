import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Language, TranslationKey } from './translations';
import { translateText } from './translations';

interface I18nContextValue {
  language: Language;
  t: (value: TranslationKey | (string & {})) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  t: (value) => value,
});

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      t: (text) => translateText(text, language),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
