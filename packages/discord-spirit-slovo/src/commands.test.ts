import { test } from 'node:test';
import { COMMANDS } from './commands.ts';

test('command definitions', (t) => {
  t.assert.snapshot(COMMANDS);
});
