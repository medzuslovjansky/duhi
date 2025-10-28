import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Store } from './store.ts';

describe('Store', () => {
  let store: Store;
  let dbPath: string;

  beforeEach(() => {
    dbPath = join(tmpdir(), `test-store-${Date.now()}-${Math.random().toString(36).substring(7)}.db`);
    // Clean up any existing test database (shouldn't exist, but just in case)
    if (existsSync(dbPath)) {
      unlinkSync(dbPath);
    }
    store = new Store(dbPath);
  });

  afterEach(() => {
    store.close();
    // Clean up test database
    if (existsSync(dbPath)) {
      unlinkSync(dbPath);
    }
  });

  describe('init', () => {
    it('should create tables and indexes', async () => {
      await store.init();
      // If no error is thrown, tables were created successfully
      assert.ok(true);
    });
  });

  describe('trackChannel', () => {
    beforeEach(async () => {
      await store.init();
    });

    it('should track (enable) a channel', () => {
      const serverId = 'server1';
      const channelId = 'channel1';

      store.trackChannel(serverId, channelId);

      assert.strictEqual(store.isChannelEnabled(serverId, channelId), true);
    });

    it('should update existing channel to enabled', () => {
      const serverId = 'server1';
      const channelId = 'channel1';

      // First disable it
      store.untrackChannel(serverId, channelId);
      assert.strictEqual(store.isChannelEnabled(serverId, channelId), false);

      // Then enable it
      store.trackChannel(serverId, channelId);
      assert.strictEqual(store.isChannelEnabled(serverId, channelId), true);
    });
  });

  describe('untrackChannel', () => {
    beforeEach(async () => {
      await store.init();
    });

    it('should untrack (disable) a channel', () => {
      const serverId = 'server1';
      const channelId = 'channel1';

      // First enable it
      store.trackChannel(serverId, channelId);
      assert.strictEqual(store.isChannelEnabled(serverId, channelId), true);

      // Then disable it
      store.untrackChannel(serverId, channelId);
      assert.strictEqual(store.isChannelEnabled(serverId, channelId), false);
    });
  });

  describe('isChannelEnabled', () => {
    beforeEach(async () => {
      await store.init();
    });

    it('should return false by default for untracked channels', () => {
      const serverId = 'server1';
      const channelId = 'channel1';

      assert.strictEqual(store.isChannelEnabled(serverId, channelId), false);
    });

    it('should return true for explicitly enabled channels', () => {
      const serverId = 'server1';
      const channelId = 'channel1';

      store.trackChannel(serverId, channelId);

      assert.strictEqual(store.isChannelEnabled(serverId, channelId), true);
    });

    it('should return false for explicitly disabled channels', () => {
      const serverId = 'server1';
      const channelId = 'channel1';

      store.untrackChannel(serverId, channelId);

      assert.strictEqual(store.isChannelEnabled(serverId, channelId), false);
    });
  });

  describe('getEnabledChannels', () => {
    beforeEach(async () => {
      await store.init();
    });

    it('should return empty array when no channels are enabled', () => {
      const serverId = 'server1';
      const channels = store.getEnabledChannels(serverId);
      assert.deepStrictEqual(channels, []);
    });

    it('should return list of enabled channels for a server', () => {
      const serverId = 'server1';

      store.trackChannel(serverId, 'channel1');
      store.trackChannel(serverId, 'channel2');
      store.untrackChannel(serverId, 'channel3'); // Disabled

      const channels = store.getEnabledChannels(serverId);
      assert.strictEqual(channels.length, 2);
      assert.ok(channels.includes('channel1'));
      assert.ok(channels.includes('channel2'));
      assert.ok(!channels.includes('channel3'));
    });

    it('should only return channels for the specified server', () => {
      const server1 = 'server1';
      const server2 = 'server2';

      store.trackChannel(server1, 'channel1');
      store.trackChannel(server2, 'channel2');

      const server1Channels = store.getEnabledChannels(server1);
      const server2Channels = store.getEnabledChannels(server2);

      assert.strictEqual(server1Channels.length, 1);
      assert.strictEqual(server2Channels.length, 1);
      assert.ok(server1Channels.includes('channel1'));
      assert.ok(server2Channels.includes('channel2'));
    });
  });
});
