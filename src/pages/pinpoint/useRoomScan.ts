/*
==================================================
  SLAYER TERMINAL - THE ROOM'S SCAN (pages/pinpoint/useRoomScan.ts)

  Every Pinpoint page reads the frame's name off ONE
  scan — the room's (data/pinpointBook.ts scanOf):
  the house's book swept every ten seconds, or, with
  the room on the feed (data/feed/rooms.ts, the
  market registered by data/feed/pinpointMarket.ts),
  the vendor's latest book of the name, turning when
  an answer lands. One snapshot every box on the page
  reads within the ten seconds — never the house's
  figures beside the vendor's.
==================================================
*/

import { useMarketBackground, useActiveTicker, useMarketSelect, useSpot } from '../../context/marketStore';
import { bookMarket, useBookVersion } from '../../data/bookMarket';
import { scanOf } from '../../data/pinpointBook';
import type { MarketSnapshot } from '../../types/market';

/** The frame's name on the room's scan — null before the first book has come */
export function useRoomScan(): MarketSnapshot | null {
  /* the house: off the store, so a page renders when the scan turns, not on every tick inside it */
  const house = useMarketBackground(s => (s.snapshot && bookMarket().src === 'house' ? scanOf(s.snapshot.ticker, s.snapshot)?.snap ?? null : null));
  /* the feed: the vendor's latest book, turning as an answer lands */
  useBookVersion();
  const active = useActiveTicker();
  return bookMarket().src === 'feed' ? scanOf(active)?.snap ?? null : house;
}

/** A name's own book on the room's market — the feed's or the house's; null while it has not come */
export const ownScan = (ticker: string): MarketSnapshot | null => scanOf(ticker)?.snap ?? bookMarket().snapshotFor(ticker);

/*
  THE ONE PRICE ON THE PAGE (the owner, 2026-10-14, after a walk through the Map as a user: the head read 455.38, the
  matrix's spot row 455.77 and the tape's Last 455.52 on one screen — "the first thing a newcomer checks is whether the
  numbers agree"). The head printed the tick, the matrix the scan's spot (swept every ten seconds), the tape the last
  bar's close as of the last scan. Every box prints THIS now: on the house, the tick — the forming bar's close is the
  same figure (core/simulator.ts updateCandles sets it on every tick), so the tape's line ends on it too; on the feed,
  the vendor's spot off the room's scan, the one price the vendor figured the book at.
*/

/** A name's price now, as every box on the page prints it — null for a name with no price yet */
export function useRoomSpot(ticker: string | null | undefined): number | null {
  useBookVersion();
  const tick = useSpot(ticker ?? null);
  if (!ticker) return null;
  if (bookMarket().src === 'feed') return scanOf(ticker)?.snap?.spot ?? tick;
  return tick;
}

/** A READING of a name's price now, re-rendering only when the reading changes — a grid that splits its rows round the
    price wants the strike the price is under, not every cent of every tick */
export function useRoomSpotRead<T>(ticker: string, read: (spot: number | null) => T, isEqual: (a: T, b: T) => boolean = Object.is): T {
  useBookVersion();
  const house = useMarketSelect(s => read(s.quotes[ticker]?.spot ?? (s.snapshot && s.snapshot.ticker === ticker ? s.snapshot.spot : null)), isEqual);
  if (bookMarket().src === 'feed') return read(scanOf(ticker)?.snap?.spot ?? null);
  return house;
}
