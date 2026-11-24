import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrate } from './vendor/migrate.cjs';
import { db, dump, rows } from './__fixtures__/sample.ts';

// Input of the packer: what migrate() makes of the sample.
test('migrate: lemmas and the rewritten isv column', (t) => {
  const { words, lemmas, issues } = migrate(rows);
  const isv = words[0].indexOf('isv');
  const upos = words[0].indexOf('upos');
  t.assert.snapshot({
    lemmas: lemmas.map((row) => row.slice(0, 5).join('\t')),
    words: words.slice(1).map((row) => `${row[0]}\t${row[isv]}\t${row[upos]}`),
    issues: issues.map((issue) => `${issue.kind}\t${issue.id}`),
  });
});

// Output of the packer: the tables the bot reads.
test('tables', (t) => {
  t.assert.snapshot({
    sense: dump('SELECT * FROM sense ORDER BY id'),
    lemma: dump('SELECT * FROM lemma ORDER BY key'),
    sense_lemma: dump('SELECT * FROM sense_lemma ORDER BY sense, ord'),
    label: dump('SELECT * FROM label ORDER BY sense, lang, ord'),
    // terms of a few senses: the whole sample's index is too long to read in a diff
    term: dump(
      'SELECT * FROM term WHERE sense IN (SELECT sense FROM sense_lemma WHERE lemma IN ' +
        "('voda|NOUN', 'kamenj|NOUN', 'pisati|VERB', 'dobry|ADJ', 'spasti (1)|VERB')) ORDER BY sense, how, key, lang, word",
    ),
  });
});

test('every sense with a part of speech has its lemmas', () => {
  const orphans = db
    .prepare("SELECT id FROM sense s WHERE upos != '' AND NOT EXISTS (SELECT 1 FROM sense_lemma x WHERE x.sense = s.id)")
    .all();
  assert.deepEqual(orphans, []);
});

test('a leading ! marks an unchecked translation', () => {
  const unchecked = db.prepare("SELECT word FROM label WHERE sense = 198 AND lang = 'sl'").get() as { word: string };
  assert.equal(unchecked.word, 'glasba');
  assert.equal((db.prepare("SELECT checked FROM label WHERE sense = 198 AND lang = 'sl'").get() as { checked: number }).checked, 0);
});
