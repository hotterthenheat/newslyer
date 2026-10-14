/*
==================================================
  SLAYER TERMINAL - THE BOOK THROUGH THE DAY
  (components/gex/BookThroughDay.tsx)

  Exposure OVER TIME (the competitive audit, 2026-10-
  13: the one chart the Map had none of — the book is
  a moving thing, and the day's record of it is what
  a trader reads a regime change off). Two faces of
  the same history (data/bookMarket.ts getGexHistory,
  a book a minute):

    NET GAMMA   the whole book's net through the
                session as a baseline at zero — the
                line and its ground red where hedging
                amplified (above zero), green where it
                absorbed (below); spot beside it,
                quiet, on its own scale
    STRIKE × TIME   every strike's net, minute by
                minute, as a heat surface — the
                strikes down, the session across —
                where a wall built, drained or moved

  Hover for the minute; the kept strike's row is lit;
  the replay cuts it at its minute. On the feed the
  per-minute net is the vendor's own series where it
  keeps one (bookMinutes), the surface its recorded
  books.

  DRAWN BY THE CHART LIBRARY, Compare's way (the
  owner, 2026-10-14 — dayChart.ts): the net is the
  library's baseline series, the clock and the scale
  are its own, and the surface is painted on the same
  axes, minute for minute under the tape above.
==================================================
*/

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { BaselineSeries, createChart, LineSeries, LineStyle, type IChartApi, type ISeriesApi, type LineData, type Time, type UTCTimestamp } from 'lightweight-charts';
import { bookMarket } from '../../data/bookMarket';
import { sessionBars } from '../../data/levelview';
import { fmtUsd } from '../../data/gex';
import { hhmm } from '../../data/ahead';
import { dayAxisFrom, dayAxisTo } from '../../data/dayAxis';
import { besideDot } from './besideDot';
import { nyMinutes } from '../../core/nyTime';
import { HEAT_MODE, heatLaneColor } from './heatmap';
import { LONG_GAMMA, SHORT_GAMMA, alpha, resolveInk } from './paletteInk';
import { readToken, useResolvedTheme } from '../../theme/theme';
import { setDayHover, useDayHover } from '../../data/dayHover';
import { CLOCK_SCALE, dayChartOptions, dayClock, daySurface, dayStartOf, feedSeries } from './dayChart';
import type { Candle, GexSnapshot, MarketSnapshot } from '../../types/market';

const fmtStrike = (v: number) => (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2));
/** Strikes each side of spot on the surface */
const HALF = 20;

type Face = 'net' | 'heat';

interface Props {
  snapshot: MarketSnapshot;
  /** The day so far, handed in — the replay reads the bars up to its position; the history is cut to the last one */
  bars?: readonly Candle[];
  focus: number | null;
  onPick: (price: number) => void;
  scope?: ReactNode;
  /** A part of the day box (DayBox.tsx): no head of its own, the faces and the facts in a row, the clock shared with the tape above */
  part?: boolean;
}

interface Minute {
  time: number;
  min: number;
  net: number;
  spot: number | null;
  byStrike: Map<number, number>;
}

/** A book's net and its strikes, read once a book — a closed minute's book never changes, only the live one does */
interface BookRead {
  net: number;
  byStrike: Map<number, number>;
}

