// The sample every test builds from: 360 rows of the `words` sheet (snapshot of 2026-11-24).
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { buildDb, parseTsv } from '../build-db.ts';
import { SqliteSearch } from '../search.ts';

export const rows = parseTsv(readFileSync(new URL('./words-sample.tsv', import.meta.url), 'utf8'));
export const db = new DatabaseSync(':memory:');
buildDb(rows, db);
export const search = new SqliteSearch(db);

/** Every row of a table as one tab-separated line, so a snapshot diff shows the rows that changed. */
export const dump = (sql: string) =>
  (db.prepare(sql).all() as Record<string, unknown>[]).map((row) => Object.values(row).join('\t'));

export const QUERIES: [string, string?][] = [
  ['вода'], ['voda'], ['vodu', 'isv'], ['vody'], ['water', 'en'], ['ključ'], ['spasti'], ['kamen'],
  ['камень'], ['pisal'], ['dobrogo'], ['bojati'], ['muzka'], ['Вода'], ['vod'], ['xqzw'], ['ⰲⱁⰴⰰ'],
];
