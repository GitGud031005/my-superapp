import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import { I18nProvider, LANG_STORAGE_KEY } from './I18nProvider';
import type { Lang } from './i18n';

export function renderIn(ui: ReactElement, lang: Lang = 'en') {
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  return render(<I18nProvider className="p5r-scope">{ui}</I18nProvider>);
}

export function stubResizeObserver() {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
}
