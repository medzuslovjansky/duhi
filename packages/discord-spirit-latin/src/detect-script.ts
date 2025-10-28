import { transliterate } from './transliterate.ts';

const IS_LATIN = /[\p{Script=Latin}]/mu;
const IS_CYRILLIC = /[\p{Script=Cyrillic}]/mu;
const IS_GLAGOLITIC = /[\p{Script=Glagolitic}]/mu;

export function isCyrillic(text: string | null | undefined): boolean {
  return text != null && IS_CYRILLIC.test(text);
}

export function isGlagolitic(text: string | null | undefined): boolean {
  return text != null && IS_GLAGOLITIC.test(text);
}

export function isLatin(text: string | null | undefined): boolean {
  return text != null && IS_LATIN.test(text);
}

export function isCyrillicOrGlagolitic(text: string | null | undefined): boolean {
  return isCyrillic(text) || isGlagolitic(text);
}

function detectScript(lemma: string): 'latn' | 'cyrl' | 'glag' | undefined {
  if (isLatin(lemma)) {
    return 'latn';
  }
  if (isCyrillic(lemma)) {
    return 'cyrl';
  }
  if (isGlagolitic(lemma)) {
    return 'glag';
  }

  return;
}

export function hasLatinOrBalancedNonLatinScript(text: string): boolean {
  const scriptsMask = 0
    | (isLatin(text) ? 1 : 0)
    | (isCyrillic(text) ? 2 : 0)
    | (isGlagolitic(text) ? 4 : 0);

  // No detected scripts
  if (scriptsMask === 0) return true;
  // Only Latin script
  if (scriptsMask === 1) return true;
  // No Latin script
  if ((scriptsMask & 1) === 0) return false;

  const scriptsCount = scriptsMask >= 6 ? 3 : 2;

  const counts = {
    latn: new Map<string, number>(),
    cyrl: new Map<string, number>(),
    glag: new Map<string, number>(),
  };

  const lemmas = new Set<string>();
  text.replace(/([\p{Script=Cyrillic}\p{Script=Glagolitic}\p{Script=Latin}\p{Mark}]+)/gu, (_match, word) => {
    const script = detectScript(word);
    const lemma = transliterate(word.normalize('NFC').toLowerCase(), true);
    lemmas.add(lemma);

    if (script) {
      counts[script].set(lemma, (counts[script].get(lemma) || 0) + 1);
    }

    return word;
  });

  let nonBalancedCount = 0;
  for (const lemma of lemmas) {
    const [latn, cyrl, glag] = [counts.latn.get(lemma) || 0, counts.cyrl.get(lemma) || 0, counts.glag.get(lemma) || 0];
    const max = Math.max(latn, cyrl, glag);
    const leastCommon = Math.min(scriptsMask & 1 ? latn : max, scriptsMask & 2 ? cyrl : max, scriptsMask & 4 ? glag : max);
    nonBalancedCount += (cyrl - leastCommon) + (glag - leastCommon);
  }

  return nonBalancedCount <= (lemmas.size / scriptsCount);
}
