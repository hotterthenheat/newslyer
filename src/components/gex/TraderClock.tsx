/*
==================================================
  SLAYER TERMINAL - THE TRADER'S CLOCK
  (components/gex/TraderClock.tsx)

  Dealer hedging has a SCHEDULE, and no dealer
  positioning product shows it as one (the Pinpoint
  roadmap, 2026-09-05). This is today's session,
  09:30 to 16:00 New York, cut into the phases
  hedging actually lives by, with today's own
  figures written into each: which strike price
  sticks to at lunch, where charm bites into the
  close, how much of today's gamma expires at 4:00.

  REDONE 2026-09-05 in the approved grammar, on the
  Tremor Tracker's shape: the session as a strip of
  78 five-minute blocks, each block's shade the
  phase's weight, the block you are in lit in the
  live ink, the blocks still to come a shade
  quieter. The phases are named above the strip,
  the hours run under it.

  HOW IT ANSWERS THE POINTER (Noah, same day):
    hover a block     — its card opens: the minute,
                        the phase, the phase's
                        sentence for today, and one
                        meaningful ink (absorbs or
                        amplifies moves)
    click a block     — the card and the sentence
                        STAY on that block
    click a name      — the words above the strip
                        keep the whole phase, its
                        blocks ringed in silver
    click anywhere    — outside the strip, and it
                        all lets go
  The phase you are in wears the where-you-are
  silver: its name, and its blocks a touch brighter.

  THE PHASES ARE A RULE OF THUMB, stated as one.
  THE FIGURES ARE TODAY'S: the gamma pin from the
  0DTE profile, the largest-charm strike and the
  levels charm moves from the vanna/charm engine,
  the 4:00 share from the surface (the same number
  the Calendar's read line prints). Nothing here is
  a forecast of price — it is a timetable of the
  forces that act on it.

  NOW is the real clock (readSessionClock, New York
  time), the same clock the shell's "to the bell"
  reads. Outside the session the strip shows the
  whole day and says which phase the next open
  starts with.
==================================================
*/

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import FoldDoor from './FoldDoor';
import { useBoxFold } from '../../data/boxFold';
import { buildExposureSurface, CALENDAR_DTES } from '../../data/exposureSurface';
import { buildExposureProfile } from '../../data/exposure';
import { buildVannaCharm } from '../../data/vannacharm';
import { readSessionClock } from '../../data/moc';
import GuideFocus, { GuideDoor } from '../ui/GuideFocus';
import ClockGuide from './ClockGuide';
import type { MarketSnapshot } from '../../types/market';
import { EMBER, GLACIER, alpha } from './paletteInk';

const LIVE = 'rgb(var(--select))';
const SUPREME = 'rgb(var(--supreme))';
const SILVER = 'rgb(var(--silver))'; /* the silver token — deep steel on the light terminal (2026-09-12) */
const OPEN_MIN = 9 * 60 + 30;
const CLOSE_MIN = 16 * 60;
const SPAN = CLOSE_MIN - OPEN_MIN; // 390 trading minutes
const BLOCK_MIN = 5;
const BLOCKS = SPAN / BLOCK_MIN; // 78
const fmtStrike = (v: number) => (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2));
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const pct = (min: number) => ((min - OPEN_MIN) / SPAN) * 100;

interface Phase {
  key: string;
  from: number;
  to: number;
  name: string;
  /** What dominates, with today's figures in it */
  words: (f: ClockFacts) => string;
  /** How hard hedging pushes in this phase, 0..1 — the block's shade */
  weight: number;
  /** What the hedging does to a move in this phase, where the rule of thumb is
      clear enough to say — the hover card's one meaningful ink. The morning
      depends on which side of the flip price is, so it says nothing. */
  pressure?: 'absorbs' | 'amplifies';
}

export interface ClockFacts {
  pin: number | null;
  charmStrike: number | null;
  charmMoves: string | null;
  bellShare: number | null;
  supreme: number | null;
  flip: number | null;
}

/* The schedule, in trading minutes from midnight ET. Weights are the strip's
   own emphasis — a hedging day is quiet in the middle and loud at both ends,
   and the close is the loudest hour of all. */
