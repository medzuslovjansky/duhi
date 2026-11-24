import assert from 'node:assert/strict';
import { test } from 'node:test';
import { limitProblems, resultsPayload, wordPayload } from './render/embed.ts';
import type { Result } from './search.types.ts';
import { db, QUERIES, search } from './__fixtures__/sample.ts';

test('messages', async (t) => {
  const messages: Record<string, unknown> = {};
  for (const q of ['вода', 'spasti', 'xqzw']) messages[`results ${q}`] = resultsPayload(await search.find(q), { query: q, reader: 'ru' });
  for (const key of ['kamenj|NOUN', 'pisati|VERB', 'dobry|ADJ', 'on|PRON']) {
    const card = await search.word(key);
    if (card) messages[`word ${key}`] = wordPayload(card, 'pl');
  }
  t.assert.snapshot(messages);
});

test('unchecked translations are in italics', async () => {
  const [muzika] = await search.find('muzika', 'isv');
  assert.match(resultsPayload([muzika], { query: 'muzika' }).embeds[0].description!, /`sl` \*glasba\*/);
});

test('within Discord limits for every query and every lemma of the sample', async () => {
  for (const [q, lang] of QUERIES) {
    for (const reader of [undefined, 'ru', 'pl'] as const) {
      assert.deepEqual(limitProblems(resultsPayload(await search.find(q, lang as never), { query: q, reader })), [], q);
    }
  }
  for (const { key } of db.prepare('SELECT key FROM lemma').all() as { key: string }[]) {
    assert.deepEqual(limitProblems(wordPayload((await search.word(key))!, 'ru')), [], key);
  }
});

test('overlong data is cut, not sent', () => {
  const long = 'w'.repeat(3000);
  const result: Result = {
    id: 'steen:1',
    source: 'dictionary',
    labels: [{ lang: 'isv', words: [long] }, ...(['en', 'ru', 'pl', 'cs'] as const).map((lang) => ({ lang, words: [long, long] }))],
    matched: [{ lang: 'en', word: long, how: 'exact' }],
    lemmas: [],
  };
  const payload = resultsPayload(Array(10).fill(result), { query: 'q'.repeat(200) });
  assert.deepEqual(limitProblems(payload), []);
  assert.equal(payload.components.length, 0, 'no share button when the query does not fit custom_id');
});

test('mentions are never parsed', async () => {
  assert.deepEqual(resultsPayload(await search.find('@everyone'), { query: '@everyone' }).allowed_mentions, { parse: [] });
});
