# @interslavic/discord-spirit-latin

Discord bot that automatically transliterates Cyrillic and Glagolitic text into Latin letters.

## Installation

```bash
export DISCORD_TOKEN=your_bot_token_here
export DISCORD_APPLICATION_ID=your_application_id_here

npx @interslavic/discord-spirit-latin
```

## Commands

- `/enable` - Enable transliteration in the current channel (requires Manage Channels permission)
- `/disable` - Disable transliteration in the current channel (requires Manage Channels permission)
- `/status` - Check if transliteration is enabled in the current channel

By default, the bot does not work in any channels. Use `/enable` in specific channels to activate transliteration.
