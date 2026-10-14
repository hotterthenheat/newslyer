/*
==================================================
  SLAYER TERMINAL - THE BOOK THROUGH THE DAY
  (components/gex/BookThroughDay.tsx)

  Exposure OVER TIME (the competitive audit, 2026-10-
  13: the one chart the Map had none of — the book is
  a moving thing, and the day's record of it is what
  a trader reads a regime change off): the whole
  book's net gamma through the session (data/
  bookMarket.ts getGexHistory, a book a minute) as a
  baseline at zero — the line and its ground red where
  hedging amplified (above zero), green where it
  absorbed (below); spot beside it, quiet, on its own
  scale. Hover for the minute; the replay cuts it at
  its minute. On the feed the per-minute net is the
  vendor's own series where it keeps one (bookMinutes).

  ONE FACE (the owner, 2026-10-14: "remove the strike
  x time, you have to understand this is mostly for
  retail users they dont know how to utilize that"):
  the strike-by-minute heat surface beside it is gone;
  the net line says the one thing a trader reads off
  this box — whether hedging is pushing moves along or
  holding them back, and when that changed.

  DRAWN BY THE CHART LIBRARY, Compare's way (the
  owner, 2026-10-14 — dayChart.ts): the net is the
  library's baseline series, the clock and the scale
  are its own, minute for minute under the tape above.
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
import { LONG_GAMMA, SHORT_GAMMA, alpha, resolveInk } from './paletteInk';
import { readToken, useResolvedTheme } from '../../theme/theme';
import { setDayHover, useDayHover } from '../../data/dayHover';
import { CLOCK_SCALE, dayChartOptions, dayClock, daySurface, dayStartOf, feedSeries } from './dayChart';
import type { Candle, GexSnapshot, MarketSnapshot } from '../../types/market';

interface Props {
  snapshot: MarketSnapshot;
  /** The day so far, handed in — the replay reads the bars up to its position; the history is cut to the last one */
  bars?: readonly Candle[];
  scope?: ReactNode;
  /** A part of the day box (DayBox.tsx): no head of its own, the facts in a row, the clock shared with the tape above */
  part?: boolean;
}

interface Minute {
  time: number;
  min: number;
  net: number;
  spot: number | null;
}

