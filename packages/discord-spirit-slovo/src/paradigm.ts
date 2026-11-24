import type { Token } from '@interslavic/conllu';
import { inflect, type KnownForm } from '@interslavic/morphology';
import type { Lemma, Paradigm } from './search.types.ts';

const INFLECTED = new Set(['NOUN', 'PROPN', 'ADJ', 'VERB', 'AUX', 'PRON', 'NUM']);

/** Forms of a lemma from @interslavic/morphology; none for phrases (bojati sę) and words that do not inflect. */
export function paradigm(lemma: Lemma): Paradigm {
  const form = lemma.isv.replace(/\s*\(\d+\)$/, '');
  if (!INFLECTED.has(lemma.upos) || /\s/.test(form)) return [];

  const known: KnownForm[] = [{ form, xpos: lemma.xpos as KnownForm['xpos'] }];
  // A single principal part in brackets, (veli) or (kamene), names a second cell. Richer notes are ignored.
  const part = /^\(([^\s()/;,+]+)\)$/.exec(lemma.addition.trim());
  if (part) known.push({ form: part[1], lemma: form });

  try {
    return inflect(known) as Token[];
  } catch {
    return [];
  }
}
