import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withRevision } from './revision.ts';

const link = (sha: string) => `Versija: https://github.com/medzuslovjansky/duhi/commit/${sha}`;

test('withRevision', () => {
  assert.equal(withRevision('', 'abc'), link('abc'));
  assert.equal(withRevision('Duh latinice', 'abc'), `Duh latinice\n\n${link('abc')}`);
  // The next deploy replaces the line instead of adding another one
  assert.equal(withRevision(withRevision('Duh latinice', 'abc'), 'def'), `Duh latinice\n\n${link('def')}`);
  // The line written under the old label is replaced too
  assert.equal(
    withRevision('Duh latinice\n\nVerzija: https://github.com/medzuslovjansky/duhi/commit/abc', 'def'),
    `Duh latinice\n\n${link('def')}`,
  );
});
