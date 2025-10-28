export const CREATE_CHANNELS_TABLE = `
  CREATE TABLE IF NOT EXISTS channels (
    server TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    PRIMARY KEY (server, channel_id)
  )
`;

export const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_channels_server_enabled ON channels(server, enabled)`,
];
