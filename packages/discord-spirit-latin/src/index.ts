import 'dotenv/config';
import { join } from 'path';
import * as DiscordJs from 'discord.js';
import { MessageFlags } from 'discord-api-types/v10';
import { transliterateWithUrlPreservation } from './retext.ts';
import { revisionEmbed, withRevision } from './revision.ts';
import { Store } from './store.ts';

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits,
} = DiscordJs;

const token = process.env.DISCORD_TOKEN!;
const applicationId = process.env.DISCORD_APPLICATION_ID!;
const dbPath = join(process.cwd(), 'state.db');
const store = new Store(dbPath);
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const commands = [
  new SlashCommandBuilder()
    .setName('enable')
    .setDescription('Aktivuj transliteraciju v tutom kanalu'),
  new SlashCommandBuilder()
    .setName('disable')
    .setDescription('Deaktivuj transliteraciju v tutom kanalu'),
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Prověri status transliteracije v tutom kanalu'),
];

function canManageChannels(member: DiscordJs.GuildMember | null): boolean {
  return member ? member.permissions.has(PermissionFlagsBits.ManageChannels) : false;
}

// Register commands
async function registerCommands() {
  const rest = new REST().setToken(token);
  try {
    console.debug('Started refreshing application (/) commands.');
    // Register commands globally
    await rest.put(Routes.applicationCommands(applicationId), {
      body: commands.map((command) => command.toJSON()),
    });
    console.debug('Successfully registered application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

// Handle command interactions
client.on('interactionCreate', async (interaction: DiscordJs.Interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) {
    await interaction.reply({
      content: '❌ Tutoj bot funkcionuje jedino v serverah.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const { commandName, channelId, channel, member } = interaction;
  const serverId = interaction.guild.id;

  const isChannelRelatedCommand = commandName === 'enable' || commandName === 'disable' || commandName === 'status';
  if (isChannelRelatedCommand && !channel) {
    await interaction.reply({
      content: '❌ Ne jest możno determinovati kanal.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const isChannelManagementCommand = commandName === 'enable' || commandName === 'disable';
  if (isChannelManagementCommand && !canManageChannels(member as DiscordJs.GuildMember | null)) {
    await interaction.reply({
      content: '❌ Ne imajete dozvoljenja vladati kanalami.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (!channel) {
    return;
  }

  if (commandName === 'enable') {
    try {
      store.trackChannel(serverId, channelId);
      await interaction.reply({
        content: `✅ Transliteracija je byla aktivovana v ${channel.toString()}`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Error tracking channel:', error);
      await interaction.reply({
        content: '❌ Grěška pri aktivovanju transliteracije.',
        flags: MessageFlags.Ephemeral,
      });
    }
  } else if (commandName === 'disable') {
    try {
      store.untrackChannel(serverId, channelId);
      await interaction.reply({
        content: `❌ Transliteracija je byla deaktivovana v ${channel.toString()}`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Error untracking channel:', error);
      await interaction.reply({
        content: '❌ Nastala je greška pri deaktivovanju transliteracije.',
        flags: MessageFlags.Ephemeral,
      });
    }
  } else if (commandName === 'status') {
    try {
      const enabled = store.isChannelEnabled(serverId, channelId);
      await interaction.reply({
        content: `ℹ️ Transliteracija jest **${enabled ? 'aktivovana' : 'deaktivovana'}** v ${channel.toString()}`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('Error checking channel status:', error);
      await interaction.reply({
        content: '❌ Nastala je greška pri prověranju statusa transliteracije.',
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

// Show in the bot's profile which commit is running (the Docker image carries it as GIT_SHA)
async function publishRevision(application: DiscordJs.ClientApplication) {
  const sha = process.env.GIT_SHA;
  if (!sha) return;

  try {
    const { description } = await application.fetch();
    const updated = withRevision(description ?? '', sha);
    if (updated !== description) {
      await application.edit({ description: updated });
    }
  } catch (error) {
    console.error('Error publishing revision:', error);
  }
}

client.once('clientReady', async (readyClient) => {
  console.log(`Listening as: ${readyClient.user.tag}`);
  await registerCommands();
  await publishRevision(readyClient.application);
});

client.on('messageCreate', async (message: DiscordJs.Message) => {
  if (message.author.bot) return;
  if (!message.guild) return; // Only work in servers

  // A bare ping, in any channel, answers with the running version
  if (/^<@!?(\d+)>$/.exec(message.content.trim())?.[1] === client.user?.id) {
    await message.reply({ embeds: [revisionEmbed(process.env.GIT_SHA, process.env.GIT_COMMIT_TIME, process.env.CI_RUN_URL)] }).catch(console.error);
    return;
  }

  const serverId = message.guild.id;
  const channelId = message.channelId;

  try {
    if (!store.isChannelEnabled(serverId, channelId)) return;
  } catch (error) {
    console.error('Error checking if channel is enabled:', error);
    return; // Silently fail - don't process message if we can't check status
  }

  try {
    const transliterated = await transliterateWithUrlPreservation(message.content);
    if (transliterated !== message.content) {
      await message.reply(transliterated);
    }
  } catch (error) {
    console.error('Transliteration error:', error);
  }
});

// Handle errors
client.on('error', (error: unknown) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Cleanup on exit
process.on('SIGINT', () => {
  store.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  store.close();
  process.exit(0);
});

// Initialize database and start the bot
async function start() {
  if (!token || !applicationId) {
    throw new Error('DISCORD_TOKEN and DISCORD_APPLICATION_ID are required');
  }

  // Initialize database first
  console.debug('Initializing database...');
  await store.init();
  console.debug('Database initialized');

  console.debug('Logging in to Discord...');
  await client.login(token);
  console.debug('Logged in to Discord');
}

start().catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});
