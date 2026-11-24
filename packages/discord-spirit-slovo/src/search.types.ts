import type { Token } from '@interslavic/conllu';
import type { Lang } from './lang.ts';

/** Lookups the bot depends on. Implemented over a SQLite file in the image (src/search.ts). */
export interface Search {
  find(query: string, lang?: Lang): Promise<Result[]>;
  suggest(prefix: string, lang?: Lang): Promise<string[]>;
  word(lemmaKey: string): Promise<WordCard | undefined>;
}

/** Names of one concept per language, Interslavic included. */
export type Labels = { lang: Lang; words: string[]; /** a machine translation nobody has checked */ unchecked?: boolean }[];

/** Where the query matched a concept; one concept can match in several words and languages. */
export interface Match {
  lang: Lang;
  word: string;
  /** exact: the word itself; form: an inflected form of an Interslavic word; stem: same stem; then prefix and fuzzy. */
  how: 'exact' | 'form' | 'stem' | 'prefix' | 'fuzzy';
}

/** A concept the query found: one dictionary row. */
export interface Result {
  /** Namespaced by source: 'steen:6997'. */
  id: string;
  source: 'dictionary';
  /** Interslavic names in standard Latin, the rest as the dictionary writes them. */
  labels: Labels;
  /** Best match first. */
  matched: Match[];
  /** Grammar of the Interslavic names; phrases have none. */
  lemmas: Lemma[];
}

export interface Lemma {
  /** 'oko|NOUN'; a homonym carries its number: 'spasti (2)|VERB'. */
  key: string;
  /** As the dictionary writes it (etymological spelling). */
  isv: string;
  upos: string;
  /** Steenbergen's tag: 'n.', 'v.tr. pf.'. */
  xpos: string;
  /** Principal parts from the dictionary: '(oka/očese; pl. oči)'. */
  addition: string;
}

/** One CoNLL-U token per form, from @interslavic/morphology. */
export type Paradigm = Token[];

export interface WordCard {
  lemma: Lemma;
  /** Every dictionary row this lemma belongs to. */
  senses: Result[];
  paradigm: Paradigm;
}
