import { test, describe } from 'node:test';
import assert from 'node:assert';
import { transliterateWithUrlPreservation } from './retext.ts';

describe('transliterateWithUrlPreservation', () => {
  test('should transliterate text with URL and return changed=true', async (t) => {
    const input = "Поздрав, погледајте новину: https://news.rs/articles/српски-језик - заисто зајмливо";
    const result = await transliterateWithUrlPreservation(input);

    assert.strictEqual(result, 'Pozdrav, pogledajte novinu: https://news.rs/articles/српски-језик - zaisto zajmlivo');
  });

  test('should transliterate text with file path and return changed=true', async (t) => {
    const input = "Файл readme.md съдржи инструкции.";
    const result = await transliterateWithUrlPreservation(input);

    assert.strictEqual(result, 'Fajl readme.md sodrži instrukcii.');
  });

  test('should not change pure Latin text and return changed=false', async (t) => {
    const input = "Hello world! Visit https://example.com for more info.";
    const result = await transliterateWithUrlPreservation(input);

    assert.strictEqual(result, input);
  });

  test('should not change balanced Latin/Cyrillic text and return changed=false', async (t) => {
    const input = `
Поздрав, latinica ниже:

Мы имајемо за вас добру новину:

https://news.rs/articles/српски-језик

My imajemo za vas dobru novinu:

https://news.rs/articles/српски-језик`
    const result = await transliterateWithUrlPreservation(input);

    assert.strictEqual(result, input);
  });

  test('should turn `;` after a Glagolitic word into a question mark', async () => {
    // As typed in Discord, followed by a space and an emoji
    const input = 'Ⱅⱃⱑⰱⰰ ⰾⰻ ⱀⰰⰿ ⱅⱆ Ⰴⱆⱈ Ⰳⰾⰰⰳⱁⰾⰻⱌⰵ; 🤔';
    const result = await transliterateWithUrlPreservation(input);

    assert.strictEqual(result, 'Trěba li nam tu Duh Glagolice? 🤔');
  });

  test('should convert Glagolitic punctuation next to a URL', async () => {
    const input = 'Ⰽⱅⱁ ⰿⱁⰶⰵ ⱂⱃⱁⰲⱑⱃⰻⱅⰻ; https://example.com/a;b Ⰴⱁⰱⱃⱁ։';
    const result = await transliterateWithUrlPreservation(input);

    assert.strictEqual(result, 'Kto može prověriti? https://example.com/a;b Dobro.');
  });

  test('should leave Latin words inside Cyrillic text as they are', async () => {
    const input = 'Привет world, как дела?';
    const result = await transliterateWithUrlPreservation(input);

    assert.strictEqual(result, 'Privet world, kak dela?');
  });

  test('should read Glagolitic numerals, marked by titlo or by dots, also next to a URL', async () => {
    const input = 'ⰻ ⱍⰻⱄⰾⰰ ⱅⱁⰶ⸬ ⱍ҃ⱄ҃ⰼ҃ⰳ҃ ⰻ ·ⰸⰺ· ⰽⱀⰻⰳ· https://example.com/a·b ⱅⰰⰽ ·ⰽⰰⰽⱁ·';
    const result = await transliterateWithUrlPreservation(input);

    assert.strictEqual(result, 'i čisla tož: 1234 i 19 knig, https://example.com/a·b tak ,kako,');
  });
});
