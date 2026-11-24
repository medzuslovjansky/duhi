// PUTs COMMANDS as the application's global commands. The deploy workflow runs it,
// not the bot, so a crash loop cannot exhaust Discord's daily limit of command creations.
//
// Usage: DISCORD_TOKEN=<token> DISCORD_APPLICATION_ID=<id> node src/register.ts

import { COMMANDS } from './commands.ts';

const { DISCORD_TOKEN, DISCORD_APPLICATION_ID } = process.env;
if (!DISCORD_TOKEN || !DISCORD_APPLICATION_ID) throw new Error('DISCORD_TOKEN and DISCORD_APPLICATION_ID are required');

const response = await fetch(`https://discord.com/api/v10/applications/${DISCORD_APPLICATION_ID}/commands`, {
  method: 'PUT',
  headers: { Authorization: `Bot ${DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(COMMANDS),
});
if (!response.ok) throw new Error(`Discord answered ${response.status}: ${await response.text()}`);
console.log(`${COMMANDS.length} commands registered`);
