#slyerterm

## What this build is made of

One terminal, put together from two lines of the same app:

- **From `hotterthenheat/3abida`:** the design system (tokens, holographic-silver accent, Helvetica in the terminal,
  the 11px type floor, colour-vision and high-contrast modes), the app shell and navigation (rail, command line,
  keyboard sheet, watchlist drawer, session strip, undo, Esc layers, pop-out for Terrain), accessibility pieces
  (skip link, focus rings, 44px touch targets), the phone layout, Alerts, the Glossary, and the Terrain, Trace,
  Dossier and Compass rooms.
- **From `Nuh00/revamp`:** everything else — the landing page and pricing, the product pages, sign-in (Supabase),
  checkout (Stripe), the legal pages, the start page, the plan wall, Settings (account, People, billing), Pulse,
  Pinpoint, the Weigher, Practice (paper, backtest with futures, journal), and the server, Supabase and engine.

There is no lime anywhere: the accent is the holographic silver, including in the landing's stills and films.

## The data feed

The terminal runs on its own simulated book until a key is in place. With `UW_API_TOKEN` (Unusual Whales) in a `.env` at
the repo root — never with a `VITE_` prefix, the page never sees a key — the dev server and `npm run serve` answer
`/feed/uw/*` themselves (`server/feed.ts`), and the rooms that are wired (Pinpoint, Terrain, Trace, the Dossier) read the
vendor's answers in place of the house's. `npm run feed:check` says whether the key works; Settings › Data sources shows
where each vendor stands. `docs/data-feed.md` is the owner's page for it.

## The Map (Pinpoint)

The book by strike and expiry as a matrix, a calendar or a profile (dealer gamma across spot); a data door that says where
the figures come from and how they are computed; the legs apart or together; the day box — the tape with the levels, the
flip's path and a bell on each level, and the book's net gamma under it on the same clock; the trader's clock; how the
levels held today, with the base rates of the sessions before; export as CSV or JSON. The band sits in a strip of its own;
the matrix prints each figure against its bar; on a wide screen the book packs to its names and the day box stands beside
it at the same height, and wherever nothing fits beside it the book fills the row. Every box folds and remembers it; the
facts stay in a strip once the head scrolls away; `/` keeps a typed strike; a phone gets jump links; the Map's colours
live in Settings › Appearance. `reports/` and `research_notes/` (git-ignored) hold the competitive audit behind it.

```
npm install
npm run dev        # the app
npm run typecheck
npm test
npm run feed:check # do the keys in .env work
```
