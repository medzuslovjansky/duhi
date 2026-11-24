import { isLang, langOfLocale, type Lang } from './lang.ts';
import { resultsPayload, wordPayload, type Payload } from './render/embed.ts';
import type { Search } from './search.types.ts';

/** What a Discord interaction asks of the bot, without discord.js. */
export type BotEvent =
  | { kind: 'command'; query: string; lang?: string; locale?: string }
  | { kind: 'autocomplete'; prefix: string; lang?: string }
  | { kind: 'message-command'; text: string; locale?: string }
  | { kind: 'select'; customId: string; values: string[]; locale?: string }
  | { kind: 'button'; customId: string; locale?: string };

/** What the bot answers; index.ts turns it into the discord.js call. */
export type Reaction =
  | { kind: 'reply'; ephemeral: boolean; payload: Payload }
  | { kind: 'choices'; choices: { name: string; value: string }[] }
  | { kind: 'ignore' };

const lang = (value?: string): Lang | undefined => (isLang(value) ? value : undefined);
const privately = (payload: Payload): Reaction => ({ kind: 'reply', ephemeral: true, payload });
const publicly = (payload: Payload): Reaction => ({ kind: 'reply', ephemeral: false, payload });

/** Maps an event to a reaction. State travels in the components' custom IDs; the bot keeps none. */
export async function handle(event: BotEvent, search: Search): Promise<Reaction> {
  const reader = 'locale' in event ? langOfLocale(event.locale) : undefined;

  switch (event.kind) {
    case 'autocomplete': {
      const words = await search.suggest(event.prefix, lang(event.lang));
      return { kind: 'choices', choices: words.map((word) => ({ name: word, value: word })) };
    }

    case 'command': {
      const found = await search.find(event.query, lang(event.lang));
      return privately(resultsPayload(found, { query: event.query, lang: lang(event.lang), reader }));
    }

    case 'message-command': {
      // the longest query the command itself accepts (max_length of tekst)
      const query = event.text.trim().slice(0, 100);
      const found = await search.find(query);
      // One Interslavic word with one lemma: straight to its card
      const lemmas = new Set(found.flatMap((r) => r.lemmas.map((l) => l.key)));
      const isv = found.length > 0 && found.every((r) => r.matched.some((m) => m.lang === 'isv'));
      const card = isv && lemmas.size === 1 ? await search.word([...lemmas][0]) : undefined;
      return privately(card ? wordPayload(card, reader) : resultsPayload(found, { query, reader }));
    }

    case 'select': {
      if (event.customId !== 'slovo:word') return { kind: 'ignore' };
      const card = await search.word(event.values[0]);
      return privately(card ? wordPayload(card, reader) : resultsPayload([], { query: '', reader }));
    }

    case 'button': {
      const [prefix, action, ...rest] = event.customId.split(':');
      if (prefix !== 'slovo') return { kind: 'ignore' };
      if (action === 'share') {
        const [shareLang, ...query] = rest;
        const text = query.join(':');
        const found = await search.find(text, lang(shareLang));
        return publicly(resultsPayload(found, { query: text, lang: lang(shareLang), reader, shared: true }));
      }
      if (action === 'share-word') {
        const card = await search.word(rest.join(':'));
        return card ? publicly(wordPayload(card, reader, true)) : { kind: 'ignore' };
      }
      return { kind: 'ignore' };
    }
  }
}
