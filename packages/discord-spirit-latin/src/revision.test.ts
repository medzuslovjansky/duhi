import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRevision } from './revision.ts';

const link = (sha: string) => `Verzija: https://github.com/medzuslovjansky/duhi/commit/${sha}`;

test('withRevision', () => {
  assert.equal(withRevision('', 'abc'), link('abc'));
  assert.equal(withRevision('Duh latinice', 'abc'), `Duh latinice\n\n${link('abc')}`);
  // The next deploy replaces the line instead of adding another one
  assert.equal(withRevision(withRevision('Duh latinice', 'abc'), 'def'), `Duh latinice\n\n${link('def')}`);
});
