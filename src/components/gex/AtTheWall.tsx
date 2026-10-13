/*
==================================================
  SLAYER TERMINAL - AT THE WALL
  (components/gex/AtTheWall.tsx)

  Whether a wall holds when price gets there, and
  what follows either way. REDRAWN 2026-09-30 (Noah:
  the page was "unappealing and confusing to look at
  and understand … at the wall needs a new visual";
  he picked the cut with the two zones on today's
  price). One box, read top to bottom:

    DOES PRICE GET THERE   ten dots and "8 in 10"
    THE TWO ZONES          today's price as a line,
                           and ahead of now two plain
                           boxes on the wall's price:
                           breaks (where it runs) and
                           holds (where price goes
                           back to), each with its
                           odds — WallChart.tsx
    WHY                    the reasons as a tug of
                           war: a bar a reason, left
                           toward a break, right
                           toward a hold, strongest
                           first, the fact beside it
    EVERY WALL             a stack by strike with
                           price between: gets there,
                           holds, what follows. A
                           click moves the top to
                           that wall — the list is
                           the picker.
    ONE READ               the wall in a sentence

  What it replaced: five head facts, a wall dropdown,
  a thin beam, a four-column table of words with a
  110px meter, two arrows in an empty field with
  price running sideways, and a second box whose
  widest column was size.

  Odds are said "N in 10" with the percent beside:
  a bare percent is the most misread figure there is.
  They are the model's odds, not a forecast, and the
  guide says so.

  On a Pulse tile (`bare`): the dots, the chart and
  the read. The tile's head picks the wall.
==================================================
*/

import { Fragment, useMemo, useState, type ReactNode } from 'react';
import GuideFocus, { GuideDoor } from '../ui/GuideFocus';
import SpotRule from '../ui/SpotRule';
import WallChart, { inTen } from './WallChart';
import { WallGuide } from './WallGuide';
import { WALL_CHART_H, WALL_REASON_H, WALL_SPOT_H, WALL_STACK_COLUMNS, WALL_STACK_HEAD_H, WALL_STACK_ROW_H } from './wallSkeletons';
import { CALL_WALL, FLIP, PUT_WALL, SUPREME, THERMAL_COOL, THERMAL_WARM } from './paletteInk';
import { fmtStrike, type AheadClock } from '../../data/ahead';
import type { WallBoard, WallOdds } from '../../data/wall';
import type { Candle } from '../../types/market';

const SILVER = 'rgb(var(--silver))';
const WARM = THERMAL_WARM;
const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const ROLE_INK: Record<string, string> = { 'call wall': CALL_WALL, 'put wall': PUT_WALL, supreme: SUPREME, flip: FLIP };
const pct = (v: number) => `${Math.round(v * 100)}%`;
const inkOf = (w: WallOdds) => (w.role ? ROLE_INK[w.role] : w.weight > 0 ? THERMAL_COOL : SILVER);
/** A reason's name in plain words: the greek's name goes to the guide, and a print is a trade */
const reasonName = (label: string) => label.replace(/ · (charm|vanna)$/, '').replace(/prints$/, 'trades');
const nameOf = (w: WallOdds) => w.role ?? (w.weight > 0 ? 'shelf' : 'strike');

/** Ten dots — the odds as a count */
const Pips = ({ n, ink = SILVER }: { n: number; ink?: string }) => (
  <span className="inline-flex items-center gap-[5px]" aria-hidden>
    {Array.from({ length: 10 }, (_, i) => (
      <span key={i} className="w-[13px] h-[13px] rounded-full border-[1.5px]" style={i < n ? { background: ink, borderColor: ink } : { borderColor: 'rgb(var(--ink) / 0.22)' }} />
    ))}
  </span>
);

