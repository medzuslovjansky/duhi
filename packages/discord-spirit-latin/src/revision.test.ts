import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisionEmbed, withRevision } from './revision.ts';

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

test('revisionEmbed', () => {
  assert.deepEqual(revisionEmbed('abcdef123456', '1763280000', 'https://github.com/x/y/actions/runs/1').fields, [
    { name: 'Versija', value: '[abcdef1](https://github.com/medzuslovjansky/duhi/commit/abcdef123456)', inline: true },
    { name: 'Data', value: '<t:1763280000:f> (<t:1763280000:R>)', inline: true },
    { name: 'Sostavjenje', value: '[GitHub Actions](https://github.com/x/y/actions/runs/1)', inline: true },
  ]);
  assert.deepEqual(revisionEmbed(undefined, undefined).fields, [{ name: 'Versija', value: 'lokalna', inline: true }]);
});
