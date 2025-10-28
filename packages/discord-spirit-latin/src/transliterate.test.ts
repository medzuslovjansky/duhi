import { test, describe } from 'node:test';
import assert from 'node:assert';
import { transliterate } from './transliterate.ts';

describe('transliterate', () => {
  test('should return latin text unchanged', (t) => {
    const result = transliterate('hello world');
    assert.strictEqual(result, 'hello world');
  });

  test('should transliterate cyrillic text', (t) => {
    const result = transliterate('поздрав свєте');
    assert.strictEqual(result, 'pozdrav světe');
  });

  test('should transliterate glagolitic text', (t) => {
    const result = transliterate('ⱄⰾⱁⰲⱁ');
    assert.strictEqual(result, 'slovo');
  });

  test('should simplify latin text with ě when simplify=true', (t) => {
    const result = transliterate('lěs noć', true);
    assert.strictEqual(result, 'les noč');
  });

  test('should transliterate cyrillic and glagolitic text with simplify', (t) => {
    const result = transliterate('свєт ⱄⰹⰵⱅ', true);
    assert.strictEqual(result, 'svet sjet');
  });
});

