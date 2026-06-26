import { useEffect, type ReactNode } from 'react';
import { I18nProvider } from '../../shared/i18n';
import type { AppSettings } from '../../shared/types/common';

interface AppProvidersProps {
  settings: AppSettings;
  children: ReactNode;
}

export function AppProviders({ settings, children }: AppProvidersProps) {
  useEffect(() => {
    document.documentElement.dataset.theme = settings.themeMode;
  }, [settings.themeMode]);

  useEffect(() => {
    document.documentElement.dataset.density = settings.uiDensity;
    document.documentElement.dataset.accent = settings.accentColor;
  }, [settings.uiDensity, settings.accentColor]);

  useEffect(() => {
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  return <I18nProvider language={settings.language}>{children}</I18nProvider>;
}