/** A short bar and its figure, for the stack */
const Mini = ({ share, words, ink }: { share: number; words: string; ink: string }) => (
  <span className="flex items-center gap-2.5 min-w-0">
    <span className="relative flex-1 h-[5px] rounded-full bg-ink/[0.08] overflow-hidden">
      <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%`, background: ink, transition: `width 520ms ${EASE}, background-color 520ms ${EASE}` }} />
    </span>
    <span className="w-[38px] text-right font-mono text-[12px] font-semibold tnum text-textPrimary">{words}</span>
  </span>
);

interface Props {
  board: WallBoard;
  /** Today's one-minute bars for the name — the chart's line and the tests on it */
  bars: readonly Candle[];
  ticker: string;
  clock: AheadClock;
  onPick: (strike: number) => void;
  updatedAt: string;
  scope?: ReactNode;
  /** ON A PULSE TILE: the dots, the chart and one read — the page has the reasons and the stack */
  bare?: boolean;
}

const AtTheWall = ({ board, bars, ticker, clock, onPick, updatedAt, scope, bare = false }: Props) => {
  const [guideOpen, setGuideOpen] = useState(false);
  const wall = board.focus;
  const ink = inkOf(wall);
  const isWall = wall.weight > 0;
  const dist = wall.strike - board.spot;
  const reachWord = clock.inSession ? 'Does price get there by the close?' : 'Does price get there next session?';
  const reachN = inTen(wall.reach);

  /* WHY — the reasons, the strongest push toward a break first, the strongest toward a hold last */
  const reasons = useMemo(() => [...wall.factors].sort((a, b) => a.push - b.push), [wall.factors]);

  /* EVERY WALL, in the order price meets them: the highest strike first, price between */
  const stack = useMemo(() => {
    const all = board.walls.some(w => Math.abs(w.strike - wall.strike) < 1e-9) ? board.walls : [wall, ...board.walls];
    return [...all].sort((a, b) => b.strike - a.strike);
  }, [board.walls, wall]);
  let spotDrawn = false;

  const reach = (
    <div className={`flex items-center gap-x-3 gap-y-1.5 flex-wrap ${bare ? 'px-3 pt-2.5 pb-2' : 'pb-3'}`} data-wall-reach>
      {bare ? (
        <span className="font-mono text-[11px] font-semibold tnum whitespace-nowrap" style={{ color: ink }} data-wall-name>
          {fmtStrike(wall.strike)} <span className="text-[11px] uppercase tracking-widest">{nameOf(wall)}</span>
        </span>
      ) : (
        <span className="text-[11px] text-textMuted">{reachWord}</span>
      )}
      <Pips n={reachN} />
      <span className="font-mono text-[13px] font-semibold tnum text-textPrimary whitespace-nowrap">
        {reachN} in 10 <span className="font-normal text-[11px] text-textMuted">{pct(wall.reach)}</span>
        {bare && <span className="font-sans font-normal text-[11px] text-textMuted"> get there</span>}
      </span>
    </div>
  );

  /* `fill` on the page too: the chart takes its wrapper's height, which is WALL_CHART_H at least and more on a tall screen */
  const chart = <WallChart bars={bars} wall={wall} spot={board.spot} inSession={clock.inSession} minutesLeft={board.minutesLeft} roleInk={ink} height={WALL_CHART_H} fill />;

  if (bare)
    return (
      <section className="relative h-full flex flex-col min-w-0" data-wall-band data-bare>
        {reach}
        <div className="flex-1 min-h-0 flex flex-col px-3 pb-2">{chart}</div>
        <p className="shrink-0 px-3 py-2 border-t border-ink/[0.06] text-[11px] leading-snug text-textSecondary" data-wall-sentence>
          <span className="line-clamp-2">{wall.sentence}</span>
        </p>
      </section>
    );

  return (
    <section className="relative flex-grow flex flex-col min-w-0" data-wall-band>
      <GuideFocus open={guideOpen} onClose={() => setGuideOpen(false)} title="How to read the wall" testId="wall-guide" viewport>
        <WallGuide board={board} clock={clock} />
      </GuideFocus>

      {/* THE HEAD — the name of the wall is the sub line; the list below is the picker */}
      <div className="px-5 pt-4 pb-3 flex items-start gap-6 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-[15px] font-semibold leading-tight text-textPrimary">At the wall</h3>
            {scope}
            <GuideDoor open={guideOpen} onClick={() => setGuideOpen(v => !v)} title="What the two zones, the dots and the reasons mean" testId="wall-guide" />
          </div>
          <p className="mt-0.5 text-[11px] text-textMuted" data-wall-name>
            <span className="font-mono font-semibold tnum" style={{ color: ink }}>
              {fmtStrike(wall.strike)}
            </span>{' '}
            · {nameOf(wall)} · ${Math.abs(dist).toFixed(2)} {dist >= 0 ? 'above' : 'below'} price · model odds, not a forecast
          </p>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-widest text-textMuted whitespace-nowrap pt-1" data-wall-updated>
          {ticker} · updated {updatedAt} · every 10s
        </span>
      </div>

      {/* THE BOX GROWS WITH THE SCREEN (2026-10-11): the extra height goes to this row — the chart takes it on the left,
          the reasons spread to meet it on the right; the stack and the sentence below keep their height */}
      <div className="flex-grow grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* THE VERDICT — does it get there, and the two zones on today's price */}
        <div className="px-5 pb-4 min-w-0 flex flex-col">
          {reach}
          <div className="flex-grow flex flex-col" style={{ minHeight: WALL_CHART_H }}>
            {chart}
          </div>
          <div className="pt-2 flex items-center gap-x-5 gap-y-1 flex-wrap text-[11px] text-textMuted" data-wall-key>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: SILVER }} /> tested and held
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: WARM }} /> tested and broke
            </span>
            <span>the two zones start at now{clock.inSession ? ' and run to the close' : ' and stand for the next session'}</span>
          </div>
        </div>

        {/* WHY — a tug of war */}
        <div className="px-5 pb-4 min-w-0 flex flex-col xl:border-l border-ink/[0.06] max-xl:border-t max-xl:pt-3" data-wall-reasons>
          <div className="text-[11px] text-textMuted pb-2">Why · what pushes each way, strongest first</div>
          <div className="grid grid-cols-2 font-mono text-[11px] uppercase tracking-widest pb-1">
            <span className="text-right pr-2.5" style={{ color: WARM }}>
              ← toward a break
            </span>
            <span className="pl-2.5" style={{ color: SILVER }}>
              toward a hold →
            </span>
          </div>
          <div key={wall.strike} className="animate-fade-in flex-grow flex flex-col">
            {reasons.map(f => {
              const flat = Math.abs(f.push) < 0.04 || !isWall;
              return (
                <div key={f.key} className="flex-1 border-t border-ink/[0.06] flex flex-col justify-center" style={{ minHeight: WALL_REASON_H }} title={f.words} data-wall-factor={f.key} data-push={f.push.toFixed(2)}>
                  <div className="flex items-baseline justify-between gap-3 min-w-0">
                    <span className="text-[12px] text-textPrimary whitespace-nowrap">{reasonName(f.label)}</span>
                    <span className="min-w-0 truncate font-mono text-[11px] tnum text-textMuted text-right">{f.fact}</span>
                  </div>
                  <div className="relative h-[7px] mt-1.5">
                    <span className="absolute left-1/2 -top-[3px] -bottom-[3px] w-px bg-ink/25" />
                    {flat ? (
                      <span className="absolute inset-y-0 w-[6px] rounded-full bg-ink/25" style={{ left: 'calc(50% - 3px)' }} />
                    ) : (
                      <span className="absolute inset-y-0 rounded-full" style={{ ...(f.push < 0 ? { right: '50%' } : { left: '50%' }), width: `${Math.min(1, Math.abs(f.push)) * 50}%`, background: f.push < 0 ? WARM : SILVER, transition: `width 520ms ${EASE}` }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* EVERY WALL — the stack; the row in hand wears the silver edge */}
      <div className="overflow-x-auto border-t border-ink/[0.06]" data-wall-stack={stack.length}>
        <div className="min-w-[920px]">
          <div className="grid items-center gap-x-4 px-5 font-mono text-[11px] uppercase tracking-widest text-textMuted" style={{ gridTemplateColumns: WALL_STACK_COLUMNS, height: WALL_STACK_HEAD_H }}>
            <span>Every wall</span>
            <span>{clock.inSession ? 'Gets there' : 'Gets there next session'}</span>
            <span>Holds if reached</span>
            <span>If it breaks</span>
            <span>If it holds</span>
            <span>Tested today</span>
          </div>
          {stack.map(w => {
            const on = Math.abs(w.strike - wall.strike) < 1e-9;
            const tag = w.strike === board.weakest ? 'weakest' : w.strike === board.strongest ? 'strongest' : null;
            const drawSpot = !spotDrawn && w.strike < board.spot;
            if (drawSpot) spotDrawn = true;
            const real = w.weight > 0;
            return (
              <Fragment key={w.strike}>
                {drawSpot && (
                  <div className="px-5 flex flex-col justify-center border-t border-ink/[0.06]" style={{ height: WALL_SPOT_H }} data-wall-spot>
                    <SpotRule ticker={ticker} price={board.spot} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onPick(w.strike)}
                  className={`w-full grid items-center gap-x-4 px-5 border-t border-ink/[0.06] text-left transition-colors ${on ? 'bg-silver/[0.07]' : 'hover:bg-ink/[0.04]'}`}
                  style={{ gridTemplateColumns: WALL_STACK_COLUMNS, height: WALL_STACK_ROW_H, boxShadow: on ? `inset 2px 0 0 0 ${SILVER}` : undefined }}
                  title={on ? `${fmtStrike(w.strike)} is the wall shown above` : `Show ${fmtStrike(w.strike)} above`}
                  data-wall-row={w.strike}
                  data-wall-on={on || undefined}
                  data-tag={tag ?? undefined}
                >
                  <span className="flex items-baseline gap-2 min-w-0 whitespace-nowrap">
                    <span className="font-mono text-[14px] font-semibold tnum text-textPrimary">{fmtStrike(w.strike)}</span>
                    <span className="text-[11px] uppercase tracking-widest" style={{ color: inkOf(w) }}>
                      {nameOf(w)}
                    </span>
                    {tag && <span className="text-[11px] uppercase tracking-widest text-textMuted">{tag}</span>}
                  </span>
                  <Mini share={w.reach} words={pct(w.reach)} ink={SILVER} />
                  {real ? <Mini share={w.hold} words={pct(w.hold)} ink={w.hold >= 0.5 ? SILVER : WARM} /> : <span className="text-[11px] text-textMuted">not a wall</span>}
                  <span className="min-w-0 truncate text-[12px] text-textSecondary">{w.breakPath.to != null ? `runs to ${fmtStrike(w.breakPath.to)}${w.breakPath.pocket ? ' · almost nothing in between' : ''}` : 'no shelf behind it'}</span>
                  <span className="min-w-0 truncate text-[12px] text-textSecondary">{real ? (w.holdPath.to != null ? `back toward ${fmtStrike(w.holdPath.to)}` : 'price turns back') : '—'}</span>
                  <span className={`font-mono text-[11px] tnum whitespace-nowrap ${w.touches === 0 ? 'text-textMuted' : 'text-textPrimary'}`}>{w.touches === 0 ? 'not yet' : `${w.touches}× · held ${Math.max(0, w.touches - w.breaks)} · broke ${w.breaks}`}</span>
                </button>
              </Fragment>
            );
          })}
          {!spotDrawn && (
            <div className="px-5 flex flex-col justify-center border-t border-ink/[0.06]" style={{ height: WALL_SPOT_H }} data-wall-spot>
              <SpotRule ticker={ticker} price={board.spot} />
            </div>
          )}
        </div>
      </div>

      <p className="px-5 py-3.5 border-t border-ink/[0.06] text-[12px] leading-relaxed text-textSecondary min-h-[58px]" data-wall-sentence>
        {wall.sentence}
      </p>
    </section>
  );
};

export default AtTheWall;
