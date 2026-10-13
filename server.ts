import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feedMiddleware } from './server/feed';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT ?? 8080);

/* THE FEED PROXY (server/feed.ts, docs/data-feed.md): /feed/uw/* and /feed/massive/* answered here with the keys from
   the process environment (UW_API_TOKEN, MASSIVE_API_KEY) — the browser bundle holds none. Loopback only unless
   FEED_ALLOW_LAN=1: a deployed server must gate /feed/* behind its own sign-in before opening it, or the key is
   anyone's to use through this host. */
app.use(feedMiddleware({ keys: { uw: process.env.UW_API_TOKEN || undefined, massive: process.env.MASSIVE_API_KEY || undefined }, allowLan: process.env.FEED_ALLOW_LAN === '1' }));

// Serve the production build output
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for undefined requests (SPA routing)
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(` Slayer Terminal Server Running:`);
  console.log(` http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});
