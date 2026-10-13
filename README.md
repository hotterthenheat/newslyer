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

```
npm install
npm run dev        # the app
npm run typecheck
npm test
```
