import { label, type LabelKey } from './labels.ts';
import { ENDONYMS, LANGS, type Lang } from './lang.ts';

/** Discord locales (discord.com/developers/docs/reference#locales) the site has labels for. */
const LOCALES: Record<string, Lang> = { 'en-US': 'en', 'en-GB': 'en', ru: 'ru', uk: 'uk', pl: 'pl', cs: 'cs', hr: 'hr', bg: 'bg' };

function localized(key: LabelKey) {
  return {
    description: label(key),
    description_localizations: Object.fromEntries(Object.entries(LOCALES).map(([locale, lang]) => [locale, label(key, lang)])),
  };
}

/** Guild installs and guild contexts only. */
const SCOPE = { integration_types: [0], contexts: [0] };

export const COMMANDS = [
  {
    type: 1,
    name: 'gledaj',
    ...localized('aboutSmallTitle'),
    ...SCOPE,
    options: [
      { type: 3, name: 'tekst', ...localized('typeWordLabel'), required: true, autocomplete: true, max_length: 100 },
      {
        type: 3,
        name: 'jezyk',
        ...localized('intelligibilityLanguage'),
        required: false,
        choices: LANGS.map((lang) => ({ name: `${lang} · ${ENDONYMS[lang]}`, value: lang })),
      },
    ],
  },
];
