import { ApiError } from './api';
import type { Strings } from './i18n';

export function errorText(t: Strings, error: unknown): string {
  return error instanceof ApiError ? t.errorWithDetail(error.message) : t.errorGeneric;
}
