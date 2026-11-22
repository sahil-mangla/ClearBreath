import { DEFAULT_LANG } from '../src/languages.js';
import { createContext, useCallback, useContext } from 'react';
import { translate } from './strings.js';

export const LangContext = createContext(DEFAULT_LANG);

export const useLang = () => useContext(LangContext);

/**
 * `t(key, vars)` in the given interface language.
 * @param {string} lang
 */
export function useTranslator(lang) {
  return useCallback(
    /** @param {string} key @param {Record<string, string|number>} [vars] */
    (key, vars) => translate(lang, key, vars),
    [lang],
  );
}

/** `t(key, vars)` in the current interface language, for components inside the provider. */
export const useT = () => useTranslator(useLang());
