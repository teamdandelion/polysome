#!/usr/bin/env bun

const isDev = process.argv.includes('--dev');

export {}; // Make this a module for top-level await

async function build() {
  const result = await Bun.build({
    entrypoints: ['./demo/index.html'],
    outdir: './dist',
    minify: false,
    sourcemap: 'external',
    target: 'browser',
  });

  if (!result.success) {
    console.error('Build failed');
    for (const message of result.logs) {
      console.error(message);
    }
    return false;
  }

  console.log('Build successful!');
  console.log(`Generated ${result.outputs.length} files`);
  return true;
}

// Initial build
await build();

// Start dev server if --dev flag is passed
if (isDev) {
  console.log('\nStarting dev server on http://localhost:4242');
  Bun.serve({
    port: 4242,
    async fetch(req) {
      const url = new URL(req.url);
      let path = url.pathname;

      // Serve index.html for root
      if (path === '/') {
        path = '/index.html';
      }

      const file = Bun.file(`./dist${path}`);
      if (await file.exists()) {
        return new Response(file);
      }

      // Fallback to index.html for SPA routing
      return new Response(Bun.file('./dist/index.html'));
    },
  });

  // Watch for changes and rebuild
  const watcher = require('fs').watch('./demo', { recursive: true }, async (_eventType: string, filename: string | null) => {
    if (filename && (filename.endsWith('.tsx') || filename.endsWith('.ts') || filename.endsWith('.css') || filename.endsWith('.html'))) {
      console.log(`\nFile changed: ${filename}`);
      await build();
    }
  });

  // Keep the process alive
  process.on('SIGINT', () => {
    watcher.close();
    process.exit(0);
  });
}
