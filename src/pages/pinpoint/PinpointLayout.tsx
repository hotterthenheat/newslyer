import { useRef, Suspense, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { PinpointPageSkeleton } from './pinpointSkeletons';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, Layers, Ruler, X } from 'lucide-react';
import { useMarketData } from '../../context/MarketDataContext';
import { useFocus } from '../../context/FocusContext';
import Simulator from '../../core/simulator';
import DropdownSelect, { type DropdownOption } from '../../components/ui/DropdownSelect';
import ScrollHome from '../../components/layout/ScrollHome';
import { REGIME_WORDS, type GammaRegime } from '../../data/flipGauge';
import { fmtDistance, impliedDaySigma, sessionAtr, type DistanceScales, type DistanceUnit } from '../../data/atr';
import { setDistanceUnit, useDistanceUnit } from '../../data/distanceUnits';
import { readSessionClock } from '../../data/moc';
import { ABSORB, AMPLIFY, CALL_WALL, FLIP, PUT_WALL, SUPREME } from '../../components/gex/paletteInk';
import { GEX_SUBPAGES } from './subnav';
import { useReplayLabel } from './replayState';
import { useRoomScan, useRoomSpot } from './useRoomScan';
import { roomLevels } from '../../data/roomLevels';
import { levelTicks } from '../../data/levelRecord';
import { sessionBars } from '../../data/levelview';
import { usePinpointSource } from '../../data/feed/levels';
import { LEVELS_OPTIONS, LEVELS_TITLE, setLevelsScope, useLevelsScope } from '../../data/levelsScope';
/* registers the feed's market with the seam (data/bookMarket.ts) — Unusual Whales' answers under every box of the room
   while its key answers (data/feed/pinpointMarket.ts) */
import '../../data/feed/pinpointMarket';

/*
==================================================
  SLAYER TERMINAL - PINPOINT SHELL (PinpointLayout)

  Band 1 of the roadmap (2026-09-05, the blank
  canvas): ONE HEAD of chrome, and nothing under it
  but the page. Where am I — the page's name and its
  one line — then what the market is doing, read
  the way every box on Pinpoint reads its facts:
  a label over a value.

  THE LOCK WALK (Noah, 2026-09-09: "this header has
  really been bothering me the entire time for the
  whole pinpoint page. doesnt even look like a header
  and the info in it makes me go '???'"): the row of
  loose words — "SHORT GAMMA · flip 494.50 · $1.25
  overhead · crossed 32× · 2h 19m to the close ·
  $ % ATR σ" — became the house head. The page's
  icon and name over its line on the left; on the
  right the same facts LABELLED so each says what it
  is (Dealers · amplifying moves; Flip · 494.50,
  $1.25 above spot; Flip crossed today · 32 times;
  To the close · 2h 19m), and the ruler as a labelled
  card like every other control on Pinpoint. The
  focus chip stays on the title row.

  THE CLOCK IS THE REAL ONE — New York time, the
  same clock the top bar shows — because "to the
  close" is a promise about the exchange, not about
  the simulator's replayed day.
==================================================
*/

const fmtStrike = (v: number) => (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2));
const fmt = (v: number) => (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2));

