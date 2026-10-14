/*
==================================================
  SLAYER TERMINAL - THE DAY BOX'S CHARTS
  (components/gex/dayChart.ts)

  The tape and the book through the day, drawn by
  the chart library the way Compare's "Since the
  open" is (the owner, 2026-10-14: "i need charts
  that look that clean in the map page for the day
  and the book charts … study it really good"). What
  that chart is, taken whole:

    · the library's own canvas — its lines, its
      crosshair, its axis labels — never a hand-
      drawn SVG over it;
    · no grid at all; the price scale on the right
      with the live value in a chip; the clock along
      the foot, the hours in weight;
    · the page's own ground (the dark panel, or the
      paper's), the figure surface's quiet inks;
    · the same face and size for every word on it.

  The two charts stand one over the other and share
  one clock: the same price-scale width on both, so
  their plots end on the same pixel, and the same
  minutes from the first bar to the close, so a
  minute is one x on both.
==================================================
*/

import type { DeepPartial, ISeriesApi, LineData, SeriesType, Time, TimeChartOptions, UTCTimestamp } from 'lightweight-charts';
import { DARK_FIGURE_SURFACE } from './candleTheme';
import { readToken } from '../../theme/theme';
import { fmtClockLocal, nyTickMarks } from './chartTime';

/** Both charts' price-scale width — their plots end on the same pixel, so a minute is one x on both */
export const DAY_SCALE_W = 76;

export interface DaySurface {
  bg: string;
  text: string;
  line: string;
  crosshair: string;
  label: string;
  /** The page's first ink, resolved — the price line */
  ink: string;
  /** The zero line's ink */
  zero: string;
}

/** The figure surface, read off the box the chart sits in (a canvas cannot read a token) — Compare's own */
export function daySurface(host: HTMLElement, paper: boolean): DaySurface {
  const bg = readToken('--panel', undefined, host);
  const ink = readToken('--text-primary', undefined, host);
  if (paper) return { bg, text: readToken('--text-secondary', undefined, host), line: readToken('--ink', 0.16, host), crosshair: readToken('--ink', 0.4, host), label: readToken('--text-primary', undefined, host), ink, zero: readToken('--ink', 0.32, host) };
  return { bg, text: DARK_FIGURE_SURFACE.text, line: DARK_FIGURE_SURFACE.line, crosshair: DARK_FIGURE_SURFACE.crosshair, label: DARK_FIGURE_SURFACE.label, ink, zero: 'rgba(255,255,255,0.22)' };
}

/** The chart's options: Compare's, on New York's clock, the clock along the foot only where it is asked for */
export function dayChartOptions(s: DaySurface, opts: { clock: boolean; logo: boolean }): DeepPartial<TimeChartOptions> {
  return {
    autoSize: true,
    layout: { background: { color: s.bg }, textColor: s.text, fontFamily: "'Inter', sans-serif", fontSize: 10, attributionLogo: opts.logo },
    localization: { timeFormatter: (t: Time) => fmtClockLocal(t, 'ny') },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    /* whole figures only on the scale: the top tick's figure sat half under the pane's edge */
    rightPriceScale: { borderColor: s.line, minimumWidth: DAY_SCALE_W, entireTextOnly: true, scaleMargins: { top: 0.1, bottom: 0.08 } },
    timeScale: {
      visible: opts.clock,
      borderColor: s.line,
      timeVisible: true,
      secondsVisible: false,
      rightOffset: 0,
      fixLeftEdge: true,
      fixRightEdge: true,
      lockVisibleTimeRangeOnResize: true,
      tickMarkFormatter: nyTickMarks,
    },
    crosshair: {
      vertLine: { color: s.crosshair, labelBackgroundColor: s.label },
      horzLine: { color: s.crosshair, labelBackgroundColor: s.label },
    },
    handleScroll: false,
    handleScale: false,
  };
}

/** The epoch second at a New York minute of the session's day, off its first bar */
export const dayStartOf = (firstTime: number, firstMin: number): number => firstTime - firstMin * 60;

/** Every minute from the axis' first to its last — the clock both charts share, whether or not a bar has come yet (the
    replay's boxes hold still: the axis is the session, not the bars so far). REAL POINTS, on a hidden series and a scale
    of its own (CLOCK_SCALE): this library leaves whitespace-only data out of the clock, and in a replay the book's axis
    ended on the replayed minute while the tape's ran to the close. A hidden series is never drawn, never snapped to. */
export const CLOCK_SCALE = 'clock';
export function dayClock(dayStart: number, from: number, to: number): LineData<Time>[] {
  const out: LineData<Time>[] = [];
  for (let m = from; m <= to; m++) out.push({ time: (dayStart + m * 60) as UTCTimestamp, value: 0 });
  return out;
}

/** THE NEWEST MINUTE, NOT THE WHOLE DAY: a tick moves the last point, a new minute adds one — the rest of the series is
    never handed over again (the paying user's "make sure its all running fast"). Anything else — a replay scrubbed back,
    a new name — sets the whole series. */
export function feedSeries<T extends { time: Time }>(series: ISeriesApi<SeriesType>, next: readonly T[], prev: { current: readonly T[] | null }): void {
  const p = prev.current;
  if (p && p.length > 0 && next.length > 0 && p[0].time === next[0].time && (next.length === p.length || next.length === p.length + 1)) {
    if (next.length === p.length + 1) series.update(next[next.length - 2] as never);
    series.update(next[next.length - 1] as never);
  } else {
    series.setData(next as never);
  }
  prev.current = next;
}
