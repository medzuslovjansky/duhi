import 'dotenv/config';
import { Client, GatewayIntentBits, Message } from 'discord.js';
import { transliterateWithUrlPreservation } from './retext.ts';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

function getAllowedChannels(): string[] {
  const allowedChannels = process.env.ALLOWED_CHANNELS;
  if (allowedChannels && allowedChannels.trim() !== '') {
    return allowedChannels.split(',').map(id => id.trim());
  }
  return [];
}

const allowedChannels = new Set(getAllowedChannels());

client.once('clientReady', () => {
  console.log(`Listening as: ${client.user?.tag}`);
  console.log(`Bot restricted to channels: ${Array.from(allowedChannels).join(', ')}`);
});

client.on('messageCreate', async (message: Message) => {
  if (message.author.bot) return;
  if (!allowedChannels.has(message.channelId)) return;

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
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Start the bot
const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN environment variable is required');
  process.exit(1);
}

client.login(token);
