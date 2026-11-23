import { Button } from '@superapp/p5r-ds';
import { LANG_NAMES, LANGS } from './i18n';
import { useLang, useT } from './i18nContext';

export function LangToggle() {
  const t = useT();
  const { lang, setLang } = useLang();
  return (
    <div role="group" aria-label={t.language} className="phantom-ledger__actions">
      {LANGS.map((code) => (
        <Button
          key={code}
          size="sm"
          variant="light"
          className="phantom-ledger__lang"
          lang={code}
          aria-label={`${code.toUpperCase()}: ${LANG_NAMES[code]}`}
          aria-pressed={code === lang}
          onClick={() => setLang(code)}
        >
          {code.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
