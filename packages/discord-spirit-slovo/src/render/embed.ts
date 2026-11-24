import { label, partOfSpeech, UNREVIEWED } from '../labels.ts';
import { LANGS, standard, type Lang } from '../lang.ts';
import type { Lemma, Result, WordCard } from '../search.types.ts';
import { formTables, tableText, VARIANTS, type Marks } from './forms.ts';

/** Discord message limits (discord.com/developers/docs/resources/message). */
export const LIMITS = {
  embeds: 10,
  embedTotal: 6000,
  title: 256,
  description: 4096,
  fields: 25,
  fieldName: 256,
  fieldValue: 1024,
  footer: 2048,
  content: 2000,
  customId: 100,
  selectOptions: 25,
  optionLabel: 100,
  buttonLabel: 80,
} as const;

/** Results per message; a narrower query reaches the rest. */
export const RESULTS_SHOWN = 5;
const DESCRIPTION_BUDGET = 900;
const LINE_BUDGET = 200;

export interface Embed {
  title?: string;
  url?: string;
  description?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
}
export interface Payload {
  content?: string;
  embeds: Embed[];
  components: { type: 1; components: Record<string, unknown>[] }[];
  allowed_mentions: { parse: [] };
}

export interface ResultsContext {
  query: string;
  /** Language filter, if any. */
  lang?: Lang;
  /** Reader's language, from the Discord client locale. */
  reader?: Lang;
  /** A public copy has no share button. */
  shared?: boolean;
}

const cut = (text: string, max: number) => ([...text].length <= max ? text : [...text].slice(0, max - 1).join('') + '…');

/** Translation languages in display order: the query's, the reader's, then dictionary order. */
function order(first: (Lang | undefined)[]): Lang[] {
  const head = first.filter((l): l is Lang => !!l && l !== 'isv');
  return [...new Set([...head, ...LANGS.filter((l) => l !== 'isv')])];
}

function translations(result: Result, langs: Lang[], budget: number): string {
  const lines: string[] = [];
  let used = 0;
  for (const lang of langs) {
    const entry = result.labels.find((l) => l.lang === lang);
    if (!entry?.words.length) continue;
    const text = cut(entry.words.join(', '), LINE_BUDGET - 10);
    const line = `\`${lang}\` ${entry.unchecked ? `*${text}*` : text}`;
    if (used + line.length + 1 > budget) break;
    lines.push(line);
    used += line.length + 1;
  }
  return lines.join('\n');
}

const isvNames = (result: Result) => result.labels.find((l) => l.lang === 'isv')?.words ?? [];
const lemmaName = (lemma: Lemma) => standard(lemma.isv.replace(/\s*\(\d+\)$/, ''));

/**
 * The entry on interslavic-dictionary.com, the same link as its "Děliti se" button:
 * by the row's id, so it survives the sheet being re-sorted (a row number would not).
 */
export function entryUrl(result: Result, reader?: Lang): string {
  const id = result.id.replace(/^steen:/, '');
  return `https://interslavic-dictionary.com/?text=id${id}&lang=isv-${reader ?? 'en'}`;
}

function resultEmbed(result: Result, ctx: ResultsContext): Embed {
  const matchedLang = result.matched[0]?.lang;
  const pos = result.lemmas[0] ? partOfSpeech(result.lemmas[0], ctx.reader) : label('phrase', ctx.reader);
  const body = translations(result, order([ctx.lang, matchedLang, ctx.reader]), DESCRIPTION_BUDGET);
  const url = entryUrl(result, ctx.reader);
  return {
    title: cut(isvNames(result).join(', ') || '—', LIMITS.title),
    url,
    description: cut(`*${pos}*\n${body}`, LIMITS.description),
  };
}

/** Menu of the results' lemmas; picking one opens its word card. */
function wordMenu(lemmas: Lemma[], reader?: Lang) {
  const seen = new Set<string>();
  const options = lemmas
    .filter((l) => !seen.has(l.key) && seen.add(l.key) && l.key.length + 'slovo:word'.length <= LIMITS.customId)
    .slice(0, LIMITS.selectOptions)
    .map((l) => ({ label: cut(`${lemmaName(l)} (${partOfSpeech(l, reader)})`, LIMITS.optionLabel), value: l.key }));
  return options.length ? { type: 1 as const, components: [{ type: 3, custom_id: 'slovo:word', options }] } : undefined;
}

