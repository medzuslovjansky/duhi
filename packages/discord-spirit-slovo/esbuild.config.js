import { build } from 'esbuild';

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'index.js',
  packages: 'external',
  banner: {
    js: '#!/usr/bin/env node',
  },
});

