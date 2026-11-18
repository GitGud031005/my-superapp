import { createContext, useContext } from 'react';
import { DEFAULT_LANG, vi, type Lang, type Strings } from './i18n';

export interface I18n {
  lang: Lang;
  t: Strings;
  setLang: (lang: Lang) => void;
}

export const I18nContext = createContext<I18n>({ lang: DEFAULT_LANG, t: vi, setLang: () => {} });

export const useT = (): Strings => useContext(I18nContext).t;

export const useLang = (): Pick<I18n, 'lang' | 'setLang'> => {
  const { lang, setLang } = useContext(I18nContext);
  return { lang, setLang };
};