function shareButton(customId: string) {
  if (customId.length > LIMITS.customId) return undefined;
  return { type: 2, style: 2, custom_id: customId, label: UNREVIEWED.showAll };
}

/** Results of a query. */
export function resultsPayload(results: Result[], ctx: ResultsContext): Payload {
  if (results.length === 0) {
    return {
      content: `**${label('resultsNotFound', ctx.reader)}**\n${label('resultsNotFoundMessage', ctx.reader)}`,
      embeds: [],
      components: [],
      allowed_mentions: { parse: [] },
    };
  }
  const shown = results.slice(0, RESULTS_SHOWN);
  const embeds = shown.map((r) => resultEmbed(r, ctx));

  const components: Payload['components'] = [];
  const menu = wordMenu(shown.flatMap((r) => r.lemmas), ctx.reader);
  if (menu) components.push(menu);
  const share = ctx.shared ? undefined : shareButton(`slovo:share:${ctx.lang ?? ''}:${ctx.query}`);
  if (share) components.push({ type: 1, components: [share] });

  return { embeds, components, allowed_mentions: { parse: [] } };
}

/** Word card: one lemma, all its senses, its forms. */
export function wordPayload(card: WordCard, reader?: Lang, shared = false): Payload {
  const pos = partOfSpeech(card.lemma, reader);
  const langs = order(['en', reader]).slice(0, reader && reader !== 'en' ? 2 : 1);
  const senses = card.senses
    .map((sense, i) => {
      const synonyms = isvNames(sense).filter((name) => name !== lemmaName(card.lemma));
      const words = translations(sense, langs, LINE_BUDGET * 2).replace(/\n/g, ' · ');
      return `[${i + 1}.](${entryUrl(sense, reader)}) ${words}${synonyms.length ? ` (${synonyms.join(', ')})` : ''}`;
    })
    .join('\n');
  const addition = card.lemma.addition ? ` ${standard(card.lemma.addition)}` : '';

  const used: Marks = new Map();
  const tables = formTables(card.paradigm, card.lemma.upos, reader, used);
  const fields = tables.slice(0, LIMITS.fields).map((table) => ({
    name: cut(table.title, LIMITS.fieldName),
    value: cut('```\n' + tableText(table) + '\n```', LIMITS.fieldValue),
    // Not inline: three inline fields are too narrow for a code block, and forms wrap.
    inline: false,
  }));
  if (used.size) {
    const notes = [...used].map(([variant, mark]) => `${mark.replace(/\*/g, '\\*')} ${VARIANTS[variant]}`);
    fields.push({ name: '​', value: notes.join('\n'), inline: false });
  }

  const share = shared ? undefined : shareButton(`slovo:share-word:${card.lemma.key}`);
  return {
    embeds: [
      {
        title: cut(`${lemmaName(card.lemma)}${addition} — ${pos}`, LIMITS.title),
        ...(card.senses[0] ? { url: entryUrl(card.senses[0], reader) } : {}),
        description: cut(senses, LIMITS.description),
        fields,
      },
    ],
    components: share ? [{ type: 1, components: [share] }] : [],
    allowed_mentions: { parse: [] },
  };
}

/** Violations of the limits above. */
export function limitProblems(payload: Payload): string[] {
  const problems: string[] = [];
  if ((payload.content ?? '').length > LIMITS.content) problems.push('content');
  if (payload.embeds.length > LIMITS.embeds) problems.push('embeds');
  let total = 0;
  for (const e of payload.embeds) {
    total += (e.title ?? '').length + (e.description ?? '').length + (e.footer?.text ?? '').length;
    if ((e.title ?? '').length > LIMITS.title) problems.push('title');
    if ((e.description ?? '').length > LIMITS.description) problems.push('description');
    if ((e.fields ?? []).length > LIMITS.fields) problems.push('fields');
    for (const f of e.fields ?? []) {
      total += f.name.length + f.value.length;
      if (f.name.length > LIMITS.fieldName) problems.push('field name');
      if (f.value.length > LIMITS.fieldValue) problems.push('field value');
    }
  }
  if (total > LIMITS.embedTotal) problems.push(`embed total ${total}`);
  for (const row of payload.components) {
    for (const c of row.components) {
      if (String(c.custom_id).length > LIMITS.customId) problems.push('custom_id');
      if (Array.isArray(c.options) && c.options.length > LIMITS.selectOptions) problems.push('select options');
    }
  }
  return problems;
}
