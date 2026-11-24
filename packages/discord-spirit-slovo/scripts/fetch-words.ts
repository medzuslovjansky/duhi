// Downloads the dictionary's `words` sheet as it is now into dist/, for src/build-db.ts.
// The sheet keeps no history, so the image records what it read: URL, time and sha256
// in dist/SOURCE.tsv, also printed in the build log.

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';

const SHEET = 'https://docs.google.com/spreadsheets/d/1N79e_yVHDo-d026HljueuKJlAAdeELAiPzdFzdBuKbY';
const GID = '1987833874';

async function download(): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(`${SHEET}/export?format=tsv&gid=${GID}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.text()).replace(/\r$/gm, '');
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
}

const text = await download();
// Google answers some failures with an HTML page and status 200
if (!text.startsWith('id\tisv\t')) throw new Error('the download is not the words sheet');

mkdirSync('dist', { recursive: true });
writeFileSync('dist/words.tsv', text);
const source = [`${SHEET}/edit#gid=${GID}`, new Date().toISOString(), createHash('sha256').update(text).digest('hex')].join('\t');
writeFileSync('dist/SOURCE.tsv', source + '\n');
console.log(source);
