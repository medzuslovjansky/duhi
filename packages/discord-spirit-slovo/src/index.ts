import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import * as DiscordJs from 'discord.js';
import { handle, type BotEvent } from './handle.ts';
import { withRevision } from './revision.ts';
import { SqliteSearch } from './search.ts';

const { Client, GatewayIntentBits, MessageFlags } = DiscordJs;

const token = process.env.DISCORD_TOKEN;
if (!token) throw new Error('DISCORD_TOKEN is required');

// Built into the image next to the bundle by src/build-db.ts.
const search = new SqliteSearch(process.env.SLOVNIK_DB ?? fileURLToPath(new URL('./dist/slovnik.db', import.meta.url)));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

/** The discord.js interaction as a plain event for handle(), or undefined for anything else. */
function eventOf(interaction: DiscordJs.Interaction): BotEvent | undefined {
  const locale = interaction.locale;
  if (interaction.isAutocomplete()) {
    return { kind: 'autocomplete', prefix: interaction.options.getFocused(), lang: interaction.options.getString('jezyk') ?? undefined };
  }
  if (interaction.isChatInputCommand() && interaction.commandName === 'gledaj') {
    return { kind: 'command', query: interaction.options.getString('tekst', true), lang: interaction.options.getString('jezyk') ?? undefined, locale };
  }
  if (interaction.isStringSelectMenu()) return { kind: 'select', customId: interaction.customId, values: interaction.values, locale };
  if (interaction.isButton()) return { kind: 'button', customId: interaction.customId, locale };
  return undefined;
}

client.on('interactionCreate', async (interaction) => {
  const event = eventOf(interaction);
  if (!event) return;
  try {
    const reaction = await handle(event, search);
    if (reaction.kind === 'choices' && interaction.isAutocomplete()) await interaction.respond(reaction.choices);
    if (reaction.kind === 'reply' && interaction.isRepliable()) {
      await interaction.reply({ ...reaction.payload, flags: reaction.ephemeral ? MessageFlags.Ephemeral : undefined });
    }
  } catch (error) {
    console.error(`interaction ${interaction.id} (${event.kind}) failed:`, error);
  }
});

// Write the running commit (GIT_SHA from the image) into the bot's profile; the deploy workflow reads it back.
client.once('clientReady', async (ready) => {
  console.log(`Listening as: ${ready.user.tag}`);
  const sha = process.env.GIT_SHA;
  if (!sha) return;
  try {
    const { description } = await ready.application.fetch();
    const updated = withRevision(description ?? '', sha);
    if (updated !== description) await ready.application.edit({ description: updated });
  } catch (error) {
    console.error('Error publishing revision:', error);
  }
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, async () => {
    await client.destroy();
    process.exit(0);
  });
}

await client.login(token);
