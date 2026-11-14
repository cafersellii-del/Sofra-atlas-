import { Languages } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { LANGUAGE_OPTIONS, type AppLanguage } from '../i18n/translations';

interface LanguageSelectorProps {
  variant?: 'header' | 'hero' | 'footer';
}

export function LanguageSelector({ variant = 'header' }: LanguageSelectorProps) {
  const {
    language,
    languageMeta,
    autoByCountry,
    countryLanguage,
    countryLanguageMeta,
    selectedCountryName,
    t,
    selectLanguage,
  } = useLanguage();

  const selectValue = autoByCountry ? 'auto' : language;

  if (variant === 'hero') {
    if (!countryLanguage || !countryLanguageMeta || !selectedCountryName) {
      return null;
    }

    return (
      <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#FAF9F7] border border-[#E6E4DF] text-xs">
        <span className="inline-flex items-center gap-1.5 text-[#575550]">
          <Languages className="w-3.5 h-3.5 text-[#D9043D] shrink-0" />
          <span>
            {t.countryLangLabel} ({selectedCountryName}):{' '}
            <strong className="text-[#141413]">
              {countryLanguageMeta.nativeName}
            </strong>
          </span>
        </span>
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => selectLanguage('auto')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              autoByCountry
                ? 'bg-[#D9043D] text-white'
                : 'bg-white border border-[#E6E4DF] text-[#575550] hover:text-[#141413]'
            }`}
          >
            {countryLanguageMeta.shortCode} ({t.languageAutoShort})
          </button>
          {countryLanguage !== 'tr' && (
            <button
              type="button"
              onClick={() => selectLanguage('tr')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                !autoByCountry && language === 'tr'
                  ? 'bg-[#D9043D] text-white'
                  : 'bg-white border border-[#E6E4DF] text-[#575550] hover:text-[#141413]'
              }`}
            >
              Türkçe
            </button>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className="mt-4">
        <label
          htmlFor="footer-language-select"
          className="block text-xs font-semibold uppercase tracking-wider text-[#575550] mb-2"
        >
          {t.footerLanguageTitle}
        </label>
        <div className="relative max-w-xs">
          <Languages className="w-4 h-4 text-[#D9043D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            id="footer-language-select"
            value={selectValue}
            onChange={(e) =>
              selectLanguage(e.target.value as AppLanguage | 'auto')
            }
            aria-label={t.languageSelectorAria}
            className="w-full pl-9 pr-3 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs font-medium text-[#141413] focus:border-[#D9043D]"
          >
            <option value="auto">
              {t.languageAutoLabel} ({languageMeta.nativeName})
            </option>
            {LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.shortCode} · {opt.nativeName} ({opt.turkishName})
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <Languages className="w-3.5 h-3.5 text-[#D9043D] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <select
        value={selectValue}
        onChange={(e) =>
          selectLanguage(e.target.value as AppLanguage | 'auto')
        }
        aria-label={t.languageSelectorAria}
        title={`${t.languageAutoLabel}: ${languageMeta.nativeName}`}
        className="pl-7 pr-2 py-2 min-h-[40px] rounded-lg border border-[#E6E4DF] bg-white text-xs font-semibold text-[#141413] hover:border-[#D9043D] focus:border-[#D9043D] cursor-pointer"
      >
        <option value="auto">
          {t.languageAutoShort} · {languageMeta.shortCode}
        </option>
        {LANGUAGE_OPTIONS.map((opt) => (
          <option key={opt.code} value={opt.code}>
            {opt.shortCode} · {opt.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
