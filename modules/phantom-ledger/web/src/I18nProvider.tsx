import { useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LANG, en, LANGS, vi, type Lang } from './i18n';
import { I18nContext } from './i18nContext';

export const LANG_STORAGE_KEY = 'phantom-ledger.lang';

// Storage can be blocked (privacy settings); the language then just lasts until reload.
function storedLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    return LANGS.find((lang) => lang === stored) ?? DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

function rememberLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // see storedLang
  }
}

export function I18nProvider({ className, children }: { className: string; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(storedLang);
  const value = useMemo(
    () => ({
      lang,
      t: lang === 'vi' ? vi : en,
      setLang: (next: Lang) => {
        rememberLang(next);
        setLangState(next);
      },
    }),
    [lang],
  );
  return (
    <I18nContext value={value}>
      <div className={className} lang={lang}>
        {children}
      </div>
    </I18nContext>
  );
}
