/*
==================================================
  SLAYER TERMINAL - THE RANGE
  (components/gex/AheadCorridor.tsx)

  Band 1 of the Ahead page, and the Pulse desk's
  Range tile. REDRAWN AS A TIMETABLE (Noah,
  2026-09-30, on the price scale with its posts and
  the half-hour pane under it: "unappealing and
  confusing to look at and understand … i truly need
  a new design structure … i do not want the prev
  eclipse looking chart"; he picked "the timetable"
  from the cuts shown):

    A ROW A HALF HOUR   from now to the close. Read
                        down it like a schedule.
    THE BAR             how far price can get BY
                        then — one expected move for
                        the minutes gone, stopped at
                        a wall the moment the move
                        reaches it. The last row is
                        the answer for the close.
    THE THREE LINES     the floor, the lid and price
                        now, down every row. The row
                        where a bar first touches a
                        line is when that edge comes
                        into reach.
    WHAT DEALERS TRADE  beside each row: the stock
                        they must buy or sell in
                        that half hour to stay
                        hedged — a bar and a figure.
    ONE READ LINE       the row under the pointer in
                        a sentence; at rest, the
                        answer for the close.

  What it replaced: a price scale with posts and
  names in three rows, a bracket, a 210px pane of
  thirteen bars, four head facts and three
  paragraphs — four questions in one box and none of
  them leading. Nothing here is a cone, a fan or a
  band on a chart (the research he asked for agrees:
  widening shapes are misread).

  The vol scenario is the one card on the head; it
  says its line only while a move is picked. The
  model's own sentences live in the guide.
==================================================
*/

import { useMemo, useState, type ReactNode } from 'react';
import DropdownSelect from '../ui/DropdownSelect';
import GuideFocus, { GuideDoor } from '../ui/GuideFocus';
import { CorridorGuide } from './AheadGuide';
import { CALL_WALL, PUT_WALL } from './paletteInk';
import { CLOSE_MIN, VOL_OPTIONS, fmtDollars, fmtPrice, fmtStrike, hhmm, type AheadClock, type ConePoint, type Corridor, type Schedule, type ScheduleBlock, type VolPoints } from '../../data/ahead';
import type { ExposureLevels } from '../../types/gex';
import type { Candle } from '../../types/market';

const SILVER = 'rgb(var(--silver))';
const GLIDE = '520ms cubic-bezier(0.16, 1, 0.3, 1)';
const verbOf = (flow: number) => (flow >= 0 ? 'buy' : 'sell');

interface Props {
  corridor: Corridor;
  schedule: Schedule;
  levels: ExposureLevels;
  ticker: string;
  clock: AheadClock;
  /** The shared strike, when it belongs to this name */
  focus?: number | null;
  onPick?: (price: number) => void;
  scope?: ReactNode;
  /** ON A PULSE TILE: the table and one read, nothing else — no title, no door, no vol card */
  bare?: boolean;
  /** Today's one-minute bars for the name (a tile hands them): with them the tile shows THE WHOLE DAY — the half hours
      already gone stand above the ones ahead, each with what price did in it */
  bars?: readonly Candle[];
  /** THE VOL SCENARIO — the one card on the head */
  volPoints: VolPoints;
  onVolPoints: (p: VolPoints) => void;
}

interface Row {
  block: ScheduleBlock;
  /** The label: the half hour's end, or "The close" */
  by: string;
  last: boolean;
  low: number;
  high: number;
  /** The half hour is over: `low`/`high` are what price traded, not how far it can get */
  done?: boolean;
}

