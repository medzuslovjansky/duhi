// Screenshot tests of rendered messages; baselines in visual/cards.spec.ts-snapshots/.
// `yarn test:visual` (needs `npx playwright install chromium`); accept a change with --update-snapshots.
// Not in `yarn test`: the image build has no browser.

import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { expect, test } from '@playwright/test';
import { build } from 'esbuild';
import { buildDb, parseTsv } from '../src/build-db.ts';
import { resultsPayload, wordPayload, type Payload } from '../src/render/embed.ts';
import { SqliteSearch } from '../src/search.ts';
import { html } from './html.ts';

const db = new DatabaseSync(':memory:');
buildDb(parseTsv(readFileSync(new URL('../src/__fixtures__/words-sample.tsv', import.meta.url), 'utf8')), db);
const search = new SqliteSearch(db);

const CASES: [string, () => Promise<Payload>][] = [
  ['results-voda-ru', async () => resultsPayload(await search.find('вода'), { query: 'вода', reader: 'ru' })],
  ['results-spasti', async () => resultsPayload(await search.find('spasti'), { query: 'spasti', reader: 'en' })],
  ['results-nothing-pl', async () => resultsPayload(await search.find('xqzw'), { query: 'xqzw', reader: 'pl' })],
  ['word-kamenj-pl', async () => wordPayload((await search.word('kamenj|NOUN'))!, 'pl')],
  ['word-pisati-ru', async () => wordPayload((await search.word('pisati|VERB'))!, 'ru')],
  ['word-dobry-cs', async () => wordPayload((await search.word('dobry|ADJ'))!, 'cs')],
];

// Desktop and phone widths
const WIDTHS = [900, 390];

let script = '';
test.beforeAll(async () => {
  const bundle = await build({ stdin: { contents: "import '@skyra/discord-components-core';", resolveDir: import.meta.dirname }, bundle: true, write: false, format: 'esm' });
  script = bundle.outputFiles[0].text;
});

for (const [name, payload] of CASES) {
  for (const width of WIDTHS) {
    test(`${name} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.setContent(html(await payload(), script));
      await page.waitForFunction(() => customElements.get('discord-embed') !== undefined);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('discord-messages')).toHaveScreenshot(`${name}-${width}.png`);
    });
  }
}
