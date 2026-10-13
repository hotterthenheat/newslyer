/*
==================================================
  SLAYER TERMINAL - THE WALL ON TODAY'S PRICE
  (components/gex/WallChart.tsx)

  At the wall's instrument (Noah, 2026-09-30 — the
  beam, the reasons table and the sideways paths
  were "unappealing and confusing"; he picked this
  cut): today's price as a line, and AHEAD OF NOW
  the wall's two outcomes as two plain boxes on the
  wall's own price —

    BREAKS   from the wall to where a break runs
    HOLDS    from the wall back to where a hold
             sends price

  each as tall as the distance, with its odds and
  its words inside. The shape is the one every
  trader has drawn with a long or short position
  tool. Where price tested the wall today there is
  a dot ON the line: silver where it held, warm
  where it broke. The wall itself is a line from its
  first test (or from now) into the zones, never
  across the whole day.

  On lightweight-charts like every chart in the
  house (the library's crosshair and axes; the zones
  are a primitive on its canvas —
  wallZonesPrimitive.ts). A card rides the
  crosshair: a minute gone says the price and how
  far it was from the wall; a point ahead says the
  outcome under it.

  TWO TRAPS the reverted Ahead chart taught, kept
  here: the library drops trailing whitespace, so
  the room ahead of now is carried by a transparent
  HOLDER series with a point a minute; and a fit
  right after setData can slip, so it is fitted
  again a frame later and on every resize.
==================================================
*/

import { useEffect, useMemo, useRef, useState } from 'react';
import { LineSeries, createChart, type IChartApi, type IPriceLine, type ISeriesApi, type Time, type UTCTimestamp } from 'lightweight-charts';
import { DARK_FIGURE_SURFACE } from './candleTheme';
import { fmtClockLocal, localTickMarks } from './chartTime';
import { THERMAL_WARM, alpha, resolveInk } from './paletteInk';
import { WallZonesPrimitive, type WallZone } from './wallZonesPrimitive';
import { readToken, useResolvedTheme } from '../../theme/theme';
import { fmtDollars, fmtStrike } from '../../data/ahead';
import type { WallOdds } from '../../data/wall';
import type { Candle } from '../../types/market';

const SILVER = 'rgb(var(--silver))';
const CARD_W = 214;
const CARD_H = 64;

/** "6 in 10" — odds said the way they are read right (a bare percent is misread; the percent rides beside it) */
export const inTen = (p: number) => Math.max(0, Math.min(10, Math.round(p * 10)));

export interface WallTest {
  time: number;
  price: number;
  kind: 'held' | 'broke';
}
/** Today's tests of a strike: a run of bars that touched it is ONE test, marked where the run ended; a close beyond it is a
    break (the level report's own rule, a mark a test instead of a tick a bar) */
export function wallTests(bars: readonly Candle[], strike: number, side: 'call' | 'put'): WallTest[] {
  const out: WallTest[] = [];
  let run: Candle | null = null;
  let touches = 0;
  let broken = false;
  for (const b of bars) {
    const touched = b.low <= strike && b.high >= strike;
    const beyond = side === 'call' ? b.close > strike : b.close < strike;
    if (touched) touches++;
    if (beyond && !broken) {
      if (touches > 0) out.push({ time: b.time, price: b.close, kind: 'broke' });
      broken = true;
      run = null;
      continue;
    }
    if (!beyond) broken = false;
    if (touched && !beyond) run = b;
    else if (run) {
      out.push({ time: run.time, price: run.close, kind: 'held' });
      run = null;
    }
  }
  if (run) out.push({ time: run.time, price: run.close, kind: 'held' });
  return out.slice(-14);
}

interface Props {
  bars: readonly Candle[];
  wall: WallOdds;
  spot: number;
  inSession: boolean;
  minutesLeft: number;
  /** A fixed height — or `fill`, and the chart takes its parent's */
  height?: number;
  fill?: boolean;
  roleInk: string;
}

