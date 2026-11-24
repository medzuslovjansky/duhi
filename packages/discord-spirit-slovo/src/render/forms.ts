import type { Token } from '@interslavic/conllu';
import { label, UNREVIEWED, type LabelKey } from '../labels.ts';
import { standard, type Lang } from '../lang.ts';

/** A table of forms; the first cell of a row names it. */
export interface FormTable {
  title: string;
  header: string[];
  rows: string[][];
}

type Feats = Record<string, string | undefined>;
type Column = { key: LabelKey; when: Feats };

const CASES: [string, LabelKey][] = [
  ['Nom', 'caseNom'],
  ['Acc', 'caseAcc'],
  ['Gen', 'caseGen'],
  ['Loc', 'caseLoc'],
  ['Dat', 'caseDat'],
  ['Ins', 'caseIns'],
  ['Voc', 'caseVoc'],
];

// Conjugation rows are named by personal pronouns (dictionary entries ja, ty, on, my, vy, oni).
const PERSONS: [string, string, string][] = [
  ['1', 'Sing', 'ja'],
  ['2', 'Sing', 'ty'],
  ['3', 'Sing', 'on'],
  ['1', 'Plur', 'my'],
  ['2', 'Plur', 'vy'],
  ['3', 'Plur', 'oni'],
];

const feats = (token: Token) => (token.feats ?? {}) as Feats;
const fits = (token: Token, when: Feats) => Object.entries(when).every(([k, v]) => feats(token)[k] === v);

/** Kinds of variant forms (CoNLL-U `Variant`) and the footnote that explains each. */
export const VARIANTS = {
  Athematic: UNREVIEWED.athematic,
  Short: UNREVIEWED.shortForm,
  Long: UNREVIEWED.long,
} as const;
export type Variant = keyof typeof VARIANTS;

/** Marks given out in reading order: the first kind met in a card gets *, the next **. */
export type Marks = Map<Variant, string>;
const markOf = (marks: Marks, variant: Variant) => {
  if (!marks.has(variant)) marks.set(variant, '*'.repeat(marks.size + 1));
  return marks.get(variant)!;
};

/**
 * Forms of one cell: plain forms first, then variants with their mark.
 * A long and a short form side by side (osuđaješ/osuđaš) are equal alternatives and stay unmarked.
 */
function cell(tokens: Token[], when: Feats, used: Marks): string {
  const forms: { form: string; variant?: Variant }[] = [];
  for (const token of tokens) {
    if (!fits(token, when)) continue;
    const form = standard(token.form);
    const variant = feats(token).Variant as Variant | undefined;
    if (!forms.some((f) => f.form === form)) forms.push({ form, variant: variant && variant in VARIANTS ? variant : undefined });
  }
  const pair = forms.some((f) => f.variant === 'Long') && forms.some((f) => f.variant === 'Short');
  const marked = (f: (typeof forms)[number]) => f.variant && !(pair && (f.variant === 'Long' || f.variant === 'Short'));
  const ordered = [...forms.filter((f) => !marked(f)), ...forms.filter(marked)];
  return (
    ordered
      .map((f) => (marked(f) ? f.form + markOf(used, f.variant!) : f.form))
      .join('/') || '—'
  );
}

/**
 * One narrow table per column (number, or gender for adjectives), rows by case.
 * Discord shows them side by side on a computer and one under another on a phone,
 * where a single wide table would wrap.
 */
function caseTables(tokens: Token[], columns: Column[], used: Marks, lang?: Lang): FormTable[] {
  const cases = CASES.filter(([c]) => tokens.some((t) => feats(t).Case === c));
  return columns
    .filter((column) => tokens.some((t) => fits(t, column.when)))
    .map((column) => ({
      title: label(column.key, lang),
      header: [],
      rows: cases.map(([c, key]) => [label(key, lang), cell(tokens, { ...column.when, Case: c }, used)]),
    }));
}

/** Word-card tables: declension for nominal words, conjugation for verbs. */
export function formTables(tokens: Token[], upos: string, lang?: Lang, used: Marks = new Map()): FormTable[] {
  if (tokens.length === 0) return [];

  if (upos === 'VERB' || upos === 'AUX') {
    const tables: FormTable[] = [];
    const infinitive = cell(tokens, { VerbForm: 'Inf' }, used);
    if (infinitive !== '—') tables.push({ title: label('infinitive', lang), header: [], rows: [[infinitive]] });
    const present = PERSONS.map(([Person, Number, who]) => [
      who,
      cell(tokens, { VerbForm: 'Fin', Mood: 'Ind', Tense: 'Pres', Person, Number }, used),
    ]);
    if (present.some(([, form]) => form !== '—')) tables.push({ title: label('present', lang), header: [], rows: present });
    const past = (
      [
        ['masculine', { Gender: 'Masc', Number: 'Sing' }],
        ['feminine', { Gender: 'Fem', Number: 'Sing' }],
        ['neuter', { Gender: 'Neut', Number: 'Sing' }],
        ['plural', { Number: 'Plur' }],
      ] as [LabelKey, Feats][]
    ).map(([key, when]) => [label(key, lang), cell(tokens, { VerbForm: 'Part', Tense: 'Past', Voice: 'Act', ...when }, used)]);
    if (past.some(([, form]) => form !== '—')) tables.push({ title: label('past', lang), header: [], rows: past });
    const imperative = PERSONS.filter(([p, n]) => (p === '2' && n === 'Sing') || (p !== '3' && n === 'Plur')).map(
      ([Person, Number, who]) => [who, cell(tokens, { Mood: 'Imp', Person, Number }, used)],
    );
    if (imperative.some(([, form]) => form !== '—'))
      tables.push({ title: label('imperative', lang), header: [], rows: imperative });
    return tables;
  }

  const byGender = tokens.some((t) => feats(t).Gender) && upos !== 'NOUN' && upos !== 'PROPN';
  const columns: Column[] = byGender
    ? [
        { key: 'masculine', when: { Number: 'Sing', Gender: 'Masc' } },
        { key: 'neuter', when: { Number: 'Sing', Gender: 'Neut' } },
        { key: 'feminine', when: { Number: 'Sing', Gender: 'Fem' } },
        { key: 'plural', when: { Number: 'Plur' } },
      ]
    : [
        { key: 'singular', when: { Number: 'Sing' } },
        { key: 'plural', when: { Number: 'Plur' } },
      ];
  // adjectives: the positive degree; the short form (dobr) goes under the tables, not into a cell
  const positive = tokens.filter((t) => !feats(t).Degree || feats(t).Degree === 'Pos');
  const short = upos === 'ADJ' ? positive.filter((t) => feats(t).Variant === 'Short') : [];
  const tables = caseTables(positive.filter((t) => !short.includes(t)), columns, used, lang);
  if (short.length) {
    tables.push({ title: UNREVIEWED.shortForm, header: [], rows: [[[...new Set(short.map((t) => standard(t.form)))].join(', ')]] });
  }
  return tables;
}

/** Monospace text, columns padded to the widest cell. */
export function tableText(table: FormTable): string {
  const lines = table.header.length ? [table.header, ...table.rows] : table.rows;
  const widths = lines[0].map((_, i) => Math.max(...lines.map((line) => [...(line[i] ?? '')].length)));
  return lines.map((line) => line.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd()).join('\n');
}
