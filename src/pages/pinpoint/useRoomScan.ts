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

import { useMarketBackground, useActiveTicker } from '../../context/marketStore';
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
