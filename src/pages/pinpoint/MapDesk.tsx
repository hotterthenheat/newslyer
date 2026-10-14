/*
==================================================
  SLAYER TERMINAL - THE MAP
  (pages/pinpoint/MapDesk.tsx)

  The book by expiry, FIRST (Noah, 2026-09-12:
  "remove this entire section from the pinpoint
  map page. the first thing that should be shown
  is the heatmap and this is already shown in
  multiple pages like the terrain and pulse
  pages"). The day-on-one-chart box that opened
  this page since band 2 (the tape with the dealer
  levels drawn on it, the strike rail fused to its
  price axis as one profile panel, its own head,
  fullscreen, drawing rail and replay pick) is
  GONE — Terrain and Pulse carry that chart. What
  is left is the read, top to bottom: the Exposure
  Ledger (the same book by expiry, as a heatmap or
  a ladder), the Trader's Clock, the Wall Report
  Card, your positions. One strike shared across
  them (FocusContext); each box can step onto its
  own name; the replay runs the boxes on a minute
  grid from the calendar's own strip.

  NOTHING HERE IS NEW MACHINERY. The book is
  `buildExposureProfile` — the same one the Strike
  Pressure Ladder widget reads — under the calendar's
  expiries, greek and window. The Calendar (the
  Exposure Ledger) is band 3 of the blank canvas.
==================================================
*/

import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import Simulator from '../../core/simulator';
import { useMarketData } from '../../context/MarketDataContext';
import { useFocus } from '../../context/FocusContext';
import ScopeChip from '../../components/ui/ScopeChip';
import { Deferred } from '../../components/ui/Skeleton';
import { CalendarInner, DayInner, MapPageSkeleton, ReportInner } from './pinpointSkeletons';
import ExposureField from '../../components/gex/ExposureField';
import TraderClock from '../../components/gex/TraderClock';
import WallReportCard from '../../components/gex/WallReportCard';
import TapeBox from '../../components/gex/TapeBox';
import BookThroughDay from '../../components/gex/BookThroughDay';
import DayBox from '../../components/gex/DayBox';
import ReplayStrip from '../../components/gex/ReplayStrip';
import { barsAt, replayDay, replayLabel, replayMinute, replayRange, replayStart, snapPos, snapshotAt, type ReplayRange } from '../../data/replay';
import { readSessionClock } from '../../data/moc';
import { setReplayLabel } from './replayState';
import { readPosition, usePositions } from '../../data/positions';
import { buildExposureProfile, type StrikeWindow } from '../../data/exposure';
import type { ExposureExpiry } from '../../types/gex';
import type { Candle, MarketSnapshot } from '../../types/market';
import { useOnScreen } from '../../components/ui/useOnScreen';
import { bookMarket } from '../../data/bookMarket';
import { ownScan, useRoomScan } from './useRoomScan';

/* THE WINDOW IS THE WHOLE BOOK (Noah, 2026-09-05): thirty strikes each side are
   built once; the boxes draw whatever of them they need. */
const WINDOW: StrikeWindow = 30;
/** Your positions read against the 0DTE book — the same book the ladder tile draws */
const POSITIONS_EXPIRY: ExposureExpiry = '0DTE';

/*
  EACH BOX CAN HOLD ITS OWN NAME (Noah, 2026-09-06: "i should be able to change
  tickers on each singular section as i please … they should all start off as
  one"). The scoping rule, box by box: a box FOLLOWS the frame's name until its
  chip unlinks it, then it reads its own snapshot (the simulator's pure read,
  refreshed on the scan cadence) and its chip wears the name. Held across route
  changes within a session and reset on reload, so every visit starts as one.
*/
type BoxKey = 'calendar' | 'tape' | 'day' | 'report';
type Scopes = Partial<Record<BoxKey, string>>;
let scopesMemory: Scopes = {};