/** "2h 14m" from seconds — the close is a promise in minutes, not seconds */
const untilBell = (secondsToClose: number) => {
  const h = Math.floor(secondsToClose / 3600);
  const m = Math.floor((secondsToClose % 3600) / 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
};

/** Which way dealers are hedging, in words — the same pair the Map's sentence uses */
const DEALER_WORDS = { SHORT: 'amplify', LONG: 'absorb' } as const;

/** The desk's ruler: the unit every distance on Pinpoint is read in */
const RULER_OPTIONS: DropdownOption<DistanceUnit>[] = [
  { value: '$', label: '$', hint: 'Dollars from spot' },
  { value: '%', label: '%', hint: 'Percent of spot' },
  { value: 'ATR', label: 'ATR', hint: 'Average true ranges — the same distance on SPY and on NVDA' },
  { value: 'σ', label: 'σ', hint: 'Expected one-day moves — how many the options price in' },
];

/* ONE LINE, THE TERMINAL'S (the owner, 2026-10-14, of five stat cards with sentences in them: "this is AI slop"): a fact
   is its name in tracked capitals at the 11px floor and its figure beside it, the facts on one mono line with hairlines
   between — the stuck strip's grammar, the chart strip's. The price, the figure every terminal shows large, at 18px. */
const Fact = ({ label, children, title, testId, hero = false, word = false }: { label: string; children: React.ReactNode; title?: string; testId?: string; hero?: boolean; /** a word for a figure (absorb, untested) — small capitals, not a number's face */ word?: boolean }) => (
  <span className="inline-flex items-baseline gap-2 whitespace-nowrap font-mono sm:pr-2.5 2xl:pr-4 sm:[&:not(:first-child)]:border-l sm:[&:not(:first-child)]:border-borderSubtle sm:[&:not(:first-child)]:pl-2.5 2xl:[&:not(:first-child)]:pl-4" data-shell-fact={testId} title={title}>
    <span className="text-[11px] uppercase tracking-wider text-textMuted">{label}</span>
    <span className={`tnum text-textPrimary ${hero ? 'text-[18px] font-semibold leading-none' : word ? 'text-[11px] font-semibold uppercase tracking-wider' : 'text-[13px] font-semibold'}`}>{children}</span>
  </span>
);

const PinpointLayout = () => {
  const { activeTicker, marketData, flowTape } = useMarketData();
  /* THE UI IS THE OWNER'S; THE FEED FILLS IT (2026-10-12, the 3abida line; restored 2026-10-13): with the room on the feed
     every engine under this frame reads Unusual Whales' answers (data/bookMarket.ts) — the same pages, the same boxes, the
     vendor's figures. While the shell's first probe is out the page stands as its own skeleton, so the house's book never
     flashes before the vendor's. The head's facts read the room's scan, the one snapshot every page reads. */
  const roomSrc = usePinpointSource();
  const scan = useRoomScan();
  /* WHICH CONTRACTS THE LEVELS ARE READ OFF (data/levelsScope.ts): today's alone, or every listed date */
  const levelsScope = useLevelsScope();
  const { focus, clearFocus } = useFocus();
  /* Alerts are watched by the app shell on every page now (components/alerts/AlertWatcher.tsx, 2026-09-10) */
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();

  /* THE SHARED STRIKE, worn by the shell: one chip every tab shares — the
     strike, its distance from spot, the door to the chart, and the one place
     to let it go. It belongs to the name the desk is on. */
  const focused = focus && focus.ticker === activeTicker ? focus.price : null;
  /* THE ONE PRICE ON THE PAGE (pages/pinpoint/useRoomScan.ts useRoomSpot, 2026-10-14): the tick on the house, the
     vendor's spot on the feed — the figure the matrix's spot row and the tape's Last print too, never three readings */
  const spot = useRoomSpot(activeTicker) ?? (roomSrc === 'feed' ? scan?.spot : marketData?.spot) ?? null;
  const change = (roomSrc === 'feed' ? scan?.changePercent : marketData?.changePercent) ?? null;
  const dist = focused != null && spot ? ((focused - spot) / spot) * 100 : null;

  /* THE LEVELS THE PAGE SHOWS (data/roomLevels.ts — the Levels card's scope): the flip here is the line the tape draws
     and the row the report tests, never a second reading off the whole chain; the walls ride the stuck strip (the
     paying-user audit's H4, 2026-10-13) */
  const walls = useMemo(() => (scan ? roomLevels(scan, levelsScope) : null), [scan, levelsScope]);
  const flip = walls && Number.isFinite(walls.flip) ? walls.flip : null;
  /* WHICH SIDE OF THE FLIP the market is on and how far the flip is, in the desk's own ruler — off the price now, so the
     words turn the moment price does. Null until the scan has come; a flip of null is a one-sided book. */
  const gauge = useMemo(
    () =>
      spot == null || !walls
        ? null
        : { spot, flip, regime: flip == null ? null : ((spot >= flip ? 'LONG' : 'SHORT') as GammaRegime), distAbs: flip == null ? null : flip - spot, distPct: flip == null || spot === 0 ? null : ((flip - spot) / spot) * 100 },
    [spot, walls, flip]
  );
  /* HOW THE FLIP HELD TODAY, BY THE REPORT'S OWN RULE (the owner, 2026-10-14 — one count on the page): the head said
     "crossed 23 times", price against each minute's own flip (data/flipGauge.ts), while the report under it said
     "broke 8 of 24", today's flip tested across the session (data/levelRecord.ts levelTicks); in plain words those are
     one claim, so this is the report's — the same bars, the same level, the same side. */
  const flipRead = useMemo(() => {
    if (!scan || !walls || flip == null) return null;
    const ticks = levelTicks(sessionBars(scan.ticker) ?? [], flip, flip >= walls.spot ? 'call' : 'put');
    const broke = ticks.filter(t => t.kind === 'broke').length;
    return { tests: ticks.length, broke, held: ticks.length - broke };
  }, [scan, walls, flip]);
  const flipHeld = flipRead ? (flipRead.tests === 0 ? 'untested' : flipRead.broke === 0 ? `held ${flipRead.tests === 1 ? 'its one test' : `all ${flipRead.tests} tests`}` : `broke ${flipRead.broke} of ${flipRead.tests}`) : null;
  const unit = useDistanceUnit();
  const scales = useMemo<DistanceScales>(() => {
    if (!marketData) return { atr: null, sigma: null };
    return {
      atr: sessionAtr(Simulator.getCandles(marketData.ticker) ?? []),
      sigma: impliedDaySigma(marketData.spot, Simulator.TICKERS[marketData.ticker]?.iv ?? 0),
    };
  }, [marketData]);
  /* THE KEPT STRIKE'S DISTANCE IN THE RULER'S UNIT (the re-audit's M3): the Ruler promises every distance on Pinpoint, and
     the chip beside the title read percent whatever it said */
  const keptLead = dist != null && focused != null && spot ? (unit === '%' ? `${dist > 0 ? '+' : ''}${dist.toFixed(2)}%` : fmtDistance(focused - spot, spot, unit, scales)) : null;
  const words = gauge?.regime ? REGIME_WORDS[gauge.regime] : null;
  const flipDist = gauge && gauge.distAbs !== null ? Math.abs(gauge.distAbs) : null;
  const flipLead =
    gauge && flipDist !== null ? (unit === '%' ? `${Math.abs(gauge.distPct!).toFixed(2)}%` : fmtDistance(flipDist, gauge.spot, unit, scales).replace(/^[+−]/, '')) : '';
  /* "0.00% below spot" is a flip at spot, and says so (the paying-user audit's L3) */
  const flipAtSpot = flipDist !== null && gauge != null && flipDist < gauge.spot * 0.00005;
  /* Which page this is — its name, its icon and one line, from the registry the sidebar reads */
  const page = GEX_SUBPAGES.find(p => location.pathname.startsWith(p.path)) ?? GEX_SUBPAGES[0];

  /* THE CLOCK TO THE CLOSE — New York time, re-read every 15s */
  const [clock, setClock] = useState(() => readSessionClock());
  useEffect(() => {
    const id = window.setInterval(() => setClock(readSessionClock()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  const open = clock.phase === 'OPEN' || clock.phase === 'AUCTION';
  /* THE REPLAY, SAID HERE TOO (the audit's M8, 2026-10-13): the boxes below are rewound, these facts are not */
  const replaying = useReplayLabel();
  /* whether the head has scrolled away — the strip below shows then (idea 3) */
  const headRef = useRef<HTMLElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = headRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), { rootMargin: '-48px 0px 0px 0px', threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* THE HEAD. The page on the left, the facts and the ruler on the right;
          `flex-wrap` so a narrow window stacks the two instead of pushing the
          ruler off the edge — at desk width it is one band. */}
      {/* THE FRAME OWNS THE SUBJECT AND THE PAGES (direction B, 2026-09-05): the
          sidebar carries the ticker and the Map · Ahead · … choice, so this head
          no longer repeats them. It names the page and reads the market. */}
      <header ref={headRef} className="flex items-center gap-x-3 2xl:gap-x-5 gap-y-2 flex-wrap pb-2.5 border-b border-borderSubtle" data-shell>
        {/* THE PAGE'S NAME, AND NOTHING ELSE AROUND IT (the owner, 2026-10-14): the icon in a box and the one-liner under the
            name were the generic page head — the name alone, the line in its title; a kept strike and a replay stand beside it
            as flat marks */}
        <div className="flex-none max-w-full h-7 flex items-center gap-2.5 flex-wrap" data-shell-title data-shell-page>
          <h1 className="text-[18px] font-semibold leading-none text-textPrimary" title={page.subtitle}>
            {page.label}
          </h1>
          {focused != null && (
            <span data-focus-chip className="inline-flex items-center gap-1.5 2xl:gap-2 h-7 rounded px-1.5 2xl:px-2 font-mono text-[11px] uppercase tracking-wider bg-silver/[0.1] text-silver">
              <span className="font-bold">Kept</span>
              <span className="text-[12px] font-semibold tnum text-textPrimary">{fmtStrike(focused)}</span>
              {dist != null && keptLead && (
                <span className="hidden 2xl:inline tnum text-textSecondary normal-case" data-kept-lead={unit}>
                  {keptLead}
                </span>
              )}
              <button
                /* the chart is Terrain (2026-09-30: Pulse's chart tile has no fullscreen of its own any more); the way back
                   brings the reader here again (Noah, 2026-09-09) */
                onClick={() => navigate('/terrain', { state: { chart: { ticker: activeTicker, focus: focused }, wayBack: location.pathname } })}
                title="See this strike on the chart"
                className="hit inline-flex items-center gap-1 rounded px-1 text-textSecondary hover:text-textPrimary hover:bg-ink/[0.06] transition-colors"
              >
                <span className="hidden 2xl:inline">Chart</span> <ArrowUpRight className="w-3 h-3" />
              </button>
              <button onClick={clearFocus} aria-label="Let go of the strike" className="hit p-0.5 rounded text-textMuted hover:text-textPrimary hover:bg-ink/[0.06] transition-colors">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {replaying && (
            <span data-replay-tag className="inline-flex items-center gap-1.5 h-7 rounded px-2 font-mono text-[11px] uppercase tracking-wider bg-silver/[0.12] text-silver" title="The boxes below are rewound to this minute; the facts on the right are live">
              <span className="font-bold">Replaying</span>
              <span className="tnum text-textPrimary normal-case">{replaying}</span>
            </span>
          )}
        </div>

        {/* THE FACTS ON ONE LINE, the cards at the end of it (flat doors, ui/flatDoor.ts); the Map's band takes the room
            between when its words fit */}
        {/* on a phone the facts take the next line whole, under the name */}
        <div className="flex-[3_1_0%] min-w-0 max-sm:basis-full flex items-center gap-x-4 gap-y-2 flex-wrap" data-shell-side>
          {gauge && (
            <div className={`flex items-center flex-wrap gap-x-4 sm:gap-x-0 gap-y-1 ${replaying ? 'opacity-70' : ''}`} data-shell-facts data-shell-facts-live={replaying ? '' : undefined} title={replaying ? 'Live — the replay rewinds the boxes, not these facts' : undefined}>
              {spot != null && (
                <Fact label={activeTicker} testId="price" hero>
                  {spot.toFixed(2)}
                  {change != null && (
                    <span className={`ml-2 text-[12px] font-medium ${change > 0 ? 'text-bull' : change < 0 ? 'text-bear' : 'text-textMuted'}`} data-shell-change>
                      {change > 0 ? '+' : ''}
                      {change.toFixed(2)}%
                    </span>
                  )}
                </Fact>
              )}
              {/* the facts are live while the boxes are rewound (the audit's M8) — said in one word, the replay's silver */}
              {replaying && (
                <span className="font-mono text-[11px] uppercase tracking-wider text-silver sm:pr-4 sm:border-l sm:border-borderSubtle sm:pl-4" data-shell-fact="live">
                  live
                </span>
              )}
              {words && gauge.regime ? (
                <>
                  <Fact label="Flip" testId="flip" title="The gamma flip — above it dealer hedging absorbs moves, below it amplifies them">
                    <span style={{ color: FLIP }}>{fmt(gauge.flip!)}</span>
                    {/* the distance in the quiet ink, not red or green: those are the walls' and direction's (2026-10-14) */}
                    {flipLead && <span className="ml-2 text-[11px] font-normal text-textMuted">{flipAtSpot ? 'at spot' : `${flipLead} ${gauge.distAbs! > 0 ? 'above' : 'below'}`}</span>}
                  </Fact>
                  <Fact label="Dealers" title={words.blurb} testId="dealers" word>
                    {/* the capsules' own pair — ember amplifies, glacier absorbs (paletteInk AMPLIFY/ABSORB) */}
                    <span style={{ color: gauge.regime === 'SHORT' ? AMPLIFY : ABSORB }}>{DEALER_WORDS[gauge.regime]}</span>
                  </Fact>
                  {flipRead && flipHeld && (
                    <Fact label="Flip today" testId="crossed" word={flipRead.tests === 0} title={flipRead.tests === 0 ? 'No bar has reached the flip yet today' : `${flipRead.tests} ${flipRead.tests === 1 ? 'bar' : 'bars'} reached the flip today; price closed through it ${flipRead.broke === 0 ? 'never' : `${flipRead.broke} ${flipRead.broke === 1 ? 'time' : 'times'}`} — the report's own count`}>
                      {flipRead.tests === 0 ? <span className="text-textMuted">{flipHeld}</span> : flipHeld}
                    </Fact>
                  )}
                </>
              ) : (
                <Fact label="Flip" testId="flip" word>
                  <span className="text-textMuted">none</span>
                </Fact>
              )}
              <Fact label={open ? 'Close' : 'Market'} title={clock.label} testId="close" word={!open}>
                {open ? untilBell(clock.secondsToClose) : clock.label.toLowerCase()}
              </Fact>
            </div>
          )}
          {/* THE MAP'S BAND, WHEN THE ROW HAS ITS ROOM (2026-10-13, "i dont want any deadspace"): on a wide screen the head
              left ~1,400px empty between the facts and the cards, and the band's own strip the same between its picks and
              its doors; the Map draws its band here when its words fit, and in its own strip under the head when not */}
          <div id="pinpoint-head-band" className="empty:hidden min-w-0 flex-1 [&>[data-ledger-toolbar]]:border-0 [&>[data-ledger-toolbar]]:bg-transparent [&>[data-ledger-toolbar]]:p-0" data-shell-band />
          <div className="ml-auto flex items-center gap-1" data-shell-cards>
            <DropdownSelect label="Levels" icon={Layers} flat labelFrom="2xl" value={levelsScope} options={LEVELS_OPTIONS} onChange={setLevelsScope} title={LEVELS_TITLE} testId="levels-scope" align="end" />
            <DropdownSelect label="Ruler" icon={Ruler} flat labelFrom="2xl" value={unit} options={RULER_OPTIONS} onChange={setDistanceUnit} title="The unit every distance on Pinpoint is read in" testId="ruler" align="end" />
          </div>
        </div>
      </header>
      {/* THE FACTS, STUCK (idea 3, 2026-10-13): once the head has scrolled away, the name, the price, the regime, the flip
          and the clock stay in a 36px strip at the top of the page column. A sticky box of no height, the strip laid
          over the page from it — nothing below moves when it comes or goes. Under the phone strip on a phone. */}
      {/* top-0 on a phone too: the column's own top padding (the phone strip's 48px) insets the sticky edge already */}
      {/* -mt-4: a box of no height is still a child of the column, and the column's 16px gap fell on both sides of it —
          32px between the head and the page (the paying-user audit's M1). Not on a phone: the jump links stick there,
          and two stuck rows ate a fifth of the screen (M7). Opaque: the capsules showed through the 95% ground. */}
      <div className="hidden sm:block sticky top-0 z-30 h-0 -mt-4" data-shell-stuck={stuck ? '' : undefined}>
        <div
          className={`absolute inset-x-0 top-0 h-9 flex items-center gap-x-5 overflow-hidden whitespace-nowrap border-b border-borderSubtle bg-panel px-3 font-mono text-[11px] transition-opacity duration-200 ${stuck ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          aria-hidden={!stuck}
          data-shell-strip
        >
          <span className="font-semibold text-textPrimary">{activeTicker}</span>
          {spot != null && <span className="tnum text-textPrimary">{spot.toFixed(2)}</span>}
          {gauge?.regime && <span style={{ color: gauge.regime === 'SHORT' ? AMPLIFY : ABSORB }}>dealers {DEALER_WORDS[gauge.regime]}</span>}
          {gauge?.flip != null && (
            <span className="text-textSecondary">
              flip <span className="font-semibold tnum" style={{ color: FLIP }}>{fmt(gauge.flip)}</span>
              {flipLead && (flipAtSpot ? ' · at spot' : ` · ${flipLead} ${gauge.distAbs! > 0 ? 'above' : 'below'} spot`)}
              {flipRead && flipRead.tests > 0 && ` · ${flipHeld}`}
            </span>
          )}
          {walls && (
            <span className="text-textSecondary" data-strip-walls>
              put wall <span className="font-semibold tnum" style={{ color: PUT_WALL }}>{fmtStrike(walls.putWall)}</span>
              {' · '}call wall <span className="font-semibold tnum" style={{ color: CALL_WALL }}>{fmtStrike(walls.callWall)}</span>
              {Number.isFinite(walls.supreme) && walls.supreme > 0 && (
                <>
                  {' · '}supreme <span className="font-semibold tnum" style={{ color: SUPREME }}>{fmtStrike(walls.supreme)}</span>
                </>
              )}
            </span>
          )}
          <span className="text-textSecondary">{open ? `${untilBell(clock.secondsToClose)} to the close` : clock.label.toLowerCase()}</span>
          {focused != null && (
            <span className="text-silver">
              kept {fmtStrike(focused)}
              {keptLead ? ` · ${keptLead}` : ''}
            </span>
          )}
          {replaying && <span className="text-silver">replaying {replaying}</span>}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          /* THE DESK OWNS ITS FIRST SCREEN: top bar 56 + the shell's padding
             and its head ≈ 164. Short pages stretch to a full first screen;
             the footer starts below the fold. */
          className="flex flex-col gap-4 flex-grow min-h-[calc(100vh-174px)]"
        >
          {/* A subpage opens at its head, not where the last one's scroll was (2026-09-11) */}
          <ScrollHome />
          {/* A page's code travels on its first visit; it stands in as ITS OWN
              shape under a shell head that stays put (pinpointSkeletons.tsx) */}
          <Suspense fallback={<PinpointPageSkeleton pathname={location.pathname} />}>{roomSrc === 'pending' ? <PinpointPageSkeleton pathname={location.pathname} /> : outlet}</Suspense>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default PinpointLayout;