const AheadCorridor = ({ corridor, schedule, levels, ticker, clock, focus, onPick, scope, bare = false, bars, volPoints, onVolPoints }: Props) => {
  const [guideOpen, setGuideOpen] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const { spot, likely, cone, flip, fastSide } = corridor;
  const { blocks, toClose, biggest, vol } = schedule;
  const floor = likely.low.price;
  const lid = likely.high.price;
  const floorIsWall = likely.low.why === 'the put wall';
  const lidIsWall = likely.high.why === 'the call wall';

  /* THE ROWS — the half hours still ahead, each with how far price can get by its end */
  const ahead = useMemo<Row[]>(() => {
    const at = (min: number): ConePoint | null => cone.find(c => c.min >= min) ?? cone[cone.length - 1] ?? null;
    return blocks
      .filter(b => !b.past)
      .map(b => {
        const c = at(b.to);
        return { block: b, by: b.to >= CLOSE_MIN ? 'The close' : hhmm(b.to), last: b.to >= CLOSE_MIN, low: c?.lo1 ?? floor, high: c?.hi1 ?? lid };
      });
  }, [blocks, cone, floor, lid]);

  /* …AND, ON A TILE, THE ONES ALREADY GONE (Noah, 2026-10-02, of the tile late in a session — two rows and an empty
     box under them: "take a look at the range card, and the sheer amount of space"). The tile is the whole day: a half
     hour that is over stands as a quiet row with WHAT PRICE DID in it — its low to its high, off today's own bars — and
     the ones ahead follow with how far it can get. So the tile is full from the open to the bell, and the eye sees the
     day so far against the same floor and lid. A bar's minute is counted back from now (the last bar is this minute). */
  const nowMin = clock.inSession ? clock.nowMin : null;
  const lastBar = bars?.length ? bars[bars.length - 1].time : 0;
  const lastBarMin = bars?.length ? Math.floor(lastBar / 60) : 0;
  const gone = useMemo<Row[]>(() => {
    if (!bare || !bars?.length || nowMin == null) return [];
    const minOf = (t: number) => nowMin - (lastBar - t) / 60;
    return blocks
      .filter(b => b.past)
      .flatMap(b => {
        let low = Infinity;
        let high = -Infinity;
        for (const c of bars) {
          const m = minOf(c.time);
          if (m < b.from || m >= b.to) continue;
          if (c.low < low) low = c.low;
          if (c.high > high) high = c.high;
        }
        return Number.isFinite(low) ? [{ block: b, by: hhmm(b.to), last: false, low, high, done: true }] : [];
      });
    // the bars grow a bar a minute: the rows are re-read on the minute, not on every tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bare, blocks, nowMin, lastBarMin]);
  const rows = useMemo(() => [...gone, ...ahead], [gone, ahead]);

  /* THE SCALE: the floor to the lid, with room each side for their names — nothing is drawn past the two edges, so the
     bars get most of the lane (the first cut ran the scale two expected moves out and left the bars in its middle third) */
  const { lo, hi } = useMemo(() => {
    const a = Math.min(floor, spot);
    const b = Math.max(lid, spot);
    const pad = Math.max((b - a) * 0.24, 0.01);
    /* a half hour that traded outside today's floor and lid still has its bar on the lane */
    const dayLow = gone.length ? Math.min(...gone.map(r => r.low)) : a;
    const dayHigh = gone.length ? Math.max(...gone.map(r => r.high)) : b;
    return { lo: Math.min(a - pad, dayLow - pad * 0.25), hi: Math.max(b + pad, dayHigh + pad * 0.25) };
  }, [floor, lid, spot, gone]);
  const pos = (p: number) => ((p - lo) / (hi - lo || 1)) * 100;
  const flipIn = flip != null && flip > lo && flip < hi;

  /* WHEN AN EDGE COMES INTO REACH — the first five minutes the bar's end IS the wall; nothing for a touch at the bell alone */
  const reachAt = (wall: number, key: 'hi1' | 'lo1'): number | null => {
    const hit = cone.find((c, i) => i > 0 && Math.abs(c[key] - wall) < 1e-6);
    return hit && hit.min < CLOSE_MIN ? hit.min : null;
  };
  const lidAt = lidIsWall ? reachAt(levels.callWall, 'hi1') : null;
  const floorAt = floorIsWall ? reachAt(levels.putWall, 'lo1') : null;

  const maxFlow = Math.max(1, ...ahead.map(r => Math.abs(r.block.flow)));
  const allSell = ahead.length > 0 && ahead.every(r => r.block.flow <= 0);
  const allBuy = ahead.length > 0 && ahead.every(r => r.block.flow >= 0);
  const flowHead = allSell ? 'Dealers must sell' : allBuy ? 'Dealers must buy' : 'Dealers must trade';
  const flowWords = (b: ScheduleBlock) => `dealers must ${verbOf(b.flow)} ${fmtDollars(b.flow)} of stock to stay hedged`;

  /* THE ONE READ — the row under the pointer; at rest, the answer for the close */
  const when = clock.inSession ? 'By the close' : 'Next session, by the close';
  const reachWords = (() => {
    const parts: string[] = [];
    if (lidAt != null) parts.push(`the lid is in reach from ${hhmm(lidAt)}`);
    if (floorAt != null) parts.push(`the floor from ${hhmm(floorAt)}`);
    if (!parts.length) return '';
    const s = parts.join(', ');
    return ` ${s[0].toUpperCase()}${s.slice(1)}.`;
  })();
  const flowAll =
    Math.abs(toClose) > 0
      ? ` Dealers must ${verbOf(toClose)} about ${fmtDollars(toClose)} of stock ${clock.inSession ? 'into the close' : 'over the session'} to stay hedged${biggest ? `, most of it ${hhmm(biggest.from)} to ${hhmm(biggest.to)}` : ''}, ${toClose < 0 ? 'a headwind for any rally' : 'a cushion under any dip'}.`
      : '';
  const hovered = hover != null ? rows.find(r => r.block.to === hover) ?? null : null;
  const read: ReactNode = hovered?.done ? (
    <>
      From <b className="text-textPrimary font-semibold">{hhmm(hovered.block.from)}</b> to <b className="text-textPrimary font-semibold">{hovered.by}</b> price traded between <b className="font-mono tnum text-textPrimary font-semibold">{fmtPrice(hovered.low)}</b> and{' '}
      <b className="font-mono tnum text-textPrimary font-semibold">{fmtPrice(hovered.high)}</b>.
    </>
  ) : hovered ? (
    <>
      By <b className="text-textPrimary font-semibold">{hovered.last ? 'the close' : hovered.by}</b> price can be between <b className="font-mono tnum text-textPrimary font-semibold">{fmtPrice(hovered.low)}</b> and <b className="font-mono tnum text-textPrimary font-semibold">{fmtPrice(hovered.high)}</b>. In that half hour {flowWords(hovered.block)}.
    </>
  ) : (
    <>
      {when} price most likely sits between <b className="font-mono tnum text-textPrimary font-semibold">{fmtPrice(floor)}</b> and <b className="font-mono tnum text-textPrimary font-semibold">{fmtPrice(lid)}</b>.{reachWords}
      {!bare && flowAll}
    </>
  );

  const rowH = bare ? 24 : 28;
  /* a tile and a phone give the lane the room: a narrower time column and a narrower flow column */
  const cols = bare ? 'grid-cols-[52px_minmax(0,1fr)_minmax(84px,0.34fr)]' : 'grid-cols-[52px_minmax(0,1fr)_92px] sm:grid-cols-[72px_minmax(0,1fr)_minmax(140px,0.3fr)]';
  const floorInk = floorIsWall ? PUT_WALL : SILVER;
  const lidInk = lidIsWall ? CALL_WALL : SILVER;
  /* the three lines every row carries: the floor, the lid, price now — and the flip, faint */
  const lines = (
    <>
      <i className="absolute inset-y-0 w-px opacity-80" style={{ left: `${pos(floor)}%`, background: floorInk, transition: `left ${GLIDE}` }} />
      <i className="absolute inset-y-0 w-px opacity-80" style={{ left: `${pos(lid)}%`, background: lidInk, transition: `left ${GLIDE}` }} />
      {flipIn && <i className="absolute inset-y-0 w-0 border-l border-dashed border-ink/20" style={{ left: `${pos(flip!)}%`, transition: `left ${GLIDE}` }} />}
      <i className="absolute inset-y-0 w-0 border-l border-dotted border-textPrimary/60" style={{ left: `${pos(spot)}%`, transition: `left ${GLIDE}` }} />
    </>
  );
  const kept = (p: number) => focus != null && Math.abs(focus - p) < 1e-9;
  const edgeLabel = (p: number, word: string, ink: string, side: 'left' | 'right', isWall: boolean) => {
    const cls = `absolute top-0 whitespace-nowrap font-mono text-[11px] font-semibold tnum ${isWall && onPick ? 'cursor-pointer hover:underline underline-offset-2' : ''}`;
    const style = { left: `${pos(p)}%`, color: ink, transform: side === 'left' ? 'translateX(calc(-100% - 6px))' : 'translateX(6px)', transition: `left ${GLIDE}` };
    const body = (
      <>
        {fmtStrike(p)} <span className="font-sans font-normal text-[11px]">{word}</span>
        {kept(p) && <span className="ml-1 font-sans font-normal text-[11px] text-silver">kept</span>}
      </>
    );
    return isWall && onPick ? (
      <button type="button" onClick={() => onPick(p)} className={cls} style={style} title={kept(p) ? `${fmtStrike(p)} is kept — click to let go` : `Keep ${fmtStrike(p)}`} data-range-edge={word.split(' ')[0]}>
        {body}
      </button>
    ) : (
      <span className={cls} style={style} data-range-edge={word.split(' ')[0]}>
        {body}
      </span>
    );
  };

  return (
    <section className={`relative flex flex-col min-w-0 ${bare ? 'h-full' : ''}`} data-corridor-band data-bare={bare || undefined}>
      {!bare && (
        <>
          <GuideFocus open={guideOpen} onClose={() => setGuideOpen(false)} title="How to read the range" testId="corridor-guide" viewport>
            <CorridorGuide corridor={corridor} schedule={schedule} levels={levels} clock={clock} />
          </GuideFocus>
          <div className="px-5 pt-4 pb-2 flex items-start gap-6 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-[15px] font-semibold leading-tight text-textPrimary">The range</h3>
                {scope}
                <GuideDoor open={guideOpen} onClick={() => setGuideOpen(v => !v)} title="What the rows, the bars and the lines mean" testId="corridor-guide" />
              </div>
              <p className="mt-0.5 text-[11px] text-textMuted">{clock.inSession ? 'From now to the close' : 'The next session'} · how far price can get by each half hour, and what dealers must trade in it</p>
            </div>
            <DropdownSelect label="If vol" value={volPoints} options={VOL_OPTIONS} onChange={onVolPoints} title="A vol move as a scenario — the stock it makes dealers buy or sell" testId="if-vol" align="end" />
          </div>
        </>
      )}

      {/* THE TABLE — the head carries the scale's three names; the rows scroll inside a tile */}
      {/* ON A TILE THE ROWS SHARE THE BOX: each takes an equal part of the height left under the head (never under 18px —
          then the list scrolls — and never over 40), so the table ends where the tile does */}
      <div className={`${bare ? 'flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 flex flex-col' : 'px-5 pb-1'}`} onPointerLeave={() => setHover(null)} data-range-table={rows.length} data-range-gone={gone.length || undefined}>
        <div className={`grid ${cols} gap-x-4 items-end ${bare ? 'sticky top-0 z-[1] bg-panel shrink-0' : ''} h-[42px] pb-1.5`}>
          <span className="font-mono text-[11px] uppercase tracking-widest text-textMuted">By</span>
          <div className="relative h-[30px]" data-range-axis>
            {edgeLabel(floor, floorIsWall ? 'floor · put wall' : 'floor', floorInk, 'left', floorIsWall)}
            {edgeLabel(lid, lidIsWall ? 'lid · call wall' : 'lid', lidInk, 'right', lidIsWall)}
            <span className="absolute bottom-0 -translate-x-1/2 whitespace-nowrap font-mono text-[11px] font-semibold tnum text-textPrimary" style={{ left: `${pos(spot)}%`, transition: `left ${GLIDE}` }} data-range-spot>
              {fmtPrice(spot)}
            </span>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-textMuted whitespace-nowrap">{flowHead}</span>
        </div>
        {rows.map(r => {
          const on = hover === r.block.to;
          const soft = hover != null && !on;
          const sell = r.block.flow < 0;
          const share = Math.abs(r.block.flow) / maxFlow;
          return (
            <div
              key={r.block.to}
              className={`grid ${cols} gap-x-4 items-center rounded transition-[background-color,opacity] duration-150 ${on ? 'bg-ink/[0.045]' : ''} ${bare ? 'flex-1 min-h-[18px] max-h-[40px]' : ''}`}
              style={{ height: bare ? undefined : rowH, opacity: soft ? 0.55 : 1 }}
              onPointerEnter={() => setHover(r.block.to)}
              title={r.done ? `${hhmm(r.block.from)} to ${r.by}: traded ${fmtPrice(r.low)} to ${fmtPrice(r.high)}` : `By ${r.last ? 'the close' : r.by}: between ${fmtPrice(r.low)} and ${fmtPrice(r.high)} · ${flowWords(r.block)}`}
              data-range-row={r.block.to}
              data-range-done={r.done || undefined}
              data-range-current={r.block.current || undefined}
            >
              <span className={`pl-1 font-mono text-[12px] tnum whitespace-nowrap transition-colors ${r.done ? (on ? 'text-textSecondary' : 'text-textMuted') : r.last || on ? 'font-semibold text-textPrimary' : 'text-textSecondary'}`}>{r.by}</span>
              <div className="relative h-full" data-range-lane>
                {lines}
                {r.done ? (
                  /* what price DID in a half hour that is over: an outline, not a filled bar — it is a record, not a reach */
                  <i
                    className="absolute top-1/2 -translate-y-1/2 h-[8px] rounded-full border"
                    style={{ left: `${pos(r.low)}%`, width: `max(4px, ${pos(r.high) - pos(r.low)}%)`, borderColor: SILVER, opacity: on ? 0.8 : 0.4, transition: 'opacity 160ms ease-out' }}
                    data-range-traded={`${fmtPrice(r.low)}:${fmtPrice(r.high)}`}
                  />
                ) : (
                  /* how far price can get by then — it glides to its new ends on a sweep */
                  <i
                    className="absolute top-1/2 -translate-y-1/2 h-[12px] rounded-full"
                    style={{ left: `${pos(r.low)}%`, width: `max(4px, ${pos(r.high) - pos(r.low)}%)`, background: SILVER, opacity: r.last ? 0.9 : on ? 0.6 : 0.32, transition: `left ${GLIDE}, width ${GLIDE}, opacity 160ms ease-out` }}
                    data-range-bar={`${fmtPrice(r.low)}:${fmtPrice(r.high)}`}
                  />
                )}
                {/* the row under the pointer says its two ends, where the eye is */}
                {on && (
                  <>
                    <span className="absolute top-1/2 -translate-y-1/2 font-mono text-[11px] tnum text-textPrimary whitespace-nowrap" style={{ left: `${pos(r.low)}%`, transform: 'translate(calc(-100% - 6px), -50%)' }}>
                      {fmtPrice(r.low)}
                    </span>
                    <span className="absolute top-1/2 font-mono text-[11px] tnum text-textPrimary whitespace-nowrap" style={{ left: `${pos(r.high)}%`, transform: 'translate(6px, -50%)' }}>
                      {fmtPrice(r.high)}
                    </span>
                  </>
                )}
              </div>
              {r.done ? (
                <span className="min-w-0 truncate font-mono text-[11px] tnum text-textMuted" data-range-was>
                  traded {fmtPrice(r.low)}–{fmtPrice(r.high)}
                </span>
              ) : (
                <span className="flex items-center gap-2 min-w-0 font-mono text-[11px] tnum">
                  <i className="h-[6px] rounded-full shrink-0" style={{ width: `${Math.max(3, share * 58)}%`, background: sell ? PUT_WALL : CALL_WALL, opacity: 0.8, transition: `width ${GLIDE}, background-color ${GLIDE}` }} data-range-flow={sell ? 'sell' : 'buy'} />
                  <span className="font-semibold whitespace-nowrap text-textPrimary">
                    {!allSell && !allBuy && <span className="font-normal text-textMuted">{verbOf(r.block.flow)} </span>}
                    {fmtDollars(r.block.flow)}
                  </span>
                </span>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <div className="h-[84px] grid place-items-center text-[11px] text-textMuted">The session has closed — the next one's half hours stand here from the open.</div>}
        {!bare && flipIn && (
          <p className="pt-2 pb-1 flex items-center gap-2 text-[11px] text-textMuted" data-range-key>
            <i className="inline-block h-3 w-0 border-l border-dashed border-ink/40" /> the flip, {fmtStrike(flip!)} · {fastSide === 'below' ? 'below it moves run, above it they slow' : fastSide === 'above' ? 'above it moves run, below it they slow' : 'dealers slow moves above it and push them along below it'}
          </p>
        )}
      </div>

      {/* ONE READ LINE — a fixed height on the page, so the box does not move as the pointer does */}
      <div className={bare ? 'shrink-0 px-3 py-2 border-t border-ink/[0.06] text-[11px] leading-snug text-textSecondary' : 'mx-5 mt-1 mb-4 pt-3 border-t border-ink/[0.06] min-h-[52px] text-[12px] leading-relaxed text-textSecondary'} data-tile-read={bare ? 'range' : undefined} data-range-read>
        <span className={bare ? 'line-clamp-2' : undefined}>{read}</span>
        {/* the vol move, said only while one is picked */}
        {!bare && vol && (
          <span className="block mt-1" data-vol-sentence>
            {vol.sentence}
          </span>
        )}
      </div>
      <span className="sr-only" data-corridor-ticker={ticker} />
    </section>
  );
};

export default AheadCorridor;
