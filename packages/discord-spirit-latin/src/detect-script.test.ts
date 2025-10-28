import { test, describe } from 'node:test';
import assert from 'node:assert';
import { hasLatinOrBalancedNonLatinScript } from './detect-script.ts';

describe('hasLatinOrBalancedNonLatinScript', () => {
  test('should return true for balanced Latin/Cyrillic text', (t) => {
    const result = hasLatinOrBalancedNonLatinScript('hello хелло');
    assert.strictEqual(result, true);
  });

  test('should return true for moderately unbalanced text', (t) => {
    const result = hasLatinOrBalancedNonLatinScript('hello поздрав');
    assert.strictEqual(result, true);
  });

  test('should return false for unbalanced text', (t) => {
    const result = hasLatinOrBalancedNonLatinScript('hello поздрав всим');
    assert.strictEqual(result, false);
  });

  test('should return true for pure Latin text', (t) => {
    const result = hasLatinOrBalancedNonLatinScript('hello world! Visit https://example.com for more info.');
    assert.strictEqual(result, true);
  });

  test('should return false for pure Cyrillic text', (t) => {
    const result = hasLatinOrBalancedNonLatinScript('привет мир');
    assert.strictEqual(result, false);
  });

  test('should return false for pure Glagolitic text', (t) => {
    const result = hasLatinOrBalancedNonLatinScript('ⰒⰓⰉⰂⰅⰕ ⰏⰉⰓ');
    assert.strictEqual(result, false);
  });

  test('should return true for empty string', (t) => {
    const result = hasLatinOrBalancedNonLatinScript('');
    assert.strictEqual(result, true);
  });

  test('should return true for text with only punctuation', (t) => {
    const result = hasLatinOrBalancedNonLatinScript('!@#$%^&*()');
    assert.strictEqual(result, true);
  });

  test('should return true for text with numbers only', (t) => {
    const result = hasLatinOrBalancedNonLatinScript('123 456 789');
    assert.strictEqual(result, true);
  });

  test('should return false for mixed scripts without balance', (t) => {
    const result = hasLatinOrBalancedNonLatinScript('hello привет ⰒⰓⰉⰂⰅⰕ');
    assert.strictEqual(result, false);
  });

  test('should return false for repeated balanced words', (t) => {
    const result = hasLatinOrBalancedNonLatinScript('hello хелло хелло хелло поздрав');
    assert.strictEqual(result, false);
  });
});
