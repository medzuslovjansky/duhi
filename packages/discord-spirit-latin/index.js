#!/usr/bin/env node

// src/index.ts
import "dotenv/config";
import { join } from "path";
import * as DiscordJs from "discord.js";
import { MessageFlags } from "discord-api-types/v10";

// src/retext.ts
import { unified } from "unified";
import retextEnglish from "retext-english";
import retextSyntaxUrls from "retext-syntax-urls";
import retextStringify from "retext-stringify";

// src/transliterate.ts
import { transliterate as translit } from "@interslavic/translit";
function transliterate(value, simplify = false) {
  if (!simplify && !isCyrillic(value) && !isGlagolitic(value)) {
    return value;
  }
  return translit(value, simplify ? "isv-Latn-x-sloviant" : "isv-Latn", { glagoliticNumerals: true });
}

// src/detect-script.ts
var IS_LATIN = /[\p{Script=Latin}]/mu;
var IS_CYRILLIC = /[\p{Script=Cyrillic}]/mu;
var IS_GLAGOLITIC = /[\p{Script=Glagolitic}]/mu;
function isCyrillic(text) {
  return text != null && IS_CYRILLIC.test(text);
}
function isGlagolitic(text) {
  return text != null && IS_GLAGOLITIC.test(text);
}
function isLatin(text) {
  return text != null && IS_LATIN.test(text);
}
function detectScript(lemma) {
  if (isLatin(lemma)) {
    return "latn";
  }
  if (isCyrillic(lemma)) {
    return "cyrl";
  }
  if (isGlagolitic(lemma)) {
    return "glag";
  }
  return;
}
function hasLatinOrBalancedNonLatinScript(text) {
  const scriptsMask = 0 | (isLatin(text) ? 1 : 0) | (isCyrillic(text) ? 2 : 0) | (isGlagolitic(text) ? 4 : 0);
  if (scriptsMask === 0) return true;
  if (scriptsMask === 1) return true;
  if ((scriptsMask & 1) === 0) return false;
  const scriptsCount = scriptsMask >= 6 ? 3 : 2;
  const counts = {
    latn: /* @__PURE__ */ new Map(),
    cyrl: /* @__PURE__ */ new Map(),
    glag: /* @__PURE__ */ new Map()
  };
  const lemmas = /* @__PURE__ */ new Set();
  text.replace(/([\p{Script=Cyrillic}\p{Script=Glagolitic}\p{Script=Latin}\p{Mark}]+)/gu, (_match, word) => {
    const script = detectScript(word);
    const lemma = transliterate(word.normalize("NFC").toLowerCase(), true);
    lemmas.add(lemma);
    if (script) {
      counts[script].set(lemma, (counts[script].get(lemma) || 0) + 1);
    }
    return word;
  });
  let nonBalancedCount = 0;
  for (const lemma of lemmas) {
    const [latn, cyrl, glag] = [counts.latn.get(lemma) || 0, counts.cyrl.get(lemma) || 0, counts.glag.get(lemma) || 0];
    const max = Math.max(latn, cyrl, glag);
    const leastCommon = Math.min(scriptsMask & 1 ? latn : max, scriptsMask & 2 ? cyrl : max, scriptsMask & 4 ? glag : max);
    nonBalancedCount += cyrl - leastCommon + (glag - leastCommon);
  }
  return nonBalancedCount <= lemmas.size / scriptsCount;
}

// src/retext.ts
function isSourceNode(node) {
  return node.type === "SourceNode";
}
function isParent(node) {
  return Array.isArray(node.children);
}
function retextRemoveNonTextNodes() {
  function visit(node) {
    if (isSourceNode(node)) {
      node.value = "";
    }
    if (isParent(node)) {
      node.children.forEach(visit);
    }
  }
  return (tree) => visit(tree);
}
var purifier = unified().use(retextEnglish).use(retextSyntaxUrls).use(retextRemoveNonTextNodes).use(retextStringify);
var urlFinder = unified().use(retextEnglish).use(retextSyntaxUrls);
function urlRanges(node, ranges = []) {
  if (isSourceNode(node) && node.position) {
    ranges.push([node.position.start.offset, node.position.end.offset]);
  } else if (isParent(node)) {
    node.children.forEach((child) => urlRanges(child, ranges));
  }
  return ranges;
}
async function transliterateWithUrlPreservation(text) {
  const pure = await purifier.process(text);
  if (hasLatinOrBalancedNonLatinScript(String(pure))) {
    return text;
  }
  const convert = (part) => part.split(/(\p{Script=Latin}+)/u).map((run, i) => i % 2 ? run : transliterate(run)).join("");
  const tree = await urlFinder.run(urlFinder.parse(text));
  let result = "";
  let from = 0;
  for (const [start2, end] of urlRanges(tree)) {
    result += convert(text.slice(from, start2)) + text.slice(start2, end);
    from = end;
  }
  return result + convert(text.slice(from));
}

