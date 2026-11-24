import { DatabaseSync } from 'node:sqlite';
import { stem } from '@interslavic/stemmer';
import { fold, type Lang } from './lang.ts';
import { paradigm } from './paradigm.ts';
import type { Labels, Lemma, Match, Result, Search, WordCard } from './search.types.ts';

const RANK: Record<Match['how'], number> = { exact: 0, form: 1, stem: 2, prefix: 3, fuzzy: 4 };
const MAX_RESULTS = 25;
const MAX_SUGGESTIONS = 25;
/** Rows read per kind of match. */
const ROWS = 200;

type TermRow = { sense: number; lang: Lang; word: string };

/** `Search` over the SQLite file src/build-db.ts writes. */
export class SqliteSearch implements Search {
  private db: DatabaseSync;
  /** Every SQL text this instance has run, so a test can check each one's query plan. */
  readonly statements = new Set<string>();

  constructor(db: string | DatabaseSync) {
    this.db = typeof db === 'string' ? new DatabaseSync(db, { readOnly: true }) : db;
  }

  private prepare(sql: string) {
    this.statements.add(sql);
    return this.db.prepare(sql);
  }

  async find(query: string, lang?: Lang): Promise<Result[]> {
    const matches = new Map<number, Match[]>();
    const add = (rows: TermRow[], how: Match['how']) => {
      for (const { sense, lang, word } of rows) {
        const list = matches.get(sense) ?? [];
        if (!list.some((m) => m.lang === lang && m.word === word)) list.push({ lang, word, how });
        matches.set(sense, list);
      }
    };

    for (const [key, langs] of this.keys(query, lang)) {
      add(this.terms('exact', '=', key, langs), 'exact');
      const isv = langs.length === 0 || langs.includes('isv');
      if (isv) add(this.terms('form', '=', key, ['isv']), 'form');
      if (isv && !key.includes(' ')) add(this.terms('stem', '=', stem(key), ['isv']), 'stem');
    }
    if (matches.size < MAX_RESULTS) {
      for (const [key, langs] of this.keys(query, lang)) {
        if (key.length >= 2) add(this.terms('exact', 'prefix', key, langs), 'prefix');
      }
    }
    if (matches.size === 0) {
      for (const [key, langs] of this.keys(query, lang)) add(this.fuzzy(key, langs), 'fuzzy');
    }

    const order = [...matches.entries()]
      .map(([sense, list]) => ({
        sense,
        list: list.sort((a, b) => RANK[a.how] - RANK[b.how]),
        frequency: this.frequency(sense),
      }))
      // best kind of match, then the sense the query names in more languages, then the more frequent word
      .sort(
        (a, b) =>
          RANK[a.list[0].how] - RANK[b.list[0].how] ||
          languages(b.list) - languages(a.list) ||
          b.frequency - a.frequency ||
          a.sense - b.sense,
      )
      .slice(0, MAX_RESULTS);

    return order.map(({ sense, list }) => this.result(sense, list));
  }

  async suggest(prefix: string, lang?: Lang): Promise<string[]> {
    const words = new Set<string>();
    for (const [key, langs] of this.keys(prefix, lang)) {
      if (!key) continue;
      for (const { word } of this.terms('exact', 'prefix', key, langs)) {
        words.add(word.slice(0, 100));
      }
    }
    return [...words].slice(0, MAX_SUGGESTIONS);
  }

  async word(lemmaKey: string): Promise<WordCard | undefined> {
    const lemma = this.prepare('SELECT key, isv, upos, xpos, addition FROM lemma WHERE key = ?').get(lemmaKey) as
      | Lemma
      | undefined;
    if (!lemma) return undefined;
    const senses = this.prepare('SELECT sense FROM sense_lemma WHERE lemma = ? ORDER BY sense').all(lemmaKey) as {
      sense: number;
    }[];
    return {
      lemma: { ...lemma },
      senses: senses.map(({ sense }) => this.result(sense, [])),
      paradigm: paradigm(lemma),
    };
  }

  /**
   * Search keys per group of languages. A query not written in Latin letters (вода)
   * looks in the other languages first.
   */
  private keys(query: string, lang?: Lang): [string, Lang[]][] {
    if (lang) return [[fold(query, lang), [lang]]];
    const isv = fold(query, 'isv');
    const other = fold(query, 'en');
    if (isv === other) return [[isv, []]];
    const groups: [string, Lang[]][] = [[isv, ['isv']], [other, []]];
    return /\p{Script=Latin}/u.test(query) ? groups : groups.reverse();
  }

  /** Term rows by exact key or key prefix; an empty language list means every language. */
  private terms(how: 'exact' | 'form' | 'stem', op: '=' | 'prefix', key: string, langs: Lang[]): TermRow[] {
    const where = op === '=' ? 'key = ?' : 'key >= ? AND key < ?';
    const keyArgs = op === '=' ? [key] : [key, key + '\u{10FFFF}'];
    const langClause = langs.length ? ` AND lang IN (${langs.map(() => '?').join(', ')})` : '';
    const order = op === 'prefix' ? ' ORDER BY length(key), key' : '';
    return this
      .prepare(`SELECT sense, lang, word FROM term WHERE how = ? AND ${where}${langClause}${order} LIMIT ${ROWS}`)
      .all(how, ...keyArgs, ...langs) as TermRow[];
  }

  /** Words one or two edits away, among those that start with the same two letters. */
  private fuzzy(key: string, langs: Lang[]): TermRow[] {
    if (key.length < 4) return [];
    const limit = key.length < 6 ? 1 : 2;
    const candidates = this
      .prepare(
        `SELECT sense, lang, word, key FROM term WHERE how = 'exact' AND key >= ? AND key < ?` +
          (langs.length ? ` AND lang IN (${langs.map(() => '?').join(', ')})` : '') +
          ' LIMIT 20000',
      )
      .all(key.slice(0, 2), key.slice(0, 2) + '\u{10FFFF}', ...langs) as (TermRow & { key: string })[];
    return candidates.filter((row) => Math.abs(row.key.length - key.length) <= limit && distance(row.key, key) <= limit).slice(0, ROWS);
  }

  private frequency(sense: number): number {
    const row = this
      .prepare('SELECT max(l.frequency) AS f FROM sense_lemma s JOIN lemma l ON l.key = s.lemma WHERE s.sense = ?')
      .get(sense) as { f: number | null };
    return row.f ?? 0;
  }

  private result(sense: number, matched: Match[]): Result {
    const rows = this.prepare('SELECT lang, word, checked FROM label WHERE sense = ? ORDER BY lang, ord').all(sense) as {
      lang: Lang;
      word: string;
      checked: number;
    }[];
    const labels: Labels = [];
    for (const { lang, word, checked } of rows) {
      const entry = labels.find((l) => l.lang === lang) ?? (labels.push({ lang, words: [] }), labels.at(-1)!);
      entry.words.push(word);
      if (!checked) entry.unchecked = true;
    }
    const lemmas = this
      .prepare(
        'SELECT l.key, l.isv, l.upos, l.xpos, l.addition FROM sense_lemma s JOIN lemma l ON l.key = s.lemma WHERE s.sense = ? ORDER BY s.ord',
      )
      .all(sense) as unknown as Lemma[];
    return { id: `steen:${sense}`, source: 'dictionary', labels, matched, lemmas: lemmas.map((l) => ({ ...l })) };
  }
}

/** Number of languages with the best kind of match. */
function languages(list: Match[]): number {
  return new Set(list.filter((m) => m.how === list[0].how).map((m) => m.lang)).size;
}

/** Levenshtein. */
export function distance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}
