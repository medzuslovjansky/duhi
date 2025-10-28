import utils from '@interslavic/utils';

import { isCyrillic, isGlagolitic } from './detect-script.ts';

export function transliterate(value: string, simplify = false): string {
  if (isGlagolitic(value)) {
    value = utils.transliterate2.glag2latn(value);
  }

  if (isCyrillic(value) || simplify) {
    value = utils.transliterate(value, simplify ? 'isv-Latn-x-sloviant' : 'isv-Latn');
  }

  return value;
}
