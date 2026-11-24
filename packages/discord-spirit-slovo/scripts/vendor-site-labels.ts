// Copies the bot's labels from the dictionary site's translation file
// (github.com/sonic16x/interslavic, src/translations/data.json, MIT) into src/site-labels.json.
//
// Usage: node scripts/vendor-site-labels.ts <path to data.json>

import { readFileSync, writeFileSync } from 'node:fs';
import { LANGS } from '../src/lang.ts';

const KEYS = [
  // parts of speech and their grammar
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'numeral', 'preposition', 'conjunction',
  'particle', 'interjection', 'prefix', 'suffix', 'phrase',
  'noun-masculine', 'noun-feminine', 'noun-neuter', 'noun-masculineOrFeminine', 'noun-plural', 'noun-singular',
  'masculineAnimate',
  'verb-perfective', 'verb-imperfective', 'verb-imperfectiveOrPerfective',
  // form tables
  'singular', 'plural', 'masculine', 'feminine', 'neuter',
  'caseNom', 'caseAcc', 'caseGen', 'caseLoc', 'caseDat', 'caseIns', 'caseVoc',
  'infinitive', 'present', 'past', 'imperative',
  // messages
  'resultsNotFound', 'resultsNotFoundMessage',
  // command descriptions
  'aboutSmallTitle', 'typeWordLabel', 'intelligibilityLanguage',
] as const;

const [, , source] = process.argv;
if (!source) throw new Error('usage: node scripts/vendor-site-labels.ts <path to data.json>');

const data = JSON.parse(readFileSync(source, 'utf8')) as Record<string, Record<string, string>>;
const out: Record<string, Record<string, string>> = {};
for (const key of KEYS) {
  const entry = data[key];
  if (!entry?.isv) throw new Error(`${source}: no Interslavic label for "${key}"`);
  out[key] = Object.fromEntries(LANGS.filter((lang) => entry[lang]).map((lang) => [lang, entry[lang]]));
}

writeFileSync(new URL('../src/site-labels.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`${KEYS.length} labels written`);