// src/revision.ts
var COMMITS = "https://github.com/medzuslovjansky/duhi/commit/";
function withRevision(description, sha) {
  const rest = description.split("\n").filter((line) => !line.includes(COMMITS)).join("\n").trimEnd();
  return `${rest}

Versija: ${COMMITS}${sha}`.trimStart();
}
function revisionEmbed(sha, commitTime, runUrl) {
  return {
    title: "Duh Latinice",
    fields: [
      { name: "Versija", value: sha ? `[${sha.slice(0, 7)}](${COMMITS}${sha})` : "lokalna", inline: true },
      ...commitTime ? [{ name: "Data", value: `<t:${commitTime}:f> (<t:${commitTime}:R>)`, inline: true }] : [],
      ...runUrl ? [{ name: "Sostavjenje", value: `[GitHub Actions](${runUrl})`, inline: true }] : []
    ]
  };
}

// src/store.ts
import { DatabaseSync } from "node:sqlite";

// src/ddl.ts
var CREATE_CHANNELS_TABLE = `
  CREATE TABLE IF NOT EXISTS channels (
    server TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (server, channel_id)
  )
`;
var CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_channels_server_enabled ON channels(server, enabled)`
];

// src/store.ts
var Store = class {
  db;
  #stmtTrackChannel;
  #stmtUntrackChannel;
  #stmtIsChannelEnabled;
  #stmtGetEnabledChannels;
  constructor(dbFilePath) {
    this.db = new DatabaseSync(dbFilePath);
  }
  async init() {
    this.db.exec(CREATE_CHANNELS_TABLE);
    for (const indexSql of CREATE_INDEXES) {
      this.db.exec(indexSql);
    }
    this.#stmtTrackChannel = this.db.prepare(`
      INSERT INTO channels (server, channel_id, enabled, updated_at)
      VALUES (?, ?, 1, unixepoch())
      ON CONFLICT(server, channel_id) DO UPDATE SET
        enabled = 1,
        updated_at = unixepoch()
    `);
    this.#stmtUntrackChannel = this.db.prepare(`
      INSERT INTO channels (server, channel_id, enabled, updated_at)
      VALUES (?, ?, 0, unixepoch())
      ON CONFLICT(server, channel_id) DO UPDATE SET
        enabled = 0,
        updated_at = unixepoch()
    `);
    this.#stmtIsChannelEnabled = this.db.prepare(`
      SELECT enabled FROM channels
      WHERE server = ? AND channel_id = ?
    `);
    this.#stmtGetEnabledChannels = this.db.prepare(`
      SELECT channel_id FROM channels
      WHERE server = ? AND enabled = 1
    `);
  }
  trackChannel(serverId, channelId) {
    this.#stmtTrackChannel.run(serverId, channelId);
  }
  untrackChannel(serverId, channelId) {
    this.#stmtUntrackChannel.run(serverId, channelId);
  }
  isChannelEnabled(serverId, channelId) {
    const result = this.#stmtIsChannelEnabled.get(serverId, channelId);
    if (!result) {
      return false;
    }
    return result.enabled === 1;
  }
  getEnabledChannels(serverId) {
    const result = this.#stmtGetEnabledChannels.all(serverId);
    return result.map((row) => row.channel_id);
  }
  close() {
    this.db.close();
  }
};

// src/index.ts
var {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionFlagsBits
} = DiscordJs;
var token = process.env.DISCORD_TOKEN;
var applicationId = process.env.DISCORD_APPLICATION_ID;
var dbPath = join(process.cwd(), "state.db");
var store = new Store(dbPath);
var client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
var commands = [
  new SlashCommandBuilder().setName("enable").setDescription("Aktivuj transliteraciju v tutom kanalu"),
  new SlashCommandBuilder().setName("disable").setDescription("Deaktivuj transliteraciju v tutom kanalu"),
  new SlashCommandBuilder().setName("status").setDescription("Prov\u011Bri status transliteracije v tutom kanalu")
];
function canManageChannels(member) {
  return member ? member.permissions.has(PermissionFlagsBits.ManageChannels) : false;
}
async function registerCommands() {
  const rest = new REST().setToken(token);
  try {
    console.debug("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationCommands(applicationId), {
      body: commands.map((command) => command.toJSON())
    });
    console.debug("Successfully registered application (/) commands.");
  } catch (error) {
    console.error("Error registering commands:", error);
  }
}
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) {
    await interaction.reply({
      content: "\u274C Tutoj bot funkcionuje jedino v serverah.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  const { commandName, channelId, channel, member } = interaction;
  const serverId = interaction.guild.id;
  const isChannelRelatedCommand = commandName === "enable" || commandName === "disable" || commandName === "status";
  if (isChannelRelatedCommand && !channel) {
    await interaction.reply({
      content: "\u274C Ne jest mo\u017Cno determinovati kanal.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  const isChannelManagementCommand = commandName === "enable" || commandName === "disable";
  if (isChannelManagementCommand && !canManageChannels(member)) {
    await interaction.reply({
      content: "\u274C Ne imajete dozvoljenja vladati kanalami.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  if (!channel) {
    return;
  }
  if (commandName === "enable") {
    try {
      store.trackChannel(serverId, channelId);
      await interaction.reply({
        content: `\u2705 Transliteracija je byla aktivovana v ${channel.toString()}`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error("Error tracking channel:", error);
      await interaction.reply({
        content: "\u274C Gr\u011B\u0161ka pri aktivovanju transliteracije.",
        flags: MessageFlags.Ephemeral
      });
    }
  } else if (commandName === "disable") {
    try {
      store.untrackChannel(serverId, channelId);
      await interaction.reply({
        content: `\u274C Transliteracija je byla deaktivovana v ${channel.toString()}`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error("Error untracking channel:", error);
      await interaction.reply({
        content: "\u274C Nastala je gre\u0161ka pri deaktivovanju transliteracije.",
        flags: MessageFlags.Ephemeral
      });
    }
  } else if (commandName === "status") {
    try {
      const enabled = store.isChannelEnabled(serverId, channelId);
      await interaction.reply({
        content: `\u2139\uFE0F Transliteracija jest **${enabled ? "aktivovana" : "deaktivovana"}** v ${channel.toString()}`,
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error("Error checking channel status:", error);
      await interaction.reply({
        content: "\u274C Nastala je gre\u0161ka pri prov\u011Branju statusa transliteracije.",
        flags: MessageFlags.Ephemeral
      });
    }
  }
});
async function publishRevision(application) {
  const sha = process.env.GIT_SHA;
  if (!sha) return;
  try {
    const { description } = await application.fetch();
    const updated = withRevision(description ?? "", sha);
    if (updated !== description) {
      await application.edit({ description: updated });
    }
  } catch (error) {
    console.error("Error publishing revision:", error);
  }
}
client.once("clientReady", async (readyClient) => {
  console.log(`Listening as: ${readyClient.user.tag}`);
  await registerCommands();
  await publishRevision(readyClient.application);
});
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (/^<@!?(\d+)>$/.exec(message.content.trim())?.[1] === client.user?.id) {
    await message.reply({ embeds: [revisionEmbed(process.env.GIT_SHA, process.env.GIT_COMMIT_TIME, process.env.CI_RUN_URL)] }).catch(console.error);
    return;
  }
  const serverId = message.guild.id;
  const channelId = message.channelId;
  try {
    if (!store.isChannelEnabled(serverId, channelId)) return;
  } catch (error) {
    console.error("Error checking if channel is enabled:", error);
    return;
  }
  try {
    const transliterated = await transliterateWithUrlPreservation(message.content);
    if (transliterated !== message.content) {
      await message.reply(transliterated);
    }
  } catch (error) {
    console.error("Transliteration error:", error);
  }
});
client.on("error", (error) => {
  console.error("Discord client error:", error);
});
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});
process.on("SIGINT", () => {
  store.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  store.close();
  process.exit(0);
});
async function start() {
  if (!token || !applicationId) {
    throw new Error("DISCORD_TOKEN and DISCORD_APPLICATION_ID are required");
  }
  console.debug("Initializing database...");
  await store.init();
  console.debug("Database initialized");
  console.debug("Logging in to Discord...");
  await client.login(token);
  console.debug("Logged in to Discord");
}
start().catch((error) => {
  console.error("Failed to start bot:", error);
  process.exit(1);
});