const BookThroughDay = ({ snapshot, bars: barsProp, focus, onPick, scope, part = false }: Props) => {
  const paper = useResolvedTheme() === 'light';
  const [face, setFace] = useState<Face>('net');
  const ticker = snapshot.ticker;
  const bars = useMemo(() => barsProp ?? sessionBars(ticker) ?? [], [ticker, barsProp]);
  const until = bars.length ? bars[bars.length - 1].time : Infinity;
  const first = bars[0]?.time ?? 0;

  /* THE MINUTES: the books kept this session, each with its net and the price at its minute */
  const reads = useRef(new WeakMap<GexSnapshot, BookRead>());
  const minutes = useMemo<Minute[]>(() => {
    const market = bookMarket();
    const snaps: GexSnapshot[] = market.getGexHistory(ticker).filter(s => s.time >= first && s.time <= until);
    const priceAt = new Map(bars.map(b => [b.time, b.close] as const));
    const own = market.bookMinutes(ticker);
    const netAt = own ? new Map(own.filter(m => m.time >= first && m.time <= until).map(m => [m.time, m.netGex] as const)) : null;
    return snaps.map(s => {
      let r = reads.current.get(s);
      if (!r) {
        let net = 0;
        const byStrike = new Map<number, number>();
        for (const l of s.levels) {
          net += l.value;
          byStrike.set(l.strike, l.value);
        }
        r = { net, byStrike };
        reads.current.set(s, r);
      }
      return { time: s.time, min: nyMinutes(s.time * 1000), net: netAt?.get(s.time) ?? r.net, spot: s.spot ?? priceAt.get(s.time) ?? null, byStrike: r.byStrike };
    });
  }, [ticker, bars, first, until]);

  /* the strikes on the surface: round the last book's spot */
  const spotNow = minutes.length ? (minutes[minutes.length - 1].spot ?? snapshot.spot) : snapshot.spot;
  /* only the surface reads them — the line face never pays for forty strikes by four hundred minutes */
  const strikes = useMemo(() => {
    if (face !== 'heat') return [] as number[];
    const all = [...new Set(minutes.flatMap(m => [...m.byStrike.keys()]))].sort((a, b) => b - a);
    const above = all.filter(k => k >= spotNow).slice(-HALF);
    const below = all.filter(k => k < spotNow).slice(0, HALF);
    return [...above, ...below];
  }, [minutes, spotNow, face]);
  const maxAbs = useMemo(() => {
    let m = 1;
    if (face !== 'heat') return m;
    for (const mi of minutes) for (const k of strikes) m = Math.max(m, Math.abs(mi.byStrike.get(k) ?? 0));
    return m;
  }, [minutes, strikes, face]);

  /* the tape's clock, off the same bars (data/dayAxis.ts) */
  const FROM = dayAxisFrom(bars[0]?.time);
  const TO = dayAxisTo(bars[bars.length - 1]?.time);
  const dayStart = bars.length ? dayStartOf(bars[0].time, nyMinutes(bars[0].time * 1000)) : 0;

  /* ---- the chart ---- */
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const netRef = useRef<ISeriesApi<'Baseline'> | null>(null);
  const spotRef = useRef<ISeriesApi<'Line'> | null>(null);
  const clockRef = useRef<ISeriesApi<'Line'> | null>(null);
  const fedNet = useRef<readonly LineData<Time>[] | null>(null);
  const fedSpot = useRef<readonly LineData<Time>[] | null>(null);
  /* the plot's own box — the time scale's width and the pane's height — for the surface painted on it */
  const [plot, setPlot] = useState({ w: 0, h: 0 });
  const minutesRef = useRef(minutes);
  minutesRef.current = minutes;
  const indexOf = useMemo(() => new Map(minutes.map((m, i) => [m.time, i] as const)), [minutes]);
  const indexRef = useRef(indexOf);
  indexRef.current = indexOf;
  const faceRef = useRef(face);
  faceRef.current = face;
  const strikesRef = useRef(strikes);
  strikesRef.current = strikes;
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  /* the hovered minute (and row, on the surface), and where its point is on the chart */
  const [hover, setHover] = useState<{ i: number; row: number | null; x: number; y: number } | null>(null);
  const hoverRef = useRef(hover);
  hoverRef.current = hover;
  const rowOf = (y: number, h: number) => (strikesRef.current.length && h > 0 ? Math.max(0, Math.min(strikesRef.current.length - 1, Math.floor(y / (h / strikesRef.current.length)))) : null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const s = daySurface(host, paper);
    const chart = createChart(host, dayChartOptions(s, { clock: true, logo: true }));
    const amp = resolveInk(SHORT_GAMMA, host);
    const abs = resolveInk(LONG_GAMMA, host);
    /* THE NET AS A BASELINE AT ZERO — the library's own two-sided line, Compare's gap band: red and its ground above,
       green and its ground below */
    const net = chart.addSeries(BaselineSeries, {
      baseValue: { type: 'price', price: 0 },
      topLineColor: amp,
      topFillColor1: alpha(amp, paper ? 0.22 : 0.3),
      topFillColor2: alpha(amp, 0.03),
      bottomLineColor: abs,
      bottomFillColor1: alpha(abs, 0.03),
      bottomFillColor2: alpha(abs, paper ? 0.22 : 0.3),
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerRadius: 3,
      priceFormat: { type: 'custom', formatter: (v: number) => fmtUsd(v), minMove: 1 },
    });
    net.createPriceLine({ price: 0, color: s.zero, lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: '' });
    /* spot beside it, quiet, on a scale of its own that prints nothing */
    const spot = chart.addSeries(LineSeries, { priceScaleId: 'spot', color: alpha(readToken('--text-muted', undefined, host), 0.6), lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    /* room over the top tick: at 0.1 the scale's top figure was cut by the pane's edge */
    chart.priceScale('right').applyOptions({ scaleMargins: { top: 0.14, bottom: 0.08 } });
    chart.priceScale('spot').applyOptions({ scaleMargins: { top: 0.14, bottom: 0.08 }, visible: false });
    /* the clock (dayChart.ts dayClock): every minute of the session, hidden, on a scale of its own */
    const clockS = chart.addSeries(LineSeries, { visible: false, priceScaleId: CLOCK_SCALE, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    chart.subscribeCrosshairMove(param => {
      if (!param.sourceEvent) {
        if (param.point === undefined && hoverRef.current) setHover(null);
        return;
      }
      if (param.point === undefined || param.time === undefined) {
        setHover(null);
        return;
      }
      const i = indexRef.current.get(param.time as number);
      const mi = i != null ? minutesRef.current[i] : null;
      if (i == null || !mi) {
        setHover(null);
        return;
      }
      const x = chart.timeScale().timeToCoordinate(param.time) ?? param.point.x;
      const heat = faceRef.current === 'heat';
      const row = heat ? rowOf(param.point.y, chart.paneSize().height) : null;
      const y = heat ? param.point.y : net.priceToCoordinate(mi.net) ?? param.point.y;
      setHover({ i, row, x, y });
    });
    /* a click on the surface keeps its row's strike */
    chart.subscribeClick(param => {
      if (faceRef.current !== 'heat' || !param.point) return;
      const row = rowOf(param.point.y, chart.paneSize().height);
      const k = row != null ? strikesRef.current[row] : undefined;
      if (k != null) onPickRef.current(k);
    });
    const readPlot = () => setPlot(prev => {
      const w = chart.timeScale().width();
      const h = chart.paneSize().height;
      return prev.w === w && prev.h === h ? prev : { w, h };
    });
    chart.timeScale().subscribeSizeChange(readPlot);
    const ro = new ResizeObserver(readPlot);
    ro.observe(host);
    chartRef.current = chart;
    netRef.current = net;
    spotRef.current = spot;
    clockRef.current = clockS;
    fedNet.current = null;
    fedSpot.current = null;
    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      netRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paper]);

  /* the face: the line, or the surface under the same clock (the chart's ground goes clear so the cells show through) */
  useEffect(() => {
    const host = hostRef.current;
    netRef.current?.applyOptions({ visible: face === 'net' });
    spotRef.current?.applyOptions({ visible: face === 'net' });
    chartRef.current?.applyOptions({
      layout: { background: { color: face === 'net' && host ? daySurface(host, paper).bg : 'transparent' } },
      crosshair: { horzLine: { visible: face === 'net', labelVisible: face === 'net' } },
    });
    /* the scale keeps its width (the tape's plot ends on the same pixel) but prints no dollars over the strikes' names */
    chartRef.current?.priceScale('right').applyOptions({ textColor: face === 'net' && host ? daySurface(host, paper).text : 'transparent', ticksVisible: face === 'net' });
  }, [face, paper]);

  /* the clock, when the day's span moves */
  useEffect(() => {
    const chart = chartRef.current;
    const c = clockRef.current;
    if (!chart || !c || !bars.length) return;
    c.setData(dayClock(dayStart, FROM, TO));
    chart.timeScale().fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayStart, FROM, TO, paper, bars.length > 0]);

  /* the net and spot — the newest minute only, unless the day itself changed */
  const netPoints = useMemo<LineData<Time>[]>(() => minutes.map(m => ({ time: m.time as UTCTimestamp, value: m.net })), [minutes]);
  const spotPoints = useMemo<LineData<Time>[]>(() => minutes.filter(m => m.spot != null).map(m => ({ time: m.time as UTCTimestamp, value: m.spot! })), [minutes]);
  useEffect(() => {
    if (netRef.current) feedSeries(netRef.current, netPoints, fedNet);
    if (spotRef.current) feedSeries(spotRef.current, spotPoints, fedSpot);
  }, [netPoints, spotPoints, paper]);

  /* THE HEAT SURFACE, painted on a canvas over the chart's own plot — forty strikes by four hundred minutes is sixteen
     thousand cells, each minute at the clock's own x; the strikes are named in the scale's lane */
  useEffect(() => {
    const c = canvasRef.current;
    const chart = chartRef.current;
    const host = hostRef.current;
    if (!c || !chart || !host) return;
    const W = host.clientWidth;
    const H = plot.h;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    c.style.width = `${W}px`;
    c.style.height = `${H}px`;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (face !== 'heat' || !strikes.length || !plot.w) return;
    const ts = chart.timeScale();
    const colW = Math.max(1, plot.w / Math.max(1, TO - FROM + 1));
    const rowH = H / strikes.length;
    /* rows and columns snapped to whole pixels, each cell meeting the next — fractional edges left a hairline between
       every row */
    const rowY = strikes.map((_, i) => Math.round(i * rowH));
    rowY.push(Math.round(H));
    for (const m of minutes) {
      const xc = ts.timeToCoordinate(m.time as UTCTimestamp);
      if (xc == null) continue;
      const x0 = Math.floor(xc - colW / 2);
      const x1 = Math.ceil(xc + colW / 2);
      for (let i = 0; i < strikes.length; i++) {
        const v = m.byStrike.get(strikes[i]);
        if (v == null || v === 0) continue;
        ctx.fillStyle = heatLaneColor(v, maxAbs, HEAT_MODE, 0.12, paper);
        ctx.fillRect(x0, rowY[i], x1 - x0, rowY[i + 1] - rowY[i]);
      }
    }
    /* the strikes, named in the scale's lane — every tenth or so, and the kept one */
    const s = daySurface(host, paper);
    ctx.font = "10px 'Inter', sans-serif";
    ctx.textBaseline = 'middle';
    const every = Math.max(1, Math.round(strikes.length / 10));
    strikes.forEach((k, i) => {
      const kept = focus != null && Math.abs(k - focus) < 1e-9;
      if (i % every !== 0 && !kept) return;
      ctx.fillStyle = kept ? resolveInk('rgb(var(--silver))', host) : s.text;
      ctx.fillText(fmtStrike(k), plot.w + 8, i * rowH + rowH / 2);
    });
  }, [face, minutes, strikes, maxAbs, plot, paper, focus, FROM, TO]);

  /* THE MINUTE, SHARED (idea 1): the pointer's minute told to the tape above; the tape's set here as this chart's own
     crosshair */
  const hm = hover ? minutes[hover.i] : null;
  const shared = useDayHover();
  useEffect(() => {
    if (!part) return;
    setDayHover(hm ? { min: hm.min, from: 'through' } : null);
  }, [part, hm]);
  useEffect(() => () => setDayHover(null), []);
  useEffect(() => {
    const chart = chartRef.current;
    const net = netRef.current;
    if (!chart || !net || hover) return;
    if (part && shared?.from === 'tape' && minutes.length) {
      const t = dayStart + shared.min * 60;
      const i = indexOf.get(t);
      if (i != null) {
        chart.setCrosshairPosition(minutes[i].net, t as UTCTimestamp, net);
        return;
      }
    }
    chart.clearCrosshairPosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shared, hover == null, part]);
  useEffect(() => setHover(h => (h && h.i < minutes.length ? h : null)), [minutes]);

  const flips = useMemo(() => {
    let n = 0;
    for (let i = 1; i < minutes.length; i++) if (Math.sign(minutes[i].net) !== Math.sign(minutes[i - 1].net) && minutes[i].net !== 0 && minutes[i - 1].net !== 0) n++;
    return n;
  }, [minutes]);
  const last = minutes[minutes.length - 1];
  const focusRow = focus != null ? strikes.findIndex(k => Math.abs(k - focus) < 1e-9) : -1;
  const rowH = strikes.length && plot.h ? plot.h / strikes.length : 0;
  /* THE KEYS WALK IT TOO (the re-audit's M6) — the tape's walk: left and right along the minutes, up and down the
     strikes on the surface, Enter keeps the row's strike */
  const walk = (i: number, row: number | null) => {
    const chart = chartRef.current;
    const net = netRef.current;
    const mi = minutes[i];
    if (!chart || !net || !mi) return;
    chart.setCrosshairPosition(mi.net, mi.time as UTCTimestamp, net);
    const x = chart.timeScale().timeToCoordinate(mi.time as UTCTimestamp) ?? 0;
    setHover({ i, row, x, y: face === 'heat' && row != null ? row * rowH + rowH / 2 : net.priceToCoordinate(mi.net) ?? 0 });
  };
  const onKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !minutes.length) return;
    const i = hover?.i ?? minutes.length - 1;
    const row = hover?.row ?? (face === 'heat' ? (focusRow >= 0 ? focusRow : Math.floor(strikes.length / 2)) : null);
    if (e.key === 'ArrowLeft') walk(Math.max(0, i - 1), row);
    else if (e.key === 'ArrowRight') walk(Math.min(minutes.length - 1, i + 1), row);
    else if (e.key === 'ArrowUp' && face === 'heat') walk(i, Math.max(0, (row ?? 0) - 1));
    else if (e.key === 'ArrowDown' && face === 'heat') walk(i, Math.min(strikes.length - 1, (row ?? -1) + 1));
    else if (e.key === 'Home') walk(0, row);
    else if (e.key === 'End') walk(minutes.length - 1, row);
    else if ((e.key === 'Enter' || e.key === ' ') && face === 'heat' && row != null && strikes[row] != null) onPick(strikes[row]);
    else if (e.key === 'Escape') {
      setHover(null);
      chartRef.current?.clearCrosshairPosition();
    } else return;
    e.preventDefault();
  };
  const plotW = plot.w;

  return (
    <section className={`relative flex flex-col min-w-0 ${part ? 'flex-1' : ''}`} data-through-day data-through-face={face} data-through-part={part || undefined}>
      <div className={part ? 'px-5 pt-2 pb-2 flex items-end gap-6 flex-wrap' : 'px-5 pt-4 pb-3 flex items-start gap-6 flex-wrap'}>
        <div className={part ? 'flex items-center gap-3 flex-wrap' : 'min-w-0 flex-1'}>
          <div className="flex items-center gap-3 flex-wrap">
            {part ? (
              <span className="font-mono text-[11px] uppercase tracking-widest text-textMuted" data-through-part-word>
                The book
              </span>
            ) : (
              <h3 className="text-[15px] font-semibold leading-tight text-textPrimary">The book through the day</h3>
            )}
            {!part && scope}
            <div className="inline-flex items-center gap-0.5 rounded-md border border-borderSubtle p-0.5" role="group" aria-label="Which face" title="Net gamma: the whole book's net through the session, above zero hedging amplified moves, below it absorbed them · Strike × time: every strike's net minute by minute, the kept strike's row lit">
              {(['net', 'heat'] as Face[]).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFace(f)}
                  aria-pressed={face === f}
                  className={`hit h-6 rounded px-2 font-mono text-[11px] transition-colors ${face === f ? 'bg-silver/[0.1] text-textPrimary' : 'text-textMuted hover:text-textPrimary'}`}
                  data-through-face-door={f}
                >
                  {f === 'net' ? 'Net gamma' : 'Strike × time'}
                </button>
              ))}
            </div>
          </div>
          {!part && (
            <p className="mt-0.5 text-[11px] text-textMuted">
              {face === 'net' ? 'The whole book’s net gamma through the session — above zero dealer hedging amplified moves, below it absorbed them · spot drawn faint beside it' : 'Every strike’s net gamma, minute by minute — where a wall built, drained or moved · the kept strike’s row is lit'}
            </p>
          )}
        </div>
        {last && (
          <dl className={part ? 'flex flex-wrap gap-x-6 gap-y-1' : 'grid grid-cols-3 gap-x-6'}>
            <div>
              <dt className="text-[11px] text-textMuted">Net now</dt>
              <dd className="mt-0.5 font-mono text-[12px] tnum whitespace-nowrap" style={{ color: last.net >= 0 ? SHORT_GAMMA : LONG_GAMMA }} data-through-net={Math.round(last.net)}>
                {fmtUsd(last.net)} · {last.net >= 0 ? 'amplifies' : 'absorbs'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-textMuted">Net changed sign</dt>
              <dd className="mt-0.5 font-mono text-[12px] tnum text-textPrimary whitespace-nowrap">{flips === 0 ? 'not yet' : `${flips} ${flips === 1 ? 'time' : 'times'}`}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-textMuted">Books kept</dt>
              <dd className="mt-0.5 font-mono text-[12px] tnum text-textPrimary whitespace-nowrap">{minutes.length} {minutes.length === 1 ? 'minute' : 'minutes'}</dd>
            </div>
          </dl>
        )}
      </div>
      <div className={part ? 'flex-1 flex flex-col border-t border-borderSubtle/60' : 'border-t border-borderSubtle/60'}>
        <div
          className={`relative ${part ? 'flex-[1_1_260px] min-h-[170px]' : 'h-[260px]'} outline-none`}
          tabIndex={0}
          role="group"
          aria-label={`${ticker}'s book through the day — the arrow keys walk the minutes${face === 'heat' ? ' and the strikes, Enter keeps the strike' : ''}`}
          onKeyDown={onKeys}
          data-through-plot
        >
          {/* the surface, on the chart's own plot and UNDER it — the chart goes transparent on this face, so its crosshair,
              its clock and its scale draw over the cells */}
          <canvas ref={canvasRef} className="pointer-events-none absolute left-0 top-0" style={{ display: face === 'heat' ? 'block' : 'none' }} aria-hidden />
          <div ref={hostRef} className="absolute inset-0" data-through-chart />
          {face === 'heat' && rowH > 0 && focusRow >= 0 && <div className="pointer-events-none absolute left-0 border-y border-silver" style={{ top: focusRow * rowH, height: rowH, width: plotW }} data-through-kept-row={focus ?? undefined} />}
          {face === 'heat' && rowH > 0 && hover?.row != null && <div className="pointer-events-none absolute left-0 bg-silver/[0.08]" style={{ top: hover.row * rowH, height: rowH, width: plotW }} />}
          {hm && hover && (
            /* Compare's glass, beside the point it reads (components/gex/besideDot.ts): the net line's dot, or the row */
            <div
              className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-borderSubtle px-2.5 py-1.5 font-mono text-[11px] text-textSecondary"
              style={{ ...besideDot(hover.x, hover.y, hover.x > plotW / 2), background: 'rgba(8,8,10,0.88)', backdropFilter: 'blur(3px)' }}
              data-theme="dark"
              data-chart-glass
              data-through-card={hhmm(hm.min)}
            >
              <span className="font-bold tnum text-textPrimary">{hhmm(hm.min)}</span>
              {face === 'net' ? (
                <>
                  <span className="ml-2 tnum" style={{ color: hm.net >= 0 ? SHORT_GAMMA : LONG_GAMMA }}>
                    {fmtUsd(hm.net)} · {hm.net >= 0 ? 'amplifies' : 'absorbs'}
                  </span>
                  {hm.spot != null && <span className="ml-2 tnum text-textMuted">spot {hm.spot.toFixed(2)}</span>}
                </>
              ) : (
                hover.row != null &&
                strikes[hover.row] != null && (
                  <>
                    <span className="ml-2 tnum text-textPrimary">{fmtStrike(strikes[hover.row])}</span>
                    <span className="ml-2 tnum text-textSecondary">{fmtUsd(hm.byStrike.get(strikes[hover.row]) ?? 0)}</span>
                    <span className="ml-2 text-textMuted">click to keep</span>
                  </>
                )
              )}
            </div>
          )}
          {minutes.length === 0 && <div className="absolute inset-0 grid place-items-center font-mono text-[11px] uppercase tracking-widest text-textMuted">No books kept yet this session</div>}
        </div>
      </div>
    </section>
  );
};

export default BookThroughDay;
