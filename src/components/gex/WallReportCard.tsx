/*
==================================================
  SLAYER TERMINAL - HOW THE LEVELS HELD TODAY
  (components/gex/WallReportCard.tsx)

  Levels earn trust in front of the reader (the
  Pinpoint roadmap, 2026-09-05). Every named level
  of today's map — the call wall, the flip, the put
  wall, the gamma pin, the supreme — with its record
  for the session: how many times price tested it,
  how many of those it held, how many it broke, when
  it was last touched, and whether the gamma behind
  it has grown or shrunk since the open.

  REDONE 2026-09-05 in the approved grammar (the
  positions cards): a row per level, hairlines and
  air instead of a table, labels over values, and
  the record drawn as a STRIP OF THE SESSION — one
  tick per test along the day, green where the
  level held, red where it broke — with a hover
  card that names the minute and the close. The
  strip is the picture the seven numbers used to
  stand in for.

  THE RECORD COMES OFF THE SAME BARS the chart
  draws, with the same rule the focus chip uses: a
  bar's range reaching the level is a test; a close
  beyond it after a test is a break. Nothing is
  judged by opinion.

  A ROW IS A STRIKE. Click one and it is the
  terminal's strike, on the rail above and the chip
  in the shell.
==================================================
*/

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { roomLevels } from '../../data/roomLevels';
import FoldDoor from './FoldDoor';
import { useBoxFold } from '../../data/boxFold';
import { buildLevelRead, sessionBars } from '../../data/levelview';
import { nyClock } from '../../core/nyTime';
import { RECORD_LEVELS, RECORD_WORDS, baseRates, levelTicks, sessionRecords, type Tick } from '../../data/levelRecord';
import { useLevelsScope } from '../../data/levelsScope';
import { bookMarket } from '../../data/bookMarket';
import { CALL_WALL, FLIP, PUT_WALL, SUPREME } from './paletteInk';
import GuideFocus, { GuideDoor } from '../ui/GuideFocus';
import ReportGuide from './ReportGuide';
import type { Candle, MarketSnapshot } from '../../types/market';

const SILVER = 'rgb(var(--silver))'; /* the silver token — deep steel on the light terminal (2026-09-12) */
const GREEN = 'rgb(var(--bull))';
const RED = 'rgb(var(--bear))';
const fmtStrike = (v: number) => (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2));
/* NEW YORK'S CLOCK, like "Last touched" beside it (the audit's H2, 2026-10-13): the browser's zone put 05:43 and 01:36 on one row for the same minute */
const hhmm = (unix: number) => nyClock(unix * 1000);

/* THE RULE FOR A TEST AND A BREAK lives in data/levelRecord.ts (`levelTicks`) since 2026-10-13, where the sessions before
   today are graded by the same rule — the base rates under the subtitle */

interface Row {
  key: string;
  label: string;
  ink: string;
  /** The names on this row — more than one where levels share a strike (see the merge below) */
  labels: { label: string; ink: string }[];
  price: number;
  side: 'call' | 'put';
  ticks: Tick[];
  tests: number;
  held: number;
  broke: number;
  last: string | null;
  trend: string;
  grade: { words: string; tone: 'good' | 'bad' | 'quiet' };
}

const TONE: Record<Row['grade']['tone'], string> = {
  good: 'bg-bull/10 text-bull border-bull/20',
  bad: 'bg-bear/10 text-bear border-bear/20',
  quiet: 'bg-ink/[0.05] text-textSecondary border-borderSubtle',
};

// ---- the strip ----------------------------------------------------------------

const SW = 600;
const SH = 40; /* tall enough for price's path around the level (the paying-user audit's H4) — the row is ~80px anyway */

