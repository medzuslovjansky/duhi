import assert from 'node:assert/strict';
import { test } from 'node:test';
import { distance } from './search.ts';
import type { Result } from './search.types.ts';
import { db, QUERIES, search } from './__fixtures__/sample.ts';

const line = (r: Result) =>
  `${r.id} ${r.labels.find((l) => l.lang === 'isv')?.words.join(', ')} [${r.matched.map((m) => `${m.lang}:${m.word}:${m.how}`).join(' ')}]`;

test('what each query finds', async (t) => {
  const found: Record<string, string[]> = {};
  for (const [q, lang] of QUERIES) found[`${q}${lang ? ` (${lang})` : ''}`] = (await search.find(q, lang as never)).slice(0, 5).map(line);
  t.assert.snapshot(found);
});

test('suggestions', async (t) => {
  t.assert.snapshot({ vod: await search.suggest('vod'), во: await search.suggest('во', 'ru'), в: await search.suggest('в') });
});

test('at most 25 suggestions, the limit of an autocomplete answer', async () => {
  for (const prefix of ['v', 'в', 'k', 'к', 'a', 'p']) assert.ok((await search.suggest(prefix)).length <= 25, prefix);
});

test('a Cyrillic prefix suggests Cyrillic words first', async () => {
  assert.match((await search.suggest('в'))[0], /^\p{Script=Cyrillic}/u);
});

test('word card data', async (t) => {
  const card = await search.word('kamenj|NOUN');
  assert.ok(card);
  t.assert.snapshot({ lemma: card.lemma, senses: card.senses.map(line) });
});

test('no lookup reads a whole table', async () => {
  for (const [q, lang] of QUERIES) await search.find(q, lang as never);
  await search.suggest('vod');
  await search.word('voda|NOUN');
  for (const sql of search.statements) {
    const params = (sql.match(/\?/g) ?? []).map(() => 'x');
    const plan = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...params) as { detail: string }[];
    const scans = plan.map((p) => p.detail).filter((d) => /^SCAN (term|label|lemma|sense_lemma|sense)\b/.test(d));
    assert.deepEqual(scans, [], sql);
  }
});

test('edit distance', () => {
  assert.equal(distance('muzka', 'muzika'), 1);
  assert.equal(distance('voda', 'voda'), 0);
});
