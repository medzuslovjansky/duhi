import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fold, langOfLocale, standard } from './lang.ts';

test('folds Interslavic spellings together', () => {
  assert.equal(fold('vodų', 'isv'), 'vodu');
  assert.equal(fold('вода', 'isv'), 'voda');
  assert.equal(fold('Ględati', 'isv'), 'gledati');
  assert.equal(fold('Вода', 'ru'), 'вода');
  assert.equal(standard('język'), 'jezyk');
});

test('reader language from the Discord locale', () => {
  assert.equal(langOfLocale('en-US'), 'en');
  assert.equal(langOfLocale('pl'), 'pl');
  assert.equal(langOfLocale('de'), undefined);
});
