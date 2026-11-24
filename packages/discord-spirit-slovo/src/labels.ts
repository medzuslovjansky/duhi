import { standard, type Lang } from './lang.ts';
import type { Lemma } from './search.types.ts';
import siteLabels from './site-labels.json' with { type: 'json' };

export type LabelKey = keyof typeof siteLabels;

/**
 * A label from the dictionary site (scripts/vendor-site-labels.ts), in the reader's
 * language when the site has it, otherwise in Interslavic standard Latin.
 */
export function label(key: LabelKey, lang?: Lang): string {
  const entry = siteLabels[key] as Partial<Record<Lang, string>>;
  const text = (lang && lang !== 'isv' && entry[lang]) || undefined;
  return text ?? standard(entry.isv!);
}

/** Labels the dictionary site lacks: the bot's own wording, pending review. */
export const UNREVIEWED = {
  /** Footnotes for the kinds of variant forms (Variant=Athematic, Short, Long), the owner's wording. */
  athematic: 'atematična forma',
  long: 'dolga forma',
  /** Title of an adjective's short form (dobr); from kråtky + forma in the dictionary. */
  shortForm: 'kratka forma',
  /** Button that posts an answer to the channel, in every client language. */
  showAll: 'Pokaži vsim',
} as const;

const POS: Record<string, LabelKey> = {
  NOUN: 'noun',
  PROPN: 'noun',
  VERB: 'verb',
  AUX: 'verb',
  ADJ: 'adjective',
  ADV: 'adverb',
  PRON: 'pronoun',
  NUM: 'numeral',
  ADP: 'preposition',
  CCONJ: 'conjunction',
  SCONJ: 'conjunction',
  PART: 'particle',
  INTJ: 'interjection',
};

/** 'imennik, žensky rod' from the lemma's tags, the way the dictionary site composes it. */
export function partOfSpeech(lemma: Pick<Lemma, 'upos' | 'xpos'>, lang?: Lang): string {
  const { xpos } = lemma;
  if (xpos === 'phrase' || !lemma.upos) return label('phrase', lang);
  if (/^prefix/.test(xpos)) return label('prefix', lang);
  if (/^suffix/.test(xpos)) return label('suffix', lang);

  const head = POS[lemma.upos];
  if (!head) return xpos;
  const parts: string[] = [label(head, lang)];

  if (head === 'noun') {
    if (/^m\.\s*\/\s*f\./.test(xpos)) parts.push(label('noun-masculineOrFeminine', lang));
    else if (/^m\./.test(xpos)) parts.push(label('noun-masculine', lang));
    else if (/^f\./.test(xpos)) parts.push(label('noun-feminine', lang));
    else if (/^n\./.test(xpos)) parts.push(label('noun-neuter', lang));
    if (/\banim\./.test(xpos)) parts.push(label('masculineAnimate', lang));
    if (/\bpl\./.test(xpos)) parts.push(label('noun-plural', lang));
    if (/\bsg\./.test(xpos)) parts.push(label('noun-singular', lang));
  }
  if (head === 'verb') {
    if (/\bipf\.\s*\/\s*pf\./.test(xpos)) parts.push(label('verb-imperfectiveOrPerfective', lang));
    else if (/\bipf\./.test(xpos)) parts.push(label('verb-imperfective', lang));
    else if (/\bpf\./.test(xpos)) parts.push(label('verb-perfective', lang));
  }
  return parts.join(', ');
}
