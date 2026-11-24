// Whole conversations with the bot, without Discord: handle() answers each event and the
// test plays the person, pressing what the previous answer offered.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handle, type BotEvent, type Reaction } from './handle.ts';
import type { Payload } from './render/embed.ts';
import { search } from './__fixtures__/sample.ts';

const ask = (event: BotEvent) => handle(event, search);

function reply(reaction: Reaction): { ephemeral: boolean; payload: Payload } {
  assert.equal(reaction.kind, 'reply');
  return reaction as { kind: 'reply'; ephemeral: boolean; payload: Payload };
}

/** The components of a message, by type: the word menu and the share button. */
function controls(payload: Payload) {
  const all = payload.components.flatMap((row) => row.components);
  const menu = all.find((c) => c.type === 3) as { custom_id: string; options: { label: string; value: string }[] } | undefined;
  const share = all.find((c) => c.type === 2) as { custom_id: string; label: string } | undefined;
  return { menu, share };
}

test('look up, open a word, show it to everyone', async () => {
  // A Russian reader types /gledaj вода
  const results = reply(await ask({ kind: 'command', query: 'вода', locale: 'ru' }));
  assert.equal(results.ephemeral, true);
  assert.equal(results.payload.embeds[0].title, 'voda');
  assert.match(results.payload.embeds[0].description!, /^\*существительное, женский род\*/);

  // picks voda in the menu under the results
  const { menu, share } = controls(results.payload);
  assert.ok(menu && share);
  const voda = menu.options.find((o) => o.value === 'voda|NOUN');
  assert.ok(voda, 'voda is in the menu');
  const card = reply(await ask({ kind: 'select', customId: menu.custom_id, values: [voda.value], locale: 'ru' }));
  assert.equal(card.ephemeral, true);
  assert.match(card.payload.embeds[0].title!, /^voda — /);
  assert.ok(card.payload.embeds[0].fields!.some((f) => f.value.includes('vodu')), 'the card has the forms');

  // shows the card to the channel: a public copy, without a share button of its own
  const cardShare = controls(card.payload).share;
  assert.ok(cardShare);
  const shown = reply(await ask({ kind: 'button', customId: cardShare.custom_id, locale: 'ru' }));
  assert.equal(shown.ephemeral, false);
  assert.deepEqual(shown.payload.embeds, card.payload.embeds);
  assert.equal(controls(shown.payload).share, undefined);
});

test('the results can be shown to everyone as they are', async () => {
  const results = reply(await ask({ kind: 'command', query: 'spasti', lang: 'isv', locale: 'en-US' }));
  const shown = reply(await ask({ kind: 'button', customId: controls(results.payload).share!.custom_id, locale: 'en-US' }));
  assert.equal(shown.ephemeral, false);
  assert.deepEqual(shown.payload.embeds, results.payload.embeds);
});

test('typing offers suggestions', async () => {
  const reaction = await ask({ kind: 'autocomplete', prefix: 'vod' });
  assert.equal(reaction.kind, 'choices');
  const choices = (reaction as Extract<Reaction, { kind: 'choices' }>).choices;
  assert.ok(choices.length > 0 && choices.length <= 25);
  assert.ok(choices.every((c) => c.name === c.value && c.value.length <= 100));
});

test('nothing found', async () => {
  const results = reply(await ask({ kind: 'command', query: 'xqzw', locale: 'pl' }));
  assert.equal(results.payload.embeds.length, 0);
  assert.match(results.payload.content!, /Nic nie znaleziono/);
});

test('components of other bots and stale menus are ignored', async () => {
  assert.deepEqual(await ask({ kind: 'button', customId: 'other:thing' }), { kind: 'ignore' });
  assert.deepEqual(await ask({ kind: 'select', customId: 'other', values: ['x'] }), { kind: 'ignore' });
  assert.deepEqual(await ask({ kind: 'button', customId: 'slovo:share-word:gone|NOUN' }), { kind: 'ignore' });
});