export const PHASES: Phase[] = [
  {
    key: 'open',
    from: OPEN_MIN,
    to: 10 * 60,
    name: 'The open',
    weight: 0.75,
    pressure: 'amplifies',
    words: f => `the day's walls get set — ${f.supreme != null ? `the heaviest strike (the supreme) is ${fmtStrike(f.supreme)}` : 'the heaviest strike is being decided'}; today's option premium burns fastest here`,
  },
  {
    key: 'morning',
    from: 10 * 60,
    to: 11 * 60 + 30,
    name: 'The morning',
    weight: 0.5,
    words: f => `the trend hour — ${f.flip != null ? `above ${fmtStrike(f.flip)} dips get bought, below it moves get chased` : 'the flip decides which way hedging leans'}`,
  },
  {
    key: 'lunch',
    from: 11 * 60 + 30,
    to: 14 * 60,
    name: 'Lunch',
    weight: 0.3,
    pressure: 'absorbs',
    words: f => `volatility goes quiet and price sticks — ${f.pin != null ? `${fmtStrike(f.pin)} is the strike it sticks to (the gamma pin)` : 'the gamma pin holds price'}`,
  },
  {
    key: 'charm',
    from: 14 * 60,
    to: 15 * 60 + 30,
    name: 'Charm window',
    weight: 0.7,
    pressure: 'amplifies',
    words: f => `dealers unwind hedges as today's options lose their delta (charm) — ${f.charmStrike != null ? `strongest at ${fmtStrike(f.charmStrike)}` : 'this is the force now'}${f.charmMoves ? ` · ${f.charmMoves}` : ''}`,
  },
  {
    key: 'turn',
    from: 15 * 60 + 30,
    to: 15 * 60 + 50,
    name: 'The turn',
    weight: 0.9,
    pressure: 'absorbs',
    words: f => `today's gamma peaks, then starts to fade — ${f.pin != null ? `the pull of ${fmtStrike(f.pin)} doubles` : 'the gamma pin pulls hardest'}`,
  },
  {
    key: 'auction',
    from: 15 * 60 + 50,
    to: CLOSE_MIN,
    name: 'The close',
    weight: 1,
    pressure: 'amplifies',
    /* "at the close", not "4:00": the box prints its hours as 09:30 … 16:00 (the audit's M6, 2026-10-13) */
    words: f => `the closing auction — ${f.bellShare != null ? `${f.bellShare}% of today's gamma expires at the close` : 'today’s gamma expires at the close'}`,
  },
];

const phaseAt = (min: number) => PHASES.find(p => min >= p.from && min < p.to) ?? PHASES[PHASES.length - 1];
/* THE NAMES ON A PHONE (the audit's C1, 2026-10-13): under `lg` the six names stand on two rows, in one word each, the
   close's anchored to the strip's right edge — on one row at 390px "The open" ran into "The morning" and "Charm window"
   into "The turn". Since the paying-user audit (M3) the desk wears the one-word names too; the full ones are in the card. */
const SHORT_NAME: Record<string, string> = { open: 'Open', morning: 'Morning', lunch: 'Lunch', charm: 'Charm', turn: 'Turn', auction: 'Close' };
const PRESSURE_WORDS = { absorbs: 'absorbs moves', amplifies: 'amplifies moves' } as const;
/* WHAT A BLOCK'S INK SAYS (2026-10-14): the hedging's own pair, the matrix's legend — ember where it amplifies a move,
   glacier where it absorbs one; the morning, which leans with the flip, in the page's ink. The weight is its depth. */
const PRESSURE_INK = { absorbs: GLACIER, amplifies: EMBER } as const;

/* A FACT ON THE HEAD'S LINE — its name in tracked capitals, its figure beside it, a hairline before the next (the page
   head's grammar, PinpointLayout's Fact) */
const ClockFact = ({ label, children }: { label: string; children: ReactNode }) => (
  <span className="inline-flex items-baseline gap-2 whitespace-nowrap pr-3 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-borderSubtle [&:not(:first-child)]:pl-3">
    <span className="text-[11px] uppercase tracking-wider text-textMuted">{label}</span>
    <span className="text-[13px] font-semibold text-textPrimary">{children}</span>
  </span>
);

/** What the reader has kept: one block, or one whole phase */
type Pin = { kind: 'block'; i: number } | { kind: 'phase'; key: string } | null;

