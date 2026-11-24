import { transliterate } from '@interslavic/translit';

/** Languages in the order of the dictionary's columns. */
export const LANGS = ['isv', 'en', 'ru', 'be', 'uk', 'pl', 'cs', 'sk', 'sl', 'hr', 'sr', 'mk', 'bg'] as const;
export type Lang = (typeof LANGS)[number];

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (LANGS as readonly string[]).includes(value);
}

/** Endonyms for the command's language option. */
export const ENDONYMS: Record<Lang, string> = {
  isv: 'Medžuslovjansky',
  en: 'English',
  ru: 'Русский',
  be: 'Беларуская',
  uk: 'Українська',
  pl: 'Polski',
  cs: 'Čeština',
  sk: 'Slovenčina',
  sl: 'Slovenščina',
  hr: 'Hrvatski',
  sr: 'Српски',
  mk: 'Македонски',
  bg: 'Български',
};

/** The dictionary uses etymological spelling (vodų, ględati); readers type standard Latin (vodu, gledati). */
export function standard(isv: string): string {
  return transliterate(isv, 'isv-Latn');
}

/**
 * Search key: lowercase, no diacritics. Interslavic goes through standard Latin first,
 * so etymological, Latin and Cyrillic spellings give the same key.
 */
export function fold(text: string, lang: Lang): string {
  const base = lang === 'isv' ? standard(text) : text;
  return base.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Dictionary language of a Discord client locale: "en-US" gives en, "de" gives nothing. */
export function langOfLocale(locale: string | undefined): Lang | undefined {
  const code = locale?.split('-')[0];
  return isLang(code) && code !== 'isv' ? code : undefined;
}