const MapDesk = () => {
  const { marketData, activeTicker, changeTicker } = useMarketData();
  const { focus, toggleFocus, focusOn } = useFocus();

  /* TYPE A STRIKE TO KEEP IT (idea 8, 2026-10-13): `/` opens a small prompt; Enter keeps the nearest strike the chain
     has, everywhere on the page; Esc closes. Caught before the command line, which `/` opens on pages with no search. */
  const [strikeAsk, setStrikeAsk] = useState(false);
  const strikeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (document.querySelector('[role="dialog"], [data-guide-layer], [data-strike-ask]')) return;
      e.preventDefault();
      e.stopPropagation();
      setStrikeAsk(true);
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, []);

  /* Which boxes have stepped off the frame, and onto which name */
  const [scopes, setScopesState] = useState<Scopes>(scopesMemory);
  const setScope = (key: BoxKey, t: string | undefined) =>
    setScopesState(prev => {
      const next = { ...prev };
      if (t === undefined) delete next[key];
      else next[key] = t;
      scopesMemory = next;
      return next;
    });

  /* ONE LENS PER PAGE (Noah, 2026-09-08, "do the sync"): the calendar's Greek is
     the page's — the calendar's "All" is the five greeks side by side.
     THE MAP OPENS ON ALL FIVE (Noah, 2026-09-21: "the initial render of the
     pinpoint map page should be the 5 box setup always") — the ladder with a
     pane a greek, the net bar in each; the pick is the page's for the visit,
     never stored, so every visit opens the same way. */
  /* GEX ALONE BY REST (the owner, 2026-10-14, after a walk through the page as a retail user: five greeks by forty
     strikes was two hundred figures before the price chart, a thousand pixels down). One greek, so the book packs to
     its one column and the day stands beside it on a desk; the band's Greek card opens the rest. */
  const [greekPick, setGreekPick] = useState<string[]>(['gex']);

  /* REPLAY (2026-09-08): one position on today's session — seconds from the
     open — and every box reads the book as it stood then (data/replay.ts).
     The strip on the calendar's band is the transport; it starts from the open
     (the chart whose bar picked the minute is gone from this page). Esc, a
     name change, or "Back to live" ends it. Boxes pinned to another name stay
     live. */
  const [replay, setReplay] = useState<{ phase: 'play'; range: ReplayRange; pos: number; playing: boolean; pace: number } | null>(null);
  const replayOn = replay != null;
  const playing = replay;

  /* THE ROOM'S SCAN (pages/pinpoint/useRoomScan.ts): the house's book swept every ten seconds, or the vendor's latest
     book with the room on the feed — the one snapshot every box reads */
  const scan = useRoomScan();

  /* THE OWN-NAME SNAPSHOTS — one per name a box has stepped onto, on the room's market (the feed's or the house's),
     rebuilt on the scan cadence like the frame's own */
  const pinnedKey = [scopes.calendar, scopes.tape, scopes.day, scopes.report].filter(Boolean).join('|');
  const ownSnaps = useMemo(() => {
    const m = new Map<string, MarketSnapshot>();
    if (!scan || !pinnedKey) return m;
    for (const t of new Set(pinnedKey.split('|'))) {
      if (t === scan.ticker) continue;
      const own = ownScan(t);
      if (own) m.set(t, own);
    }
    return m;
  }, [scan, pinnedKey]);

  /* The session on hand for the replay, and the book at the position — THE
     MINUTE GRID (2026-09-11): the calendar, the clock and the report read the
     book once per replayed minute; their surfaces are the page's heaviest. */
  const range = playing?.range ?? null;
  const framePos = playing && range ? snapPos(playing.pos, range.length) : 0;
  /* the boxes follow the track a beat behind (the audit's H7: a drag step took 110–190ms to paint) — the track and its
     moment stay on the pointer */
  const minutePos = useDeferredValue(Math.floor(framePos / 60) * 60);
  const replayBars = useMemo(() => (range ? barsAt(range, minutePos) : undefined), [range, minutePos]);
  /* ONE PRICE IN THE REPLAY TOO (2026-10-14): the minute's book carries the price it was figured at — the bar's open —
     while the tape's Last is that minute's close; the book is handed the close, so the spot row and the tape agree */
  const replaySnapMinute = useMemo(() => {
    if (!range || !scan) return null;
    const snap = snapshotAt(scan, range, minutePos);
    const close = replayBars?.[replayBars.length - 1]?.close;
    return snap && close != null && Number.isFinite(close) && close !== snap.spot ? { ...snap, spot: close } : snap;
  }, [range, scan, minutePos, replayBars]);
  useEffect(() => {
    if (!playing?.playing || !range) return;
    const id = window.setInterval(() => {
      setReplay(r => {
        if (!r || !r.playing) return r;
        const next = r.pos + r.pace * 0.25;
        return next >= range.length ? { ...r, pos: range.length, playing: false } : { ...r, pos: next };
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [playing?.playing, playing?.pace, range]);
  useEffect(() => {
    if (!replayOn) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) setReplay(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [replayOn]);
  /* A replay was recorded in one name's world — a new name ends it */
  useEffect(() => setReplay(null), [scan?.ticker]);
  /* THE SHELL HEAD SAYS IT TOO (the audit's M8, 2026-10-13): the moment replayed, as a tag beside the page's name */
  const replayWords = playing && range ? `${replayDay(range)} · ${replayLabel(framePos, range)}` : null;
  useEffect(() => {
    setReplayLabel(replayWords);
    return () => setReplayLabel(null);
  }, [replayWords]);
  /* outside the session the door replays the LAST session, and says so (the audit's L4) */
  const marketOpen = (() => {
    const c = readSessionClock();
    return c.phase === 'OPEN' || c.phase === 'AUCTION';
  })();
  /* Replay opens at the session's first bar, PLAYING (the paying-user audit's H7: it opened paused and looked dead) */
  const startReplay = () => {
    if (!scan) return;
    const r = replayRange(scan.ticker);
    if (!r) return;
    setReplay({ phase: 'play', range: r, pos: 0, playing: true, pace: 60 });
  };
  /** THE TRANSPORT (the paying-user audit's C3 and H7, 2026-10-13): a bar of its own across the top of the book — in the band
      it widened the band and the page under it jumped 34px, and its track was 180px for a whole session. Its clock is the
      session's own (the first bar's minute), the one the head's tag and the trader's clock read. */
  const replayTransport = replay ? (
    <ReplayStrip
      compact
      wide
      phase={replay.phase}
      pos={playing?.pos ?? 0}
      length={playing?.range.length ?? 0}
      day={playing ? replayDay(playing.range) : undefined}
      startMin={playing ? replayStart(playing.range) : undefined}
      playing={playing?.playing ?? false}
      onPlay={p => setReplay(r => (r ? { ...r, playing: p } : r))}
      pace={playing?.pace ?? 60}
      onPace={pace => setReplay(r => (r ? { ...r, pace } : r))}
      onSeek={pos => setReplay(r => (r ? { ...r, pos } : r))}
      onExit={() => setReplay(null)}
    />
  ) : undefined;
  /** The band's door: Replay, or — while one runs — the way back, pressed */
  const replayBar = (
    <button
      type="button"
      onClick={replay ? () => setReplay(null) : startReplay}
      aria-pressed={!!replay}
      title={replay ? 'Back to live (Esc)' : `Replay ${marketOpen ? "today's" : 'the last'} session from its first bar — every box on the page reads the book as it stood`}
      /* sentence case, the cards' grammar since 2026-10-10 (the audit's M3) */
      className={`hit inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border bg-chip font-mono text-[11px] transition-colors ${replay ? 'border-silver/50 text-silver' : 'border-borderSubtle hover:border-borderMuted text-textSecondary hover:text-textPrimary'}`}
      data-map-replay
    >
      <Play className="w-3 h-3" /> {replay ? 'Replaying' : 'Replay'}
    </button>
  );

  /* THE NAMES BESIDE THE CALENDAR'S REWIND WITH IT (2026-09-13): a column's
     book is its name's own session at the replayed minute — a name with no
     session on hand stays live */
  const columnSnap = useCallback(
    (t: string): MarketSnapshot => {
      /* the market the room reads (data/bookMarket.ts) — on the feed, the name's own book from the vendor; a name whose
         book has not come reads the house's, as the Names door always did */
      const live = bookMarket().snapshotFor(t) ?? Simulator.snapshotFor(t);
      if (!range) return live;
      const own = replayRange(t);
      return own ? snapshotAt(live, own, Math.min(minutePos, own.length)) : live;
    },
    [range, minutePos]
  );
  /** The snapshot a box reads: the frame's (rewound to the minute while replaying), or its own */
  const snapFor = (key: BoxKey): MarketSnapshot | null => {
    if (!scan) return null;
    const t = scopes[key];
    if (!t || t === scan.ticker) return replaySnapMinute ?? scan;
    return ownSnaps.get(t) ?? scan;
  };
  /* A BOX NOBODY SEES HOLDS STILL while the replay runs (2026-09-11): off
     screen, a box keeps the moment it last showed; scrolled into view, it
     catches up on its next render. What it reads arrives DEFERRED. */
  const [calRef, calOn] = useOnScreen<HTMLDivElement>();
  /* THE BOOK AT ITS NATURAL WIDTH WHEN THE DAY STANDS BESIDE IT (2026-10-13, the owner: "compact and tight grouped",
     then "i dont want any deadspace"): the field says how wide its panes are at their natural widths; where the day box
     fits beside that (640 or more), the book is that wide and the day takes the rest; where it does not, the book takes
     the whole row, its panes fill it, and the day goes under — 0 = unmeasured, or the profile */
  const [bookW, setBookW] = useState(0);
  /* THE BAND'S OWN STRIP (2026-10-13): the field draws its band here, above the book and the day, so the book box is only
     as wide as its panes; its height is taken off the book box's, so the two together keep the first screen's height */
  const [bandSlot, setBandSlot] = useState<HTMLDivElement | null>(null);
  const [bandSlotH, setBandSlotH] = useState(0);
  /* THE BAND IN THE HEAD WHERE THE HEAD HAS ITS ROOM (2026-10-13, "i dont want any deadspace"): the head's side (the facts,
     the room between, the Levels and Ruler cards) measured against the band's named row; in, with 12px to spare, and out
     only once it no longer fits, so a fact's width ticking by a figure never throws it back and forth */
  const [bandNeed, setBandNeed] = useState(0);
  const [headBand, setHeadBand] = useState<HTMLElement | null>(null);
  const [headRoom, setHeadRoom] = useState(0);
  useLayoutEffect(() => {
    const slot = document.getElementById('pinpoint-head-band');
    const side = slot?.closest('[data-shell-side]') as HTMLElement | null;
    if (!slot || !side) return;
    setHeadBand(slot);
    const read = () => {
      const facts = side.querySelector<HTMLElement>('[data-shell-facts]')?.offsetWidth ?? 0;
      const cards = side.querySelector<HTMLElement>('[data-shell-cards]')?.offsetWidth ?? 0;
      const room = Math.floor(side.clientWidth - facts - cards - 48);
      setHeadRoom(prev => (Math.abs(prev - room) < 2 ? prev : room));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(side);
    return () => ro.disconnect();
  }, []);
  const [bandUp, setBandUp] = useState(false);
  useEffect(() => {
    if (bandNeed <= 0 || headRoom <= 0) return;
    setBandUp(up => (up ? headRoom >= bandNeed : headRoom >= bandNeed + 12));
  }, [bandNeed, headRoom]);
  /* the top row's width, to know whether the day box stands beside the book (the same rule the row's wrap follows: the
     book at its width, 16px, and 640 for the day) — beside, it takes the book box's height exactly and its two charts
     share it; under the book it keeps its own */
  const [topRow, setTopRow] = useState<HTMLDivElement | null>(null);
  const [topRowW, setTopRowW] = useState(0);
  useLayoutEffect(() => {
    if (!topRow) return;
    const read = () => setTopRowW(prev => (prev === topRow.clientWidth ? prev : topRow.clientWidth));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(topRow);
    return () => ro.disconnect();
  }, [topRow]);
  useLayoutEffect(() => {
    if (!bandSlot) return;
    const read = () => setBandSlotH(prev => (prev === bandSlot.offsetHeight ? prev : bandSlot.offsetHeight));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(bandSlot);
    return () => ro.disconnect();
  }, [bandSlot]);
  const [tapeRef, tapeOn] = useOnScreen<HTMLDivElement>();
  const [dayRef, dayOn] = useOnScreen<HTMLDivElement>();
  const [reportRef, reportOn] = useOnScreen<HTMLDivElement>();
  const heldRef = useRef<{ calendar: MarketSnapshot | null; tape: MarketSnapshot | null; day: MarketSnapshot | null; report: MarketSnapshot | null; bars: Candle[] | undefined }>({ calendar: null, tape: null, day: null, report: null, bars: undefined });
  const shown = (key: BoxKey, on: boolean): MarketSnapshot | null => {
    const fresh = snapFor(key);
    if (!replayOn || on || !heldRef.current[key]) heldRef.current[key] = fresh;
    return heldRef.current[key];
  };
  const calSnap = useDeferredValue(shown('calendar', calOn));
  const tapeSnap = useDeferredValue(shown('tape', tapeOn));
  const daySnap = useDeferredValue(shown('day', dayOn));
  const reportSnap = useDeferredValue(shown('report', reportOn));
  /* the bars move while ANY box that reads them is on the screen — the tape and the day box read them too, and gated on
     the report alone the tape stood still through a replay on a laptop screen, where the report sits below the fold
     (2026-10-14) */
  if (!replayOn || reportOn || tapeOn || dayOn || !heldRef.current.bars) heldRef.current.bars = replayBars;
  const reportBars = useDeferredValue(heldRef.current.bars);
  /** The shared strike belongs to ONE name — a box on another name never draws it */
  const focusFor = (t: string) => (focus && focus.ticker === t ? focus.price : null);
  /** A box's chip: follows the frame, or holds its own name */
  const chipFor = (key: BoxKey, t: string) => (
    <ScopeChip
      ticker={t}
      linked={scopes[key] === undefined}
      quote
      onToggleLink={() => setScope(key, scopes[key] === undefined ? t : undefined)}
      onPick={next => (scopes[key] === undefined ? changeTicker(next) : setScope(key, next))}
    />
  );

  /* THE BOOK the positions read against — the frame's, at the replayed minute */
  const frameSnap = replaySnapMinute ?? scan;
  const data = useMemo(() => {
    if (!frameSnap) return null;
    try {
      return buildExposureProfile(frameSnap, POSITIONS_EXPIRY, WINDOW);
    } catch {
      return null;
    }
  }, [frameSnap]);

  const ticker = frameSnap?.ticker ?? activeTicker;
  const focusPrice = focusFor(ticker);
  const calTicker = calSnap?.ticker ?? ticker;
  const tapeTicker = tapeSnap?.ticker ?? ticker;
  const dayTicker = daySnap?.ticker ?? ticker;
  const reportTicker = reportSnap?.ticker ?? ticker;

  /* YOUR POSITIONS on this name (roadmap step 6): read against the 0DTE book,
     once per scan; the ledger's marks and the box read the same map */
  const positions = usePositions(ticker);
  const reads = useMemo(() => new Map(data ? positions.map(p => [p.id, readPosition(p, data)]) : []), [positions, data]);
  const marks = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of positions) {
      const s = reads.get(p.id)?.sentence ?? '';
      m.set(p.strike, m.has(p.strike) ? `${m.get(p.strike)}\n${s}` : s);
    }
    return m;
  }, [positions, reads]);

  /* The page stands in as its own four boxes while the first read walks in
     (Noah, 2026-09-08: a stock skeleton "doesn't take the shape of its
     container") — the same shapes the route's fallback and the deferred
     mounts use, so nothing on the page moves when the book lands. */
  if (!scan || !data) return <MapPageSkeleton />;

  const keepTyped = (raw: string) => {
    const want = Number.parseFloat(raw.replace(/[^0-9.]/g, ''));
    setStrikeAsk(false);
    if (!Number.isFinite(want) || !scan.chain.length) return;
    let best = scan.chain[0].strike;
    for (const n of scan.chain) if (Math.abs(n.strike - want) < Math.abs(best - want)) best = n.strike;
    focusOn(best, ticker);
  };

  const bookH = `calc(clamp(640px, 100dvh - 190px, 1000px) - ${bandSlotH > 0 ? bandSlotH + 8 : 0}px)`;
  const dayBeside = bookW > 0 && topRowW > 0 && topRowW - Math.min(topRowW, bookW) - 16 >= 640;

  return (
    <>
      {strikeAsk && (
        <div className="fixed inset-x-0 top-16 z-[95] flex justify-center pointer-events-none" data-strike-ask>
          <form
            className="pointer-events-auto flex items-center gap-3 rounded-md border border-silver/40 bg-card/95 backdrop-blur-md px-3 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.55)] animate-soft-in"
            onSubmit={e => {
              e.preventDefault();
              keepTyped(strikeInput.current?.value ?? '');
            }}
          >
            <label htmlFor="strike-ask" className="text-[11px] text-textMuted">
              Keep a strike
            </label>
            <input
              id="strike-ask"
              ref={strikeInput}
              autoFocus
              inputMode="decimal"
              placeholder={scan.spot.toFixed(0)}
              className="w-20 bg-transparent font-mono text-[12px] tnum text-textPrimary outline-none border-b border-borderMuted focus:border-silver placeholder:text-textMuted/60"
              onKeyDown={e => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setStrikeAsk(false);
                }
              }}
              onBlur={() => setStrikeAsk(false)}
            />
            <span className="text-[11px] text-textMuted">Enter keeps it · Esc</span>
          </form>
        </div>
      )}
      {/* JUMP LINKS ON A PHONE (idea 7, 2026-10-13): the page is 3,000px tall there; a sticky row under the phone strip
          lands on any box in one tap */}
      <nav className="sm:hidden sticky top-9 z-20 -mx-4 px-4 py-1.5 flex gap-2 overflow-x-auto scroll-row border-b border-borderSubtle/60 bg-panel/95 backdrop-blur-sm" aria-label="Jump to a box" data-map-jumps>
        {(
          [
            ['map-book', 'Book'],
            ['map-session', 'The day'],
            ['map-clock', 'Clock'],
            ['map-report', 'Report'],
          ] as const
        ).map(([id, word]) => (
          <button
            key={id}
            type="button"
            onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="hit shrink-0 h-7 px-2.5 rounded-md border border-borderSubtle bg-chip font-mono text-[11px] text-textSecondary hover:text-textPrimary hover:border-borderMuted transition-colors"
            data-map-jump={id}
          >
            {word}
          </button>
        ))}
      </nav>
      {/* THE CALENDAR, FIRST — the same book by expiry, the Exposure Ledger with
          its one-row toolbar (greek · expiries · strikes · palette · Now | After
          the bell · the read · fullscreen) and the replay's transport. The host
          names the book, so the ledger's head carries no name or search. The
          strike a capsule pins is the same shared strike every box lights. */}
      {/* 870px = the whole default window (±20 strikes at the ledger's 18px
          floor) with the toolbar and the read line, no scrolling — the lock
          walk's first fix (Noah, 2026-09-09: "the heatmap length is a bit
          short so make it taller"; at 600 only 25 of the 40 rows showed) */}
      {/* …AND NEVER PAST THE FOLD (the audit's M9, 2026-10-13): on a 900px screen the fixed box ran 62px under the fold
          and the matrix inside it scrolled in a box that was itself cut — two scroll regions nested. The box is the
          first screen's (the shell's chrome above it is ~174px, 16 of air under), never under 640 — and 1000 at most
          since 2026-10-13 (the owner's tall screen: forty rows of the matrix at 20px need ~900 to stand unscrolled). */}
      {/* THE BOOK AND THE DAY SIDE BY SIDE WHERE THEY FIT (2026-10-13, the dead-space scan: three packed matrix panes on a
          3,000px screen left 1,300px of the box empty): the book box at its natural width, the day box taking the rest
          from 640px up and stretched to the book's height, its two charts sharing the extra; where the day box would
          be under 640 it wraps under the book at the page's full width, as before. */}
      <div id="map-book" className="flex flex-col gap-2 max-sm:scroll-mt-24 sm:scroll-mt-12" data-map-book-wrap>
      <div ref={setBandSlot} className="empty:hidden border border-borderSubtle rounded-md bg-panel overflow-hidden [&>[data-ledger-toolbar]]:border-b-0" data-map-band-slot />
      <div ref={setTopRow} className="flex flex-wrap items-stretch gap-4" data-map-top-row data-day-beside={dayBeside || undefined} data-band-need={bandNeed || undefined} data-head-room={headRoom || undefined} data-band-up={bandUp || undefined}>
      <div ref={calRef} className="shrink-0 grow-0 max-w-full border border-borderSubtle rounded-md overflow-hidden flex flex-col" style={{ width: dayBeside ? bookW : '100%', height: bookH }} data-book-w={bookW || undefined} data-calendar data-scope-ticker={calTicker} data-on-screen={calOn}>
        <Deferred index={0} frames={0} fallback={<CalendarInner />} className="h-full min-h-0 flex flex-col animate-fade-in">
          <ExposureField
            snapshot={calSnap ?? scan}
            toolbar="band"
            lead={chipFor('calendar', calTicker)}
            greeks={greekPick}
            onGreeks={setGreekPick}
            fullMode="move"
            fresh={replayOn && calTicker === ticker}
            after={calTicker === ticker ? replayBar : undefined}
            above={calTicker === ticker ? replayTransport : undefined}
            selectedStrike={focusFor(calTicker)}
            marks={calTicker === ticker ? marks : undefined}
            onSelectStrike={price => toggleFocus(price, calTicker)}
            /* NAMES SIDE BY SIDE (2026-09-12): up to four books on the one band; a
               kept strike belongs to its own name */
            multi
            selectedStrikeFor={focusFor}
            onSelectStrikeFor={(t, price) => toggleFocus(price, t)}
            snapshotFor={columnSnap}
            onNaturalWidth={setBookW}
            headSlot={bandUp && headBand ? headBand : bandSlot}
            onBandNeed={setBandNeed}
            pack={dayBeside}
          />
        </Deferred>
      </div>
      {/* THE TAPE (the competitive audit, 2026-10-13): today's price with the book's levels on it, a bell on each level,
          the expected move to the close — the chart practitioners open first, on this page rather than Terrain alone;
          foldable, remembered. The replay rewinds it with the report's bars. */}
      {/* …AND THE BOOK THROUGH THE DAY UNDER IT ON THE SAME CLOCK (idea 1, 2026-10-13): one box, the tape over the net
          gamma, the minute under the pointer marked on both — DayBox.tsx */}
      <div ref={tapeRef} id="map-session" className="flex-[1_1_640px] min-w-0 flex flex-col border border-borderSubtle rounded-md bg-panel max-sm:scroll-mt-24 sm:scroll-mt-12" style={dayBeside ? { height: bookH } : undefined} data-session data-scope-ticker={tapeTicker} data-on-screen={tapeOn}>
        <DayBox scope={chipFor('tape', tapeTicker)}>
          <TapeBox part snapshot={tapeSnap ?? scan} bars={playing && tapeTicker === ticker ? reportBars : undefined} focus={focusFor(tapeTicker)} onPick={price => toggleFocus(price, tapeTicker)} at={playing && tapeTicker === ticker ? replayMinute(framePos, range) : undefined} />
          <BookThroughDay part snapshot={tapeSnap ?? scan} bars={playing && tapeTicker === ticker ? reportBars : undefined} at={playing && tapeTicker === ticker ? replayMinute(framePos, range) : undefined} />
        </DayBox>
      </div>
      </div>
      </div>
      {/* THE DAY — the two tools nobody ships (roadmap step 5, 2026-09-05):
          the Trader's Clock, today's hedging schedule with the book's figures
          in it, and the Wall Report Card, every level's record on today's
          tape. One box, two columns, the same strike shared. */}
      {/* No overflow clip here: the clock's hover card rises above the strip and a
          long phase sentence would be cut at the box's top edge */}
      {/* THE CLOCK BESIDE THE REPORT from 1,880px (idea 4, 2026-10-13): both ran the full width for a 178px strip and
          370px of rows; side by side a big monitor's page is a screen shorter. `contents` below that, so the flex column
          above still lays them out one under the other. */}
      <div className="contents min-[1880px]:grid min-[1880px]:grid-cols-[580px_minmax(0,1fr)] min-[1880px]:gap-4 min-[1880px]:items-stretch" data-map-wide-row>
      <div ref={dayRef} id="map-clock" className="flex flex-col border border-borderSubtle rounded-md bg-panel max-sm:scroll-mt-24 sm:scroll-mt-12" data-day data-scope-ticker={dayTicker} data-on-screen={dayOn}>
        <Deferred index={1} frames={22} fallback={<DayInner />} className="flex-1 flex flex-col animate-fade-in">
          <TraderClock snapshot={daySnap ?? scan} scope={chipFor('day', dayTicker)} at={playing && dayTicker === ticker ? replayMinute(framePos, range) : undefined} />
        </Deferred>
      </div>
      {/* HOW THE LEVELS HELD TODAY — full width, in the approved grammar: the
          page grows rather than cramming (Noah, 2026-09-05) */}
      <div ref={reportRef} id="map-report" className="border border-borderSubtle rounded-md overflow-hidden bg-panel max-sm:scroll-mt-24 sm:scroll-mt-12" data-report data-scope-ticker={reportTicker} data-on-screen={reportOn}>
        <Deferred index={2} frames={26} fallback={<ReportInner />} className="animate-fade-in">
          <WallReportCard snapshot={reportSnap ?? scan} focus={focusFor(reportTicker)} onPick={price => toggleFocus(price, reportTicker)} scope={chipFor('report', reportTicker)} bars={playing && reportTicker === ticker ? reportBars : undefined} />
        </Deferred>
      </div>
      </div>
      {/* YOUR POSITIONS left this page for the Weigher's desk (Noah, 2026-09-14: "this is a
          feature a weigher section should have and not a pinpoint map section") — the map keeps
          the marks the positions leave on its ladder (`marks` above) */}
    </>
  );
};

export default MapDesk;