/** `scope`: the host's chip saying which name these figures belong to.
    `at`: minutes from midnight ET to stand the clock at instead of now — the
    Map's replay (2026-09-08) walks the strip to the minute it is rewound to. */
const TraderClock = ({ snapshot, scope, at }: { snapshot: MarketSnapshot; scope?: ReactNode; at?: number | null }) => {
  const clock = readSessionClock();
  const [hover, setHover] = useState<number | null>(null);
  const [pin, setPin] = useState<Pin>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  /* the box folds to its head, remembered (data/boxFold.ts) */
  const [open, toggleOpen] = useBoxFold('clock');
  /* FIFTEEN-MINUTE BLOCKS ON A NARROW STRIP (the re-audit's H2, 2026-10-13): 78 five-minute blocks on a phone's 356px
     were 1.9px wide each, and each is a button. Under 520px the strip holds 26 blocks of a quarter hour; the block kept
     is read as its first minute, as before. */
  const [stripW, setStripW] = useState(0);
  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const read = () => setStripW(prev => (prev === el.clientWidth ? prev : el.clientWidth));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);
  const narrow = stripW > 0 && stripW < 520;
  /* the phase names on two rows, short, when the strip is under 760px — measured off the strip, not the window, so the
     clock laid beside the report on a wide desk (idea 4) reads as it does on a phone */
  const twoRows = stripW > 0 && stripW < 760;
  const blockMin = narrow ? 15 : BLOCK_MIN;
  const blocks = SPAN / blockMin;
  /* a kept block means a different minute once the blocks change size — let it go rather than keep the wrong one */
  useEffect(() => {
    setPin(p => (p?.kind === 'block' ? null : p));
    setHover(null);
  }, [narrow]);
  /* The guide as a focus over the whole box (the house pattern, 2026-09-06) */
  const [guideOpen, setGuideOpen] = useState(false);

  /* A click on a block keeps that block; a click on a phase's name up top keeps
     the whole phase (Noah: "no double click, only clicking the words up top
     showcases the segment"). Clicking the same thing again lets it go. */
  const onBlockClick = (i: number) => setPin(p => (p?.kind === 'block' && p.i === i ? null : { kind: 'block', i }));
  const onNameClick = (key: string) => setPin(p => (p?.kind === 'phase' && p.key === key ? null : { kind: 'phase', key }));

  /* A click anywhere outside the strip and its names lets go */
  useEffect(() => {
    if (!pin) return;
    const onDown = (e: PointerEvent) => {
      const root = stripRef.current;
      if (root && !root.contains(e.target as Node)) setPin(null);
    };
    window.addEventListener('pointerdown', onDown, true);
    return () => window.removeEventListener('pointerdown', onDown, true);
  }, [pin]);

  /* Today's figures, off the same engines the rest of the page reads */
  const facts = useMemo<ClockFacts>(() => {
    let pinStrike: number | null = null;
    let supreme: number | null = null;
    let flip: number | null = null;
    let charmStrike: number | null = null;
    let charmMoves: string | null = null;
    let bellShare: number | null = null;
    try {
      const p = buildExposureProfile(snapshot, '0DTE', 20);
      pinStrike = p.levels.pin;
      supreme = p.levels.supreme;
      flip = p.levels.flip;
    } catch {
      /* no chain yet */
    }
    try {
      const vc = buildVannaCharm(snapshot, 'CHARM', -1);
      charmStrike = vc.read.charm.price;
      const moved = vc.shifts.filter(s => Math.abs(s.projected - s.current) > 1e-9);
      /* The engine's labels carry its own word "node"; the reader gets the level's name alone */
      charmMoves = moved.length ? `into the close it moves ${moved.map(s => `${s.label.toLowerCase().replace(/\s*node\b/, '')} ${fmtStrike(s.current)} → ${fmtStrike(s.projected)}`).join(', ')}` : 'the levels hold into the close';
    } catch {
      /* no chain yet */
    }
    try {
      const surface = buildExposureSurface(snapshot, 20, CALENDAR_DTES);
      const today = surface.expiries.findIndex(e => e.dte === 0);
      if (today >= 0) {
        let dies = 0;
        let total = 0;
        for (let e = 0; e < surface.expiries.length; e++)
          for (let s = 0; s < surface.strikes.length; s++) {
            const v = Math.abs(surface.net.gex[e][s] ?? 0);
            total += v;
            if (e === today) dies += v;
          }
        bellShare = total > 0 ? Math.round((100 * dies) / total) : null;
      }
    } catch {
      /* no surface yet */
    }
    return { pin: pinStrike, supreme, flip, charmStrike, charmMoves, bellShare };
  }, [snapshot]);

  /* Where NOW sits — New York minutes; outside the session there is no lit block */
  const [h, m] = clock.etTime.split(':').map(Number);
  const nowMin = at != null ? Math.max(OPEN_MIN, Math.min(CLOSE_MIN - 1, at)) : h * 60 + m;
  const inSession = at != null ? true : clock.phase === 'OPEN' || clock.phase === 'AUCTION';
  const nowBlock = inSession ? Math.min(blocks - 1, Math.floor((nowMin - OPEN_MIN) / blockMin)) : null;
  const current = inSession ? phaseAt(nowMin) : null;
  const next = inSession ? PHASES.find(p => p.from > nowMin) ?? null : null;

  /* What is kept, and what the card shows: the hovered block first, else the
     kept block; a kept phase rings its blocks and owns the sentence */
  const keptBlock = pin?.kind === 'block' ? pin.i : null;
  const keptPhase = pin?.kind === 'phase' ? PHASES.find(p => p.key === pin.key) ?? null : null;
  const shownBlock = hover ?? keptBlock;
  /* ONE TAB STOP, THE ARROW KEYS WALK THE BLOCKS (the re-audit's M2): the strip was 78 stops between the box above and
     the report. The kept block, else the one that is now, takes the Tab; Left and Right move along, Enter keeps, Escape
     lets go — the tape's and the profile's walk. */
  const focusBlock = keptBlock ?? nowBlock ?? 0;
  const onStripKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    const cur = hover ?? keptBlock ?? nowBlock ?? 0;
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = Math.max(0, cur - 1);
    else if (e.key === 'ArrowRight') next = Math.min(blocks - 1, cur + 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = blocks - 1;
    else if (e.key === 'Escape') {
      setPin(null);
      setHover(null);
      return;
    } else return;
    e.preventDefault();
    setHover(next);
    stripRef.current?.querySelector<HTMLButtonElement>(`[data-block="${next}"]`)?.focus();
  };
  /* the guide draws the desk's 78 five-minute blocks whatever the strip's width */
  const guideNow = inSession ? Math.min(SPAN / BLOCK_MIN - 1, Math.floor((nowMin - OPEN_MIN) / BLOCK_MIN)) : null;
  const shownMin = shownBlock != null ? OPEN_MIN + shownBlock * blockMin : null;
  const shownPhase = shownMin != null ? phaseAt(shownMin) : null;
  const cardPct = shownBlock != null ? ((shownBlock + 0.5) / blocks) * 100 : 0;
  const cardOnRight = shownBlock != null ? shownBlock < blocks * 0.6 : true;
  /* the card opens under the strip, or over it where the screen ends first (2026-10-14: the box is short now, and its
     card under a strip near the screen's foot opened off it) — read only while a block is shown */
  const cardAbove = shownBlock != null && typeof window !== 'undefined' && (stripRef.current?.getBoundingClientRect().bottom ?? 0) + 150 > window.innerHeight;

  const line = keptBlock != null
    ? `${hhmm(OPEN_MIN + keptBlock * blockMin)}, ${phaseAt(OPEN_MIN + keptBlock * blockMin).name.toLowerCase()} — ${phaseAt(OPEN_MIN + keptBlock * blockMin).words(facts)}.`
    : keptPhase
      ? `${keptPhase.name}, ${hhmm(keptPhase.from)} to ${hhmm(keptPhase.to)} — ${keptPhase.words(facts)}.`
      : current
        ? `${current.name} — ${current.words(facts)}${next ? `. ${next.name} in ${next.from - nowMin} minutes.` : '.'}`
        : `${clock.label} — when it opens: ${PHASES[0].words(facts)}.`;

  const lookingAt = keptBlock != null ? `${hhmm(OPEN_MIN + keptBlock * blockMin)} · ${phaseAt(OPEN_MIN + keptBlock * blockMin).name}` : keptPhase ? `${keptPhase.name} · ${hhmm(keptPhase.from)}–${hhmm(keptPhase.to)}` : null;

  return (
    <section className="relative h-full flex flex-col min-w-0" data-trader-clock>
      <GuideFocus open={guideOpen} onClose={() => setGuideOpen(false)} title="How to read the clock" testId="clock-guide" viewport>
        <ClockGuide nowBlock={guideNow} line={line} bellShare={facts.bellShare} pin={facts.pin} supreme={facts.supreme} charmStrike={facts.charmStrike} />
      </GuideFocus>
      {/* THE HEAD IN THE HOUSE'S GRAMMAR (2026-10-14, the owner: the clock was "AI slop" — a subtitle, three stat cards with
          their labels over their values, a paragraph under a wall of identical bars): the name, its scope and its doors, then
          the facts on one mono line, tracked capitals for their names and the figures beside them. On the box beside the
          report the facts take the line under the name. */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-x-3 gap-y-2 flex-wrap">
        <h3 className="text-[16px] font-semibold leading-tight text-textPrimary">The trader's clock</h3>
        {scope}
        <GuideDoor open={guideOpen} onClick={() => setGuideOpen(v => !v)} title="What the strip and the phases mean" testId="clock-guide" />
        <FoldDoor open={open} onToggle={toggleOpen} what="the clock" testId="clock" />
        <div className="ml-auto flex items-baseline flex-wrap gap-y-1 font-mono" data-clock-facts>
          {lookingAt ? (
            <ClockFact label="Looking at">
              <span className="tnum" style={{ color: SILVER }} data-clock-looking>
                {lookingAt}
              </span>
              <button onClick={() => setPin(null)} className="hit ml-3 text-[11px] font-medium uppercase tracking-wider text-textMuted hover:text-textPrimary transition-colors" data-back-to-now>
                Back to now
              </button>
            </ClockFact>
          ) : (
            <>
              <ClockFact label="Now">
                <span data-clock-now>
                  {inSession && current ? (
                    <>
                      <span className="tnum">{hhmm(nowMin)}</span> <span className="font-normal text-textSecondary">{SHORT_NAME[current.key].toLowerCase()}</span>
                    </>
                  ) : (
                    <span className="font-normal text-textSecondary">{clock.label.toLowerCase()}</span>
                  )}
                </span>
              </ClockFact>
              <ClockFact label="Next">
                {next ? (
                  <>
                    <span className="font-normal text-textSecondary">{SHORT_NAME[next.key].toLowerCase()}</span> <span className="tnum">{next.from - nowMin}m</span>
                  </>
                ) : inSession ? (
                  <span className="font-normal text-textSecondary">the close</span>
                ) : (
                  <>
                    <span className="font-normal text-textSecondary">open</span> <span className="tnum">09:30</span>
                  </>
                )}
              </ClockFact>
            </>
          )}
          {/* in the page's ink, not magenta — magenta is the supreme's marker alone (2026-10-14) */}
          <ClockFact label="Expires at the close">
            <span className="tnum" data-clock-bell>
              {facts.bellShare != null ? `${facts.bellShare}%` : '—'}
            </span>
            {facts.bellShare != null && <span className="ml-1.5 font-normal text-textSecondary">of gamma</span>}
          </ClockFact>
        </div>
      </div>

      {open && (
      <div className="px-5 pb-4 flex flex-col" ref={stripRef}>
        {/* THE PHASES — named above the strip on ONE row. Each name sits at its
            phase's start, except the last two: the turn is twenty minutes wide
            and the close ten, so the turn's name ends at 15:50 and the close's
            starts there — the same line, no overlap. */}
        <div className={`relative ${narrow ? 'h-9' : 'h-[18px]'}`} data-clock-phases>
          {PHASES.map((p, i) => {
            const active = current?.key === p.key;
            const kept = keptPhase?.key === p.key || (keptBlock != null && phaseAt(OPEN_MIN + keptBlock * blockMin).key === p.key);
            const turn = p.key === 'turn';
            const last = p.key === 'auction';
            /* With something kept, its name stays sharp and the others go soft with their blocks */
            const nameCls = kept ? 'text-textPrimary' : pin ? 'text-textMuted/50 hover:text-textPrimary' : active ? '' : 'text-textMuted hover:text-textPrimary';
            return (
              <button
                key={p.key}
                data-phase-name={p.key}
                aria-pressed={keptPhase?.key === p.key}
                onClick={() => onNameClick(p.key)}
                /* Under lg: every other name on the second row, the close's name on the strip's right edge (it ran 8px past a
                   phone's strip from its own start, so the phone pass of 2026-09-13 hid it) */
                /* ONE WORD EACH, AND THE CLOSE ON THE EDGE AT EVERY WIDTH (the paying-user audit's M3, 2026-10-13): "The close"
                   from its own start ran 4px past a 1440 desk's box; on one row the turn stands just left of it */
                className={`hit absolute font-mono text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap ${nameCls} ${narrow && i % 2 === 1 ? 'top-[18px]' : 'top-0'} ${last ? '!left-auto !right-0 !translate-x-0' : ''} ${turn && !narrow ? '!left-auto !right-[52px] !translate-x-0' : ''}`}
                style={{
                  left: `${pct(turn ? p.to : p.from)}%`,
                  transform: turn ? 'translateX(calc(-100% - 6px))' : last ? 'translateX(2px)' : undefined,
                  ...(active ? { color: SILVER } : {}),
                }}
                title={`${hhmm(p.from)}–${hhmm(p.to)} — click to keep this phase`}
              >
                {SHORT_NAME[p.key]}
              </button>
            );
          })}
        </div>

        {/* THE STRIP — 78 five-minute blocks; shade = the phase's weight, silver = now */}
        {/* BESIDE THE REPORT (from 1,880px) the box is as tall as the report, and the strip takes the height the box has
            over its words (2026-10-13, "i dont want any deadspace") — 22px when the box is its own height */}
        <div className="relative flex flex-col" onPointerLeave={() => setHover(null)}>
          {/* a narrow strip is the thumb's height (44px) — the blocks are the targets, and 10px wide is all the width a quarter
              hour gets on a phone; the height is ours to give */}
          <div
            className={`flex gap-[2px] ${narrow ? 'h-11' : 'h-7'}`}
            data-clock-strip
            data-block-minutes={blockMin}
            role="group"
            aria-label={`Today's session as ${narrow ? 'fifteen' : 'five'}-minute blocks, shaded by how hard hedging pushes — the arrow keys walk them, Enter keeps one`}
            onKeyDown={onStripKeys}
            onBlur={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHover(null);
            }}
          >
            {Array.from({ length: blocks }, (_, i) => {
              const min = OPEN_MIN + i * blockMin;
              const p = phaseAt(min);
              const isNow = nowBlock === i;
              const future = nowBlock != null && i > nowBlock;
              const inCurrent = current?.key === p.key;
              const hovered = hover === i;
              /* WHAT IS KEPT IS IN FOCUS, THE REST GOES SOFT (Noah: "a focus on
                 that portion and a blur on the rest", not rings): a kept phase
                 keeps its blocks crisp and lifted while every other block dims
                 and blurs; a kept block does the same for itself alone. A block
                 under the pointer is always in focus. */
              const inFocus = hovered || (keptPhase ? p.key === keptPhase.key : keptBlock != null ? i === keptBlock : true);
              const soft = !!pin && !inFocus;
              /* The phase you are in sits a touch brighter than its weight alone;
                 the block under the pointer, or a kept one, brighter still */
              const depth = Math.min(0.95, 0.3 + p.weight * 0.45 + (inCurrent ? 0.08 : 0) + (hovered ? 0.25 : 0) + (!hovered && pin && inFocus ? 0.15 : 0));
              const wash = p.pressure ? alpha(PRESSURE_INK[p.pressure], depth) : `rgb(var(--text-primary) / ${(depth * 0.55).toFixed(3)})`;
              const boundary = i > 0 && phaseAt(min - blockMin).key !== p.key;
              const dim = hover != null && !hovered;
              return (
                <button
                  key={i}
                  type="button"
                  data-block={i}
                  data-phase={p.key}
                  data-focus={pin ? (inFocus ? 'in' : 'soft') : undefined}
                  aria-label={`${hhmm(min)} · ${p.name}`}
                  aria-pressed={keptBlock === i}
                  tabIndex={i === focusBlock ? 0 : -1}
                  onFocus={() => setHover(i)}
                  onPointerEnter={() => setHover(i)}
                  onClick={() => onBlockClick(i)}
                  className={`flex-1 min-w-0 rounded-[2px] ${boundary ? 'ml-[3px]' : ''}`}
                  style={{
                    /* the ink's wash — light on the dark terminal, near-black on paper (the white washes were "so bright") */
                    background: isNow ? LIVE : wash,
                    opacity: soft ? 0.3 : dim ? 0.55 : future ? 0.45 : 1,
                    filter: soft ? 'blur(1.2px)' : undefined,
                    boxShadow: isNow ? `0 0 0 1px ${LIVE}` : undefined,
                  }}
                />
              );
            })}
          </div>
          {/* the hours under the strip */}
          <div className="relative h-4 mt-1">
            {[OPEN_MIN, 10 * 60, 11 * 60, 12 * 60, 13 * 60, 14 * 60, 15 * 60, CLOSE_MIN].map(t => (
              <span
                key={t}
                /* a phone's strip holds four hours, not eight: 09:30 overprinted 10:00 (the audit's C1) */
                className={`absolute top-0 font-mono text-[11px] tnum text-textMuted ${twoRows && (t === 10 * 60 || t === 11 * 60 || t === 13 * 60 || t === 15 * 60) ? 'hidden' : ''}`}
                style={{ left: `${pct(t)}%`, transform: t === CLOSE_MIN ? 'translateX(-100%)' : t === OPEN_MIN ? undefined : 'translateX(-50%)' }}
              >
                {hhmm(t)}
              </span>
            ))}
          </div>
          {/* THE CARD — the hovered block's, else the kept block's: the minute, its
              phase, the phase's sentence for today, and one meaningful ink */}
          {shownBlock != null && shownMin != null && shownPhase && (
            <div
              data-clock-card
              data-kept={keptBlock === shownBlock ? 'true' : 'false'}
              className={`absolute z-10 pointer-events-none rounded-lg border border-borderMuted bg-card/95 backdrop-blur-sm shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-3 py-2 ${narrow ? 'left-0 right-0' : 'w-[300px]'}`}
              /* UNDER THE STRIP, over the sentence that says the same (the audit's M7, 2026-10-13): risen above the strip, a card
                 for a block in the right half covered the box's own facts (Now · Next · Expires). On a narrow strip it is the
                 strip's own width — beside the block it ran off a phone's edge (the re-audit). */
              style={{ ...(cardAbove ? { bottom: 'calc(100% + 22px)' } : { top: 'calc(100% + 4px)' }), ...(narrow ? {} : { left: `${cardPct}%`, transform: cardOnRight ? 'translateX(12px)' : 'translateX(calc(-100% - 12px))' }) }}
            >
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[12px] font-semibold tnum" style={{ color: keptBlock === shownBlock ? SILVER : undefined }}>
                  {hhmm(shownMin)}
                </span>
                <span className="text-[11px] font-medium text-textPrimary">{shownPhase.name}</span>
                <span className="ml-auto font-mono text-[11px] tnum text-textMuted">
                  {hhmm(shownPhase.from)}–{hhmm(shownPhase.to)}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-snug text-textSecondary">{shownPhase.words(facts)}.</p>
              {shownPhase.pressure && (
                <span className="mt-1 block font-mono text-[11px] font-semibold uppercase tracking-wider" data-pressure={shownPhase.pressure} style={{ color: PRESSURE_INK[shownPhase.pressure] }}>
                  {PRESSURE_WORDS[shownPhase.pressure]}
                </span>
              )}
              <span className="block mt-1 text-[11px] text-textMuted">{keptBlock === shownBlock ? 'kept · click anywhere else to let go' : 'click to keep · the phase names above keep a whole phase'}</span>
            </div>
          )}
        </div>

        {/* no sentence under the strip (2026-10-14): what the phase you are in does today is the card's, on the block under
            the pointer, and the guide's — the box's own line is the head's facts */}
      </div>
      )}
    </section>
  );
};

export default TraderClock;