const BookThroughDay = ({ snapshot, bars: barsProp, scope, part = false }: Props) => {
  const paper = useResolvedTheme() === 'light';
  const ticker = snapshot.ticker;
  const bars = useMemo(() => barsProp ?? sessionBars(ticker) ?? [], [ticker, barsProp]);
  const until = bars.length ? bars[bars.length - 1].time : Infinity;
  const first = bars[0]?.time ?? 0;

  /* THE MINUTES: the books kept this session, each with its net and the price at its minute. A closed minute's book never
     changes, so its net is added up once (kept by the book itself) — a tick re-reads only the live one. */
  const nets = useRef(new WeakMap<GexSnapshot, number>());
  const minutes = useMemo<Minute[]>(() => {
    const market = bookMarket();
    const snaps: GexSnapshot[] = market.getGexHistory(ticker).filter(s => s.time >= first && s.time <= until);
    const priceAt = new Map(bars.map(b => [b.time, b.close] as const));
    const own = market.bookMinutes(ticker);
    const netAt = own ? new Map(own.filter(m => m.time >= first && m.time <= until).map(m => [m.time, m.netGex] as const)) : null;
    return snaps.map(s => {
      let net = nets.current.get(s);
      if (net === undefined) {
        net = 0;
        for (const l of s.levels) net += l.value;
        nets.current.set(s, net);
      }
      return { time: s.time, min: nyMinutes(s.time * 1000), net: netAt?.get(s.time) ?? net, spot: s.spot ?? priceAt.get(s.time) ?? null };
    });
  }, [ticker, bars, first, until]);

  /* the tape's clock, off the same bars (data/dayAxis.ts) */
  const FROM = dayAxisFrom(bars[0]?.time);
  const TO = dayAxisTo(bars[bars.length - 1]?.time);
  const dayStart = bars.length ? dayStartOf(bars[0].time, nyMinutes(bars[0].time * 1000)) : 0;

  /* ---- the chart ---- */
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const netRef = useRef<ISeriesApi<'Baseline'> | null>(null);
  const spotRef = useRef<ISeriesApi<'Line'> | null>(null);
  const clockRef = useRef<ISeriesApi<'Line'> | null>(null);
  const fedNet = useRef<readonly LineData<Time>[] | null>(null);
  const fedSpot = useRef<readonly LineData<Time>[] | null>(null);
  const minutesRef = useRef(minutes);
  minutesRef.current = minutes;
  const indexOf = useMemo(() => new Map(minutes.map((m, i) => [m.time, i] as const)), [minutes]);
  const indexRef = useRef(indexOf);
  indexRef.current = indexOf;

  /* the hovered minute, and where its point is on the chart */
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const hoverRef = useRef(hover);
  hoverRef.current = hover;

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
      /* the tape's minute is set on this chart from code — no pointer behind it, nothing to answer */
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
      const y = net.priceToCoordinate(mi.net) ?? param.point.y;
      setHover({ i, x, y });
    });
    chartRef.current = chart;
    netRef.current = net;
    spotRef.current = spot;
    clockRef.current = clockS;
    fedNet.current = null;
    fedSpot.current = null;
    return () => {
      chart.remove();
      chartRef.current = null;
      netRef.current = null;
    };
  }, [paper]);

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
  /* THE KEYS WALK IT TOO (the re-audit's M6) — the tape's walk: left and right along the minutes */
  const walk = (i: number) => {
    const chart = chartRef.current;
    const net = netRef.current;
    const mi = minutes[i];
    if (!chart || !net || !mi) return;
    chart.setCrosshairPosition(mi.net, mi.time as UTCTimestamp, net);
    setHover({ i, x: chart.timeScale().timeToCoordinate(mi.time as UTCTimestamp) ?? 0, y: net.priceToCoordinate(mi.net) ?? 0 });
  };
  const onKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !minutes.length) return;
    const i = hover?.i ?? minutes.length - 1;
    if (e.key === 'ArrowLeft') walk(Math.max(0, i - 1));
    else if (e.key === 'ArrowRight') walk(Math.min(minutes.length - 1, i + 1));
    else if (e.key === 'Home') walk(0);
    else if (e.key === 'End') walk(minutes.length - 1);
    else if (e.key === 'Escape') {
      setHover(null);
      chartRef.current?.clearCrosshairPosition();
    } else return;
    e.preventDefault();
  };
  const plotW = hostRef.current?.clientWidth ?? 0;

  return (
    <section className={`relative flex flex-col min-w-0 ${part ? 'flex-1' : ''}`} data-through-day data-through-part={part || undefined}>
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
          </div>
          {!part && <p className="mt-0.5 text-[11px] text-textMuted">The whole book’s net gamma through the session — above zero dealer hedging amplified moves, below it absorbed them · spot drawn faint beside it</p>}
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
          aria-label={`${ticker}'s net gamma through the day — the arrow keys walk the minutes`}
          onKeyDown={onKeys}
          data-through-plot
        >
          <div ref={hostRef} className="absolute inset-0" data-through-chart />
          {hm && hover && (
            /* Compare's glass, beside the point it reads (components/gex/besideDot.ts) */
            <div
              className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-borderSubtle px-2.5 py-1.5 font-mono text-[11px] text-textSecondary"
              style={{ ...besideDot(hover.x, hover.y, hover.x > plotW / 2), background: 'rgba(8,8,10,0.88)', backdropFilter: 'blur(3px)' }}
              data-theme="dark"
              data-chart-glass
              data-through-card={hhmm(hm.min)}
            >
              <span className="font-bold tnum text-textPrimary">{hhmm(hm.min)}</span>
              <span className="ml-2 tnum" style={{ color: hm.net >= 0 ? SHORT_GAMMA : LONG_GAMMA }}>
                {fmtUsd(hm.net)} · {hm.net >= 0 ? 'amplifies' : 'absorbs'}
              </span>
              {hm.spot != null && <span className="ml-2 tnum text-textMuted">spot {hm.spot.toFixed(2)}</span>}
            </div>
          )}
          {minutes.length === 0 && <div className="absolute inset-0 grid place-items-center font-mono text-[11px] uppercase tracking-widest text-textMuted">No books kept yet this session</div>}
        </div>
      </div>
    </section>
  );
};

export default BookThroughDay;
