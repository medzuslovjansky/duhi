import { DatabaseSync } from 'node:sqlite';
import { CREATE_CHANNELS_TABLE, CREATE_INDEXES } from './ddl.ts';

type PreparedStatement = ReturnType<DatabaseSync['prepare']>;

export class Store {
  private db: DatabaseSync;
  #stmtTrackChannel!: PreparedStatement;
  #stmtUntrackChannel!: PreparedStatement;
  #stmtIsChannelEnabled!: PreparedStatement;
  #stmtGetEnabledChannels!: PreparedStatement;

  constructor(dbFilePath: string) {
    this.db = new DatabaseSync(dbFilePath);
  }

  async init(): Promise<void> {
    // Create tables
    this.db.exec(CREATE_CHANNELS_TABLE);

    // Create indexes
    for (const indexSql of CREATE_INDEXES) {
      this.db.exec(indexSql);
    }

    // Prepare statements
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

  trackChannel(serverId: string, channelId: string): void {
    this.#stmtTrackChannel.run(serverId, channelId);
  }

  untrackChannel(serverId: string, channelId: string): void {
    this.#stmtUntrackChannel.run(serverId, channelId);
  }

  isChannelEnabled(serverId: string, channelId: string): boolean {
    const result = this.#stmtIsChannelEnabled.get(serverId, channelId) as { enabled: number } | undefined;

    // If channel is not tracked, default to disabled (bot only works in explicitly enabled channels)
    if (!result) {
      return false;
    }

    return result.enabled === 1;
  }

  getEnabledChannels(serverId: string): string[] {
    const result = this.#stmtGetEnabledChannels.all(serverId) as { channel_id: string }[];
    return result.map((row) => row.channel_id);
  }

  close(): void {
    this.db.close();
  }
}
