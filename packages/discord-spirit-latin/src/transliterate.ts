import { transliterate as translit } from '@interslavic/translit';

import { isCyrillic, isGlagolitic } from './detect-script.ts';

export function transliterate(value: string, simplify = false): string {
  if (!simplify && !isCyrillic(value) && !isGlagolitic(value)) {
    return value; // the engine would otherwise respell plain Latin ("world" -> "vorld")
  }

  return translit(value, simplify ? 'isv-Latn-x-sloviant' : 'isv-Latn');
}
