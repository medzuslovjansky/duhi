// Builds the lookup database from a snapshot of the dictionary's `words` sheet, at image build time.
//
// Usage: node src/build-db.ts <words.tsv> <out.db>

import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { stem } from '@interslavic/stemmer';
import { LANGS, fold, standard, type Lang } from './lang.ts';
import { paradigm } from './paradigm.ts';
import type { Lemma } from './search.types.ts';
import { migrate, lemmaKey, splitTop } from './vendor/migrate.cjs';

export const SCHEMA = `
  CREATE TABLE sense (id INTEGER PRIMARY KEY, xpos TEXT NOT NULL, upos TEXT NOT NULL);
  CREATE TABLE lemma (
    key TEXT PRIMARY KEY, isv TEXT NOT NULL, upos TEXT NOT NULL, xpos TEXT NOT NULL,
    addition TEXT NOT NULL, frequency INTEGER NOT NULL
  );
  CREATE TABLE sense_lemma (sense INTEGER NOT NULL, ord INTEGER NOT NULL, lemma TEXT NOT NULL, PRIMARY KEY (sense, ord));
  CREATE INDEX sense_lemma_by_lemma ON sense_lemma (lemma);
  -- names of a sense per language, as shown; Interslavic ones in standard Latin
  CREATE TABLE label (sense INTEGER NOT NULL, lang TEXT NOT NULL, ord INTEGER NOT NULL, word TEXT NOT NULL,
    checked INTEGER NOT NULL, PRIMARY KEY (sense, lang, ord));
  -- what a query is compared with: the folded word ('exact'); for Interslavic also every
  -- inflected form ('form', from @interslavic/morphology) and the stem ('stem')
  CREATE TABLE term (how TEXT NOT NULL, key TEXT NOT NULL, lang TEXT NOT NULL, sense INTEGER NOT NULL, word TEXT NOT NULL);
  CREATE INDEX term_by_key ON term (how, key, lang);
`;

/** A leading `!` or `#` (`!вода`) marks an unchecked machine translation. */
const UNCHECKED = /^[!#]+/;

/** Splits a translation cell on top-level commas: "oraz, a także" gives "oraz" and "a także". */
function items(cell: string): { text: string; checked: boolean }[] {
  const whole = UNCHECKED.test(cell.trim());
  return splitTop(cell.trim().replace(UNCHECKED, ''))
    .map((item) => ({ text: item.replace(UNCHECKED, '').trim(), checked: !whole && !UNCHECKED.test(item) }))
    .filter((item) => item.text);
}

/** Lemma name in `lemmas`: "spasti (2)" for a second homonym, "oko" otherwise. */
function lemmaName(occurrence: string): string {
  const homonym = /\((\d+)\)/.exec(occurrence);
  return lemmaKey(occurrence) + (homonym ? ` (${homonym[1]})` : '');
}

export function parseTsv(text: string): string[][] {
  const rows = text.replace(/\n$/, '').split('\n').map((line) => line.split('\t'));
  const width = rows[0].length;
  rows.forEach((row, i) => {
    if (row.length > width) throw new Error(`row ${i + 1}: ${row.length} cells, the header has ${width}`);
  });
  return rows;
}

export function buildDb(rows: string[][], db: DatabaseSync): { issues: number } {
  const { words, lemmas, issues } = migrate(rows);
  db.exec(SCHEMA);
  db.exec('BEGIN');

  const lemmaColumns = Object.fromEntries(lemmas[0].map((name, i) => [name, i]));
  const insertLemma = db.prepare('INSERT INTO lemma VALUES (?, ?, ?, ?, ?, ?)');
  const known = new Set<string>();
  for (const row of lemmas.slice(1)) {
    const key = `${row[lemmaColumns.isv]}|${row[lemmaColumns.upos]}`;
    known.add(key);
    insertLemma.run(
      key, row[lemmaColumns.isv], row[lemmaColumns.upos], row[lemmaColumns.xpos], row[lemmaColumns.addition],
      Number(row[lemmaColumns.frequency]) || 0,
    );
  }

  const col = Object.fromEntries(words[0].map((name, i) => [name, i]));
  const insertSense = db.prepare('INSERT INTO sense VALUES (?, ?, ?)');
  const insertSenseLemma = db.prepare('INSERT INTO sense_lemma VALUES (?, ?, ?)');
  const insertLabel = db.prepare('INSERT INTO label VALUES (?, ?, ?, ?, ?)');
  const insertTerm = db.prepare('INSERT INTO term VALUES (?, ?, ?, ?, ?)');

  for (const row of words.slice(1)) {
    const id = Number(row[col.id]);
    const upos = row[col.upos];
    insertSense.run(id, row[col.partOfSpeech].replace(/^#/, ''), upos);

    for (const lang of LANGS) {
      const cell = row[col[lang]] ?? '';
      items(cell).forEach(({ text: item, checked }, ord) => {
        if (lang === 'isv') {
          const key = `${lemmaName(item)}|${upos}`;
          if (known.has(key)) insertSenseLemma.run(id, ord, key);
        }
        const bare = lemmaKey(item);
        const shown = lang === 'isv' ? standard(item.replace(/\s*\(\d+\)/, '')) : item;
        insertLabel.run(id, lang, ord, shown, checked ? 1 : 0);
        const key = fold(bare, lang as Lang);
        if (!key) return;
        insertTerm.run('exact', key, lang, id, shown);
        if (lang === 'isv' && !key.includes(' ')) insertTerm.run('stem', stem(key), lang, id, shown);
      });
    }
  }

  // forms point at every sense of their lemma
  const senses = db.prepare('SELECT sense FROM sense_lemma WHERE lemma = ?');
  const allLemmas = db.prepare('SELECT key, isv, upos, xpos, addition FROM lemma').all() as unknown as Lemma[];
  for (const lemma of allLemmas) {
    const name = standard(lemma.isv.replace(/\s*\(\d+\)$/, ''));
    const keys = new Set(paradigm(lemma).map((token) => fold(token.form, 'isv')));
    keys.delete(fold(name, 'isv'));
    for (const { sense } of senses.all(lemma.key) as { sense: number }[]) {
      for (const key of keys) insertTerm.run('form', key, 'isv', sense, name);
    }
  }

  db.exec('COMMIT');
  db.exec('ANALYZE');
  return { issues: issues.length };
}

if (import.meta.main) {
  const [, , source, target] = process.argv;
  if (!source || !target) throw new Error('usage: node src/build-db.ts <words.tsv> <out.db>');
  rmSync(target, { force: true });
  mkdirSync(dirname(target), { recursive: true });
  const db = new DatabaseSync(target);
  const { issues } = buildDb(parseTsv(readFileSync(source, 'utf8')), db);
  const count = (table: string) => (db.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;
  console.log(`${target}: ${count('sense')} senses, ${count('lemma')} lemmas, ${count('term')} terms; migrate reported ${issues} issues in the sheet`);
  db.close();
}
