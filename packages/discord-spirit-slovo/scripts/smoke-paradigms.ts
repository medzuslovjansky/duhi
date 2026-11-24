// Renders the word card of every lemma in the built database. Reports lemmas with forms,
// single words of inflecting parts of speech without any, and cards over Discord's limits;
// fails on either of the last two.
//
// Usage: node scripts/smoke-paradigms.ts [dist/slovnik.db]

import { existsSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { limitProblems, wordPayload } from '../src/render/embed.ts';
import { SqliteSearch } from '../src/search.ts';

const path = process.argv[2] ?? 'dist/slovnik.db';
if (!existsSync(path)) {
  console.log(`${path} not built yet: run \`yarn build\` first; skipping the whole-dictionary check`);
  process.exit(0);
}
const keys = (new DatabaseSync(path, { readOnly: true }).prepare('SELECT key, upos, isv FROM lemma').all() as {
  key: string;
  upos: string;
  isv: string;
}[]);
const search = new SqliteSearch(path);

const INFLECTED = new Set(['NOUN', 'PROPN', 'ADJ', 'VERB', 'AUX', 'PRON', 'NUM']);
const tally: Record<string, { lemmas: number; withForms: number; empty: string[] }> = {};
const broken: string[] = [];

for (const { key, upos, isv } of keys) {
  const card = (await search.word(key))!;
  const t = (tally[upos] ??= { lemmas: 0, withForms: 0, empty: [] });
  t.lemmas++;
  if (card.paradigm.length) t.withForms++;
  else if (INFLECTED.has(upos) && !/\s/.test(isv)) t.empty.push(isv);
  const problems = limitProblems(wordPayload(card, 'ru'));
  if (problems.length) broken.push(`${key}: ${problems.join(', ')}`);
}

for (const [upos, t] of Object.entries(tally).sort((a, b) => b[1].lemmas - a[1].lemmas)) {
  console.log(`${upos.padEnd(6)} ${String(t.lemmas).padStart(6)} lemmas, ${String(t.withForms).padStart(6)} with forms, ${t.empty.length} single words without forms${t.empty.length ? ': ' + t.empty.slice(0, 8).join(', ') : ''}`);
}
console.log(`cards over Discord limits: ${broken.length}`);
for (const line of broken.slice(0, 20)) console.log('  ' + line);
const empty = Object.values(tally).reduce((n, t) => n + t.empty.length, 0);
if (broken.length || empty) process.exit(1);
