import { test } from 'node:test';
import { paradigm } from './paradigm.ts';
import { search } from './__fixtures__/sample.ts';

// Forms of a few lemmas of each kind, one line per form: a change in @interslavic/morphology shows here.
test('forms', async (t) => {
  const forms: Record<string, string[]> = {};
  for (const key of ['voda|NOUN', 'kamenj|NOUN', 'oko|NOUN', 'pisati|VERB', 'dobry|ADJ', 'on|PRON', 'dva|NUM', 'na|ADP']) {
    const card = await search.word(key);
    if (!card) continue;
    forms[key] = paradigm(card.lemma).map((t) => `${t.form}\t${Object.entries(t.feats ?? {}).map(([k, v]) => `${k}=${v}`).join('|')}`);
  }
  t.assert.snapshot(forms);
});