const WallChart = ({ bars: allBars, wall, spot, inSession, minutesLeft, height = 280, fill = false, roleInk }: Props) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const holderRef = useRef<ISeriesApi<'Line'> | null>(null);
  const zonesRef = useRef<WallZonesPrimitive | null>(null);
  const tagRef = useRef<IPriceLine | null>(null);
  const [hover, setHover] = useState<{ time: number; price: number; left: number; top: number } | null>(null);
  /* a narrow plot (a phone, a small tile) shows less of the day behind, so the two zones keep the room their words need */
  const [narrow, setNarrow] = useState(false);
  const appTheme = useResolvedTheme();
  const paper = appTheme === 'light';

  const isWall = wall.weight > 0;
  const dir = wall.side === 'call' ? 1 : -1;
  /* the room ahead: the minutes left to the close; when shut, a stretch the next session's outcomes stand in */
  const ahead = inSession ? Math.max(20, minutesLeft) : Math.max(60, Math.min(150, Math.round(allBars.length * 0.4)));
  const bars = useMemo(() => (narrow ? allBars.slice(-Math.max(30, Math.round(ahead * 1.3))) : allBars), [allBars, narrow, ahead]);
  const now = bars.length ? bars[bars.length - 1].time : 0;
  const end = now + ahead * 60;
  const tests = useMemo(() => wallTests(bars, wall.strike, wall.side), [bars, wall.strike, wall.side]);

  /* where each outcome goes: the model's strike, else a stretch of its own so the box still stands */
  const reach = Math.max(Math.abs(wall.strike - spot), spot * 0.0015);
  const breakTo = wall.breakPath.to ?? wall.strike + dir * reach;
  const holdTo = wall.holdPath.to ?? spot;
  const holds = inTen(wall.hold);
  const flowWords = (flow: number) => (Math.abs(flow) < 1 ? '' : ` · ${fmtDollars(flow)} of forced dealer ${flow > 0 ? 'buying' : 'selling'} on the way`);
  const breakWords = wall.breakPath.to != null ? `runs to ${fmtStrike(wall.breakPath.to)}${flowWords(wall.breakPath.flow)}` : 'no shelf behind it on the strikes shown';
  const holdWords = wall.holdPath.to != null ? `back toward ${fmtStrike(wall.holdPath.to)}` : 'price turns back';

  /* Mount once — and again on a theme flip: the island reads its inks at creation */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const surface = paper
      ? { bg: readToken('--inset', undefined, host), text: readToken('--text-secondary', undefined, host), line: readToken('--ink', 0.16, host), crosshair: readToken('--ink', 0.4, host), label: readToken('--text-primary', undefined, host) }
      : DARK_FIGURE_SURFACE;
    const chart = createChart(host, {
      autoSize: true,
      layout: { background: { color: surface.bg === 'transparent' ? readToken('--panel', undefined, host) : surface.bg }, textColor: surface.text, fontFamily: "'Inter', sans-serif", fontSize: 10, attributionLogo: false },
      localization: { timeFormatter: (t: Time) => fmtClockLocal(t) },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { borderColor: surface.line, scaleMargins: { top: 0.08, bottom: 0.08 } },
      timeScale: { borderColor: surface.line, timeVisible: true, secondsVisible: false, rightOffset: 0, fixLeftEdge: true, fixRightEdge: true, tickMarkFormatter: localTickMarks },
      crosshair: { vertLine: { color: surface.crosshair, labelBackgroundColor: surface.label }, horzLine: { color: surface.crosshair, labelBackgroundColor: surface.label } },
      handleScroll: false,
      handleScale: false,
    });
    const line = chart.addSeries(LineSeries, { color: readToken('--text-primary', undefined, host), lineWidth: 2, priceFormat: { type: 'price', precision: 2, minMove: 0.01 }, priceLineVisible: false, lastValueVisible: true, crosshairMarkerRadius: 3 });
    /* the room ahead of now — the library drops trailing whitespace, so a transparent series carries a point a minute */
    const holder = chart.addSeries(LineSeries, { color: 'rgba(0,0,0,0)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    const zones = new WallZonesPrimitive();
    line.attachPrimitive(zones);
    chart.subscribeCrosshairMove(param => {
      if (!param.time || !param.point) {
        setHover(null);
        return;
      }
      const price = line.coordinateToPrice(param.point.y);
      if (price == null) {
        setHover(null);
        return;
      }
      const W = host.clientWidth;
      const H = host.clientHeight;
      const left = param.point.x + 16 + CARD_W <= W - 8 ? param.point.x + 16 : Math.max(8, param.point.x - 16 - CARD_W);
      const top = Math.max(4, Math.min(H - CARD_H - 4, param.point.y - CARD_H / 2));
      setHover({ time: param.time as number, price: price as number, left, top });
    });
    chartRef.current = chart;
    lineRef.current = line;
    holderRef.current = holder;
    zonesRef.current = zones;
    const ro = new ResizeObserver(() => {
      setNarrow(host.clientWidth < 520);
      requestAnimationFrame(() => chartRef.current?.timeScale().fitContent());
    });
    ro.observe(host);
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      lineRef.current = null;
      holderRef.current = null;
      zonesRef.current = null;
      tagRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appTheme]);

  /* The price, the room ahead, the zones and the dots — whenever they move */
  useEffect(() => {
    const chart = chartRef.current;
    const line = lineRef.current;
    const holder = holderRef.current;
    const zones = zonesRef.current;
    const host = hostRef.current;
    if (!chart || !line || !holder || !zones || !host || !bars.length) return;
    line.setData(bars.map(b => ({ time: b.time as UTCTimestamp, value: b.close })));
    const room: { time: UTCTimestamp; value: number }[] = [];
    for (let t = now + 60; t <= end; t += 60) room.push({ time: t as UTCTimestamp, value: spot });
    holder.setData(room);
    /* the scale holds the line, the wall and both outcomes */
    let lo = Math.min(wall.strike, breakTo, holdTo);
    let hi = Math.max(wall.strike, breakTo, holdTo);
    for (const b of bars) {
      if (b.close < lo) lo = b.close;
      if (b.close > hi) hi = b.close;
    }
    line.applyOptions({ autoscaleInfoProvider: () => ({ priceRange: { minValue: lo, maxValue: hi } }) });
    holder.applyOptions({ autoscaleInfoProvider: () => null });
    const warm = resolveInk(THERMAL_WARM, host);
    const silver = resolveInk(SILVER, host);
    const text = readToken('--text-secondary', undefined, host);
    const ink = resolveInk(roleInk, host);
    const z: WallZone[] = [{ key: 'breaks', from: wall.strike, to: breakTo, fill: alpha(warm, paper ? 0.12 : 0.14), edge: alpha(warm, 0.45), title: isWall ? `Breaks · ${10 - holds} in 10` : 'Not a wall', titleInk: warm, sub: isWall ? breakWords : 'its hedging pushes the move along', subInk: text }];
    if (isWall) z.push({ key: 'holds', from: wall.strike, to: holdTo, fill: alpha(silver, paper ? 0.12 : 0.1), edge: alpha(silver, 0.4), title: `Holds · ${holds} in 10`, titleInk: silver, sub: holdWords, subInk: text });
    zones.update({
      t0: now,
      t1: end,
      zones: z,
      wall: { price: wall.strike, from: tests.length ? tests[0].time : now, color: ink },
      marks: tests.map(t => ({ time: t.time, price: t.price, color: t.kind === 'held' ? silver : warm })),
      nowInk: readToken('--ink', 0.3, host),
      ground: paper ? readToken('--inset', undefined, host) : readToken('--panel', undefined, host),
    });
    /* the wall's figure on the price axis, in its own ink */
    if (tagRef.current) line.removePriceLine(tagRef.current);
    tagRef.current = line.createPriceLine({ price: wall.strike, color: ink, lineVisible: false, axisLabelVisible: true, title: '' });
    chart.timeScale().fitContent();
    const raf = requestAnimationFrame(() => chartRef.current?.timeScale().fitContent());
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bars, wall, spot, end, appTheme, roleInk]);

  /* THE CARD — a minute gone: the price and its distance from the wall, and the test if there was one; ahead: the outcome under the pointer */
  const card = (() => {
    if (!hover) return null;
    if (hover.time <= now) {
      const bar = bars.find(b => b.time === hover.time);
      if (!bar) return null;
      const d = bar.close - wall.strike;
      const test = tests.find(t => t.time === hover.time);
      return (
        <>
          <span className="flex items-baseline justify-between gap-3">
            <span className="font-mono tnum text-textPrimary font-semibold">{fmtClockLocal(hover.time as UTCTimestamp)}</span>
            <span className="font-mono tnum text-textPrimary">{bar.close.toFixed(2)}</span>
          </span>
          <span>
            ${Math.abs(d).toFixed(2)} {d >= 0 ? 'over' : 'under'} the wall at {fmtStrike(wall.strike)}
          </span>
          {test && <span style={{ color: test.kind === 'held' ? SILVER : THERMAL_WARM }}>{test.kind === 'held' ? 'tested it here, and it held' : 'broke through it here'}</span>}
        </>
      );
    }
    const inBreak = dir > 0 ? hover.price > wall.strike : hover.price < wall.strike;
    if (!isWall)
      return (
        <>
          <span className="font-semibold" style={{ color: THERMAL_WARM }}>
            Not a wall
          </span>
          <span>Hedging at {fmtStrike(wall.strike)} pushes a move along instead of slowing it.</span>
        </>
      );
    return inBreak ? (
      <>
        <span className="font-semibold" style={{ color: THERMAL_WARM }}>
          If it breaks · {10 - holds} in 10 <span className="font-normal text-textMuted">{Math.round((1 - wall.hold) * 100)}%</span>
        </span>
        <span>{breakWords}</span>
      </>
    ) : (
      <>
        <span className="font-semibold text-silver">
          If it holds · {holds} in 10 <span className="font-normal text-textMuted">{Math.round(wall.hold * 100)}%</span>
        </span>
        <span>{holdWords}</span>
      </>
    );
  })();

  return (
    <div className={`relative rounded-md overflow-hidden ${fill ? 'flex-1 min-h-0' : ''} ${paper ? 'border border-borderSubtle bg-inset' : ''}`} style={{ height: fill ? undefined : height }} data-chart-ink={paper ? undefined : ''} data-theme={paper ? 'light' : 'dark'} data-wall-chart={wall.strike} data-wall-tests={tests.length} data-wall-ahead={ahead}>
      <div ref={hostRef} className="absolute inset-0" />
      {hover && card && (
        <div className="absolute z-10 pointer-events-none rounded-md border border-borderSubtle px-2.5 py-2 flex flex-col gap-1 text-[11px] leading-snug text-textSecondary" style={{ left: hover.left, top: hover.top, width: CARD_W, background: 'rgba(8,8,10,0.88)', backdropFilter: 'blur(3px)' }} data-theme="dark" data-chart-glass data-wall-card>
          {card}
        </div>
      )}
    </div>
  );
};

export default WallChart;
