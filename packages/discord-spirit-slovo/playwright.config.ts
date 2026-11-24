import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'visual',
  // Screenshots differ between operating systems; the committed ones are from macOS.
  snapshotPathTemplate: '{testDir}/{testFileName}-snapshots/{arg}-{platform}{ext}',
  use: { browserName: 'chromium' },
});
