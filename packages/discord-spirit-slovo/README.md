# discord-spirit-slovo

Dictionary lookup bot. Commands: [repository README](../../README.md#discord-spirit-slovo).

## Where the data comes from

| File | What | Source |
| --- | --- | --- |
| `dist/words.tsv` | The dictionary's `words` sheet, downloaded at build time by `scripts/fetch-words.ts` | The sheet behind [interslavic-dictionary.com](https://interslavic-dictionary.com); URL, time and sha256 in `dist/SOURCE.tsv` and the build log |
| `src/vendor/migrate.cjs` | Splits `words` rows into senses and lemmas | `words-lemmas-migration/migrate.js`, unchanged |
| `src/site-labels.json` | Interslavic labels the bot shows, with translations | `src/translations/data.json` of [sonic16x/interslavic](https://github.com/sonic16x/interslavic) (MIT, © Sergey Cherebedov) |

The sheet keeps no history, so two builds of one commit can carry different dictionaries; `dist/SOURCE.tsv` in the image says which. Reading a dated dataset from Hugging Face instead is [#24](https://github.com/medzuslovjansky/duhi/issues/24).

`node scripts/vendor-site-labels.ts <data.json>` refreshes the labels. The few the site lacks are in `UNREVIEWED` in `src/labels.ts`. A leading `!` or `#` in a translation cell marks an unchecked machine translation; the bot shows it in italics.

## How a lookup works

1. `yarn build` runs `src/build-db.ts`: the snapshot goes through `migrate`, then into `dist/slovnik.db` (SQLite). Every Interslavic lemma is inflected with [@interslavic/morphology](https://www.npmjs.com/package/@interslavic/morphology) and its forms are indexed, so `pisal` finds `pisati`.
2. `src/handle.ts` maps each interaction to a reply through the `Search` interface (`src/search.types.ts`); `src/index.ts` wires it to discord.js.
3. `src/render/embed.ts` turns results into Discord messages.

Commands are registered by `src/register.ts`, which the deploy workflow runs. The bot asks for the `Guilds` intent only.

## Checks

`yarn test` runs, over a sample of the sheet in `src/__fixtures__`:

| File | Checks |
| --- | --- |
| `build-db.test.ts` | what `migrate` makes of the sample (input), the tables built from it (output) |
| `paradigm.test.ts` | the forms of a few lemmas |
| `search.test.ts` | what queries find, suggestions, and an `EXPLAIN QUERY PLAN` check that no lookup scans a table |
| `render.test.ts` | the messages, and Discord's message limits |
| `conversation.test.ts` | whole conversations: look up, open a word, show it to the channel |

After `yarn build` it also renders the word card of every lemma of the full dictionary (`scripts/smoke-paradigms.ts`) and fails if a single-word lemma of an inflecting part of speech has no forms, or a card breaks a Discord limit.

`yarn test:visual` takes screenshots of the messages and compares them with `visual/cards.spec.ts-snapshots/` (needs `npx playwright install chromium`; not part of the image build).