const SessionStrip = ({ row, bars }: { row: Row; bars: readonly Candle[] }) => {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<Tick | null>(null);
  const n = Math.max(1, bars.length - 1);
  const x = (i: number) => 8 + (i / n) * (SW - 16);
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const svg = ref.current;
    if (!svg || !row.ticks.length) return;
    const r = svg.getBoundingClientRect();
    const u = ((e.clientX - r.left) / r.width) * SW;
    const near = row.ticks.reduce((b, t) => (Math.abs(x(t.i) - u) < Math.abs(x(b.i) - u) ? t : b), row.ticks[0]);
    setHover(Math.abs(x(near.i) - u) < 14 ? near : null);
  };
  /* price above the level rides above the line, below it under — scaled to the farthest it went either way */
  const path = useMemo(() => {
    if (bars.length < 2) return '';
    let far = 0;
    for (const b of bars) far = Math.max(far, Math.abs(b.close - row.price));
    if (far <= 0) return '';
    const half = SH / 2 - 2;
    return bars.map((b, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${(SH / 2 - ((b.close - row.price) / far) * half).toFixed(1)}`).join(' ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, row.price]);
  const cardLeft = hover ? (x(hover.i) / SW) * 100 : 0;
  const onRight = hover ? x(hover.i) < SW * 0.6 : true;
  return (
    <div className="relative" onPointerLeave={() => setHover(null)}>
      <svg ref={ref} viewBox={`0 0 ${SW} ${SH}`} width="100%" height={SH} preserveAspectRatio="none" data-session-strip onPointerMove={onMove} style={{ display: 'block', cursor: row.ticks.length ? 'crosshair' : 'default' }} role="img" aria-label={`${row.label}: ${row.tests} tests along the session`}>
        {/* the session, as a hairline from the first bar to the newest — THE LEVEL, with price's path around it (the
            paying-user audit's H4, 2026-10-13: a bare hairline with three ticks said nothing between the tests; the path
            says how close price came and from which side) */}
        {/* the ink token, not white: on paper a white hairline was no hairline (the audit's H1) */}
        <line x1={8} x2={SW - 8} y1={SH / 2} y2={SH / 2} stroke="rgb(var(--ink))" strokeOpacity={0.18} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {path && <path d={path} fill="none" stroke={SILVER} strokeOpacity={0.4} strokeWidth={1} vectorEffect="non-scaling-stroke" data-strip-path />}
        {/* one tick per test */}
        {row.ticks.map(t => (
          <line
            key={`${t.i}-${t.kind}`}
            x1={x(t.i)}
            x2={x(t.i)}
            y1={t.kind === 'broke' ? 4 : 8}
            y2={t.kind === 'broke' ? SH - 4 : SH - 8}
            stroke={t.kind === 'broke' ? RED : GREEN}
            strokeOpacity={hover && hover !== t ? 0.45 : 0.9}
            strokeWidth={t.kind === 'broke' ? 2 : 1.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {/* now — the newest bar */}
        <line x1={SW - 8} x2={SW - 8} y1={6} y2={SH - 6} stroke={SILVER} strokeOpacity={0.6} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
      {hover && (
        <div
          data-strip-card
          className="absolute -top-1 z-10 pointer-events-none rounded-md border border-borderMuted bg-card/95 backdrop-blur-sm shadow-[0_8px_24px_rgba(0,0,0,0.5)] px-2.5 py-1.5 whitespace-nowrap"
          style={{ left: `${cardLeft}%`, transform: onRight ? 'translate(12px, -100%)' : 'translate(calc(-100% - 12px), -100%)' }}
        >
          <span className="font-mono text-[11px] font-semibold tnum text-textPrimary">{hhmm(hover.time)}</span>
          <span className={`ml-2 text-[11px] font-medium ${hover.kind === 'broke' ? 'text-bear' : 'text-bull'}`}>{hover.kind === 'broke' ? 'broke' : 'tested, held'}</span>
          <span className="ml-2 font-mono text-[11px] tnum text-textMuted">close {hover.close.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
};

// ---- the section ----------------------------------------------------------------

/** `scope`: the host's chip saying which name's levels these are */
const WallReportCard = ({ snapshot, focus, onPick, scope, bars: barsProp }: { snapshot: MarketSnapshot; focus: number | null; onPick: (price: number) => void; scope?: ReactNode; /** The day so far, handed in — the Map's replay reads the bars up to its position (2026-09-08) */ bars?: readonly Candle[] }) => {
  const bars = useMemo(() => barsProp ?? sessionBars(snapshot.ticker) ?? [], [snapshot, barsProp]);
  /* the levels off today's contracts or every date — the desk's one choice (data/levelsScope.ts) */
  const levelsScope = useLevelsScope();
  const rows = useMemo<Row[]>(() => {
    /* the room's one reading of the levels (data/roomLevels.ts): the band's window and scope, so the pin here is the pin
       the band tags (the re-audit's H6) */
    const levels = roomLevels(snapshot, levelsScope);
    if (!levels) return [];
    const mk = (key: string, label: string, ink: string, price: number, side: 'call' | 'put'): Row => {
      const ticks = levelTicks(bars, price, side);
      const broke = ticks.filter(t => t.kind === 'broke').length;
      const tests = ticks.length;
      const held = tests - broke;
      const read = buildLevelRead(snapshot.ticker, price);
      const pct = read?.changePct ?? null;
      const size = pct == null ? '' : Math.abs(pct) >= 300 ? ` · ${(1 + pct / 100).toFixed(0)}× the open` : ` ${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`;
      const trend = !read || read.trend === 'FLAT' ? 'flat since the open' : read.trend === 'NEW' ? 'new since the open' : `${read.trend === 'BUILDING' ? 'growing' : 'shrinking'}${size}`;
      const grade: Row['grade'] =
        tests === 0 ? { words: 'untested', tone: 'quiet' } : broke === 0 ? { words: `held every test`, tone: 'good' } : held === 0 ? { words: 'broke every test', tone: 'bad' } : { words: `broke ${broke} of ${tests}`, tone: broke * 2 >= tests ? 'bad' : 'quiet' };
      return { key, label, ink, labels: [{ label, ink }], price, side, ticks, tests, held, broke, last: read?.lastTouch ?? null, trend, grade };
    };
    const spot = levels.spot;
    const out: Row[] = [
      mk('call', 'Call wall', CALL_WALL, levels.callWall, 'call'),
      mk('flip', 'Gamma flip', FLIP, levels.flip, levels.flip >= spot ? 'call' : 'put'),
      mk('put', 'Put wall', PUT_WALL, levels.putWall, 'put'),
      mk('pin', 'Gamma pin', 'rgb(var(--text-primary))', levels.pin, levels.pin >= spot ? 'call' : 'put'),
      mk('supreme', 'Supreme', SUPREME, levels.supreme, levels.supreme >= spot ? 'call' : 'put'),
    ];
    // Highest price first — the section reads like the ladder above it
    const sorted = out.sort((a, b) => b.price - a.price || a.key.localeCompare(b.key));
    /* ONE ROW WHERE LEVELS COINCIDE (the audit's M5, 2026-10-13): the pin, the put wall and the supreme on one strike
       printed three rows with the same price, strip, chip and facts. Levels that share a strike and a side share a row,
       their names stacked in their own inks — the levels are the levels, only the presentation merges. */
    const merged: Row[] = [];
    for (const r of sorted) {
      const last = merged[merged.length - 1];
      if (last && Math.abs(last.price - r.price) < 1e-9 && last.side === r.side) {
        last.labels.push({ label: r.label, ink: r.ink });
        last.key = `${last.key}+${r.key}`;
        last.label = `${last.label} · ${r.label}`;
      } else merged.push(r);
    }
    return merged;
  }, [snapshot, bars, levelsScope]);
  /* THE BASE RATES (data/levelRecord.ts): the sessions on hand before today, each level as it stood at its open, graded
     by the report's own rule — read, not stored; a machine on the vendor's two years grades two years */
  const rates = useMemo(() => baseRates(sessionRecords(snapshot.ticker, bookMarket().cfg(snapshot.ticker)?.iv ?? null)), [snapshot.ticker]);

  const first = bars[0]?.time;
  const last = bars[bars.length - 1]?.time;
  /* the levels, counted before the merge — "3 levels" read as two missing (the re-audit's L11) */
  const levelCount = rows.reduce((n, r) => n + r.labels.length, 0);
  /* The guide as a focus over the whole box (the house pattern, 2026-09-06) */
  const [guideOpen, setGuideOpen] = useState(false);
  /* the box folds to its head, remembered (data/boxFold.ts) */
  const [open, toggleOpen] = useBoxFold('report');

  return (
    <section className="relative flex flex-col min-w-0" data-report-card>
      <GuideFocus open={guideOpen} onClose={() => setGuideOpen(false)} title="How to read the report" testId="report-guide" viewport>
        <ReportGuide rows={rows.map(r => ({ label: r.label, price: r.price, tests: r.tests, held: r.held, broke: r.broke, grade: r.grade.words, trend: r.trend }))} bars={bars.length} from={first != null ? hhmm(first) : null} />
      </GuideFocus>
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-[16px] font-semibold leading-tight text-textPrimary">How the levels held today</h3>
          {scope}
          <GuideDoor open={guideOpen} onClick={() => setGuideOpen(v => !v)} title="What the rows, the strips and the ticks mean" testId="report-guide" />
          <FoldDoor open={open} onToggle={toggleOpen} what="the report" testId="report" />
        </div>
        {/* one line (the owner, 2026-10-14: "too much small grey text"); what a test and a break are is the guide's */}
        <p className="mt-0.5 text-[11px] text-textMuted">
          Every test of today's levels{levelsScope === 'ALL' ? ', off every listed date' : ''}{first != null && last != null ? ` · ${hhmm(first)} to ${hhmm(last)}` : ''}
        </p>
        {/* THE BASE RATES AS THE BOX'S OWN FACTS (the re-audit's M8): a labelled figure each, not a sentence that said
            "held its first test" four times over two lines */}
        {rates.sessions > 0 && (
          <div className="mt-1.5" title="Each session's levels are read off the first book kept that morning, never a later one — no look-ahead; the rule for a test and a break is this report's" data-base-rates={rates.sessions}>
            {/* the lead says what the figures are, once; the facts carry the figures (the re-audit's M6: "held its first
                test" four times over was the sentence's fault, and it had come back as four labels) */}
            <p className="text-[11px] text-textMuted">
              Before today · how often a level's first test held, over {rates.sessions} {rates.sessions === 1 ? 'session' : 'sessions'}
            </p>
            <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-1 max-lg:grid max-lg:grid-cols-2 max-lg:gap-x-4">
              {RECORD_LEVELS.filter(k => rates.levels[k].tested > 0).map(k => (
                <div key={k} className="flex items-baseline gap-1.5" data-base-rate={k}>
                  <dt className="text-[11px] text-textMuted">{RECORD_WORDS[k].charAt(0).toUpperCase() + RECORD_WORDS[k].slice(1)}</dt>
                  <dd className="font-mono text-[12px] tnum text-textPrimary">
                    {rates.levels[k].heldFirst} of {rates.levels[k].tested}
                  </dd>
                </div>
              ))}
              {rates.insideMove.n > 0 && (
                <div className="flex items-baseline gap-1.5 max-lg:col-span-2" data-base-rate="close">
                  <dt className="text-[11px] text-textMuted">Close inside one expected move</dt>
                  <dd className="font-mono text-[12px] tnum text-textPrimary">
                    {rates.insideMove.inside} of {rates.insideMove.n}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
      {open && (
      <ul className="flex flex-col" data-level-rows>
        {rows.map(r => {
          const isFocus = focus != null && Math.abs(focus - r.price) < 1e-9;
          const facts: { k: string; v: string; cls?: string }[] = [
            { k: 'Tests', v: String(r.tests) },
            { k: 'Held', v: String(r.held), cls: r.held > 0 ? 'text-bull' : undefined },
            { k: 'Broke', v: String(r.broke), cls: r.broke > 0 ? 'text-bear' : undefined },
            { k: 'Last touched', v: r.last ?? '—' },
            { k: 'Gamma since the open', v: r.trend },
          ];
          return (
            <li key={r.key} className={`border-t border-borderSubtle/50 ${isFocus ? 'bg-silver/[0.04]' : ''}`} data-level={r.key}>
              {/* One column on a phone (the phone pass, 2026-09-13): the level, its strip, its facts under each other */}
              <div className="grid grid-cols-[200px_minmax(0,1fr)_auto] items-center gap-6 px-5 py-3 max-lg:grid-cols-1 max-lg:gap-3">
                {/* on a phone the name, the price and the chip share one line (the re-audit's M6): a 232px row became ~180 */}
                <button onClick={() => onPick(r.price)} className="hit text-left min-w-0 group max-lg:flex max-lg:flex-wrap max-lg:items-center max-lg:gap-x-3 max-lg:gap-y-1" title={`${r.label} ${fmtStrike(r.price)} — click to make this the strike`} data-level-pick>
                  <span className="flex flex-wrap items-baseline gap-x-1.5 text-[11px] font-semibold" data-level-labels={r.labels.length}>
                    {r.labels.map((l, i) => (
                      <span key={l.label} style={{ color: l.ink }}>
                        {i > 0 && <span className="font-normal text-textMuted">· </span>}
                        {l.label}
                      </span>
                    ))}
                  </span>
                  <span className={`block max-lg:inline-block font-mono text-[18px] font-semibold tnum leading-tight ${isFocus ? 'text-silver' : 'text-textPrimary group-hover:text-silver'} transition-colors`}>{fmtStrike(r.price)}</span>
                  <span className={`mt-1 max-lg:mt-0 inline-flex items-center h-5 px-2 rounded-full border text-[11px] font-medium ${TONE[r.grade.tone]}`} data-grade>
                    {r.grade.words}
                  </span>
                </button>
                <div className="min-w-0">
                  <SessionStrip row={r} bars={bars} />
                  <div className="flex justify-between font-mono text-[11px] tnum text-textMuted px-1 -mt-0.5">
                    <span>{first != null ? hhmm(first) : ''}</span>
                    <span>now</span>
                  </div>
                </div>
                {/* Fixed tracks, so every row's strip ends on the same line whatever the words in the last fact */}
                <dl className="grid grid-cols-[52px_52px_52px_88px_172px] gap-x-5 max-lg:grid-cols-3 max-lg:gap-x-4 max-lg:gap-y-2">
                  {facts.map(f => (
                    <div key={f.k} className="min-w-0">
                      <dt className="text-[11px] text-textMuted whitespace-nowrap">{f.k}</dt>
                      <dd className={`mt-0.5 font-mono text-[12px] tnum whitespace-nowrap ${f.cls ?? 'text-textPrimary'}`}>{f.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </li>
          );
        })}
      </ul>
      )}
    </section>
  );
};

export default WallReportCard;
