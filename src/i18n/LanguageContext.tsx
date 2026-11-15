import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ALL_COUNTRY_HUBS } from '../data/countries';
import type { CityId } from '../types/food';
import {
  getLanguageForCityId,
  LANGUAGE_META_MAP,
  LANGUAGE_OPTIONS,
  TRANSLATIONS,
  type AppLanguage,
  type LanguageMeta,
  type UITranslations,
} from './translations';

const STORAGE_AUTO_KEY = 'sofra_atlas_lang_auto';
const STORAGE_MANUAL_KEY = 'sofra_atlas_lang_manual';

function isSupportedLang(val: string | null): val is AppLanguage {
  return Boolean(val && val in TRANSLATIONS);
}

interface LanguageContextValue {
  language: AppLanguage;
  languageMeta: LanguageMeta;
  autoByCountry: boolean;
  countryLanguage: AppLanguage | null;
  countryLanguageMeta: LanguageMeta | null;
  selectedCountryName: string | null;
  t: UITranslations;
  selectLanguage: (choice: AppLanguage | 'auto') => void;
  setAutoByCountry: (enabled: boolean) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  selectedCity,
  forcedLanguage = null,
  children,
}: {
  selectedCity: CityId;
  forcedLanguage?: AppLanguage | null;
  children: ReactNode;
}) {
  const [autoByCountry, setAutoByCountryState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUTO_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [manualLanguage, setManualLanguage] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MANUAL_KEY);
      return isSupportedLang(saved) ? saved : 'tr';
    } catch {
      return 'tr';
    }
  });

  const activeHub = useMemo(
    () =>
      selectedCity === 'all'
        ? null
        : ALL_COUNTRY_HUBS.find((h) => h.id === selectedCity) ?? null,
    [selectedCity]
  );

  const countryLanguage: AppLanguage | null = useMemo(() => {
    if (selectedCity === 'all') return null;
    return getLanguageForCityId(selectedCity);
  }, [selectedCity]);

  const language: AppLanguage = useMemo(() => {
    if (forcedLanguage) {
      return forcedLanguage;
    }
    if (autoByCountry && countryLanguage) {
      return countryLanguage;
    }
    return manualLanguage;
  }, [forcedLanguage, autoByCountry, countryLanguage, manualLanguage]);

  const setAutoByCountry = useCallback((enabled: boolean) => {
    setAutoByCountryState(enabled);
    try {
      localStorage.setItem(STORAGE_AUTO_KEY, String(enabled));
    } catch {
      // ignore storage errors
    }
  }, []);

  const selectLanguage = useCallback(
    (choice: AppLanguage | 'auto') => {
      if (choice === 'auto') {
        setAutoByCountry(true);
        return;
      }
      setAutoByCountry(false);
      setManualLanguage(choice);
      try {
        localStorage.setItem(STORAGE_MANUAL_KEY, choice);
      } catch {
        // ignore storage errors
      }
    },
    [setAutoByCountry]
  );

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      languageMeta: LANGUAGE_META_MAP[language],
      autoByCountry,
      countryLanguage,
      countryLanguageMeta: countryLanguage
        ? LANGUAGE_META_MAP[countryLanguage]
        : null,
      selectedCountryName: activeHub?.country ?? null,
      t: TRANSLATIONS[language],
      selectLanguage,
      setAutoByCountry,
    }),
    [
      language,
      autoByCountry,
      countryLanguage,
      activeHub,
      selectLanguage,
      setAutoByCountry,
    ]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: 'tr',
      languageMeta: LANGUAGE_OPTIONS[0],
      autoByCountry: true,
      countryLanguage: null,
      countryLanguageMeta: null,
      selectedCountryName: null,
      t: TRANSLATIONS.tr,
      selectLanguage: () => {},
      setAutoByCountry: () => {},
    };
  }
  return ctx;
}
