import { createContext, useCallback, useContext } from 'react';
import { translate } from './strings.js';

export const LangContext = createContext('en');

export const useLang = () => useContext(LangContext);

/** `t(key, vars)` in the current interface language. */
export function useT() {
  const lang = useLang();
  return useCallback((key, vars) => translate(lang, key, vars), [lang]);
}
