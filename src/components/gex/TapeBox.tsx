/*
==================================================
  SLAYER TERMINAL - THE TAPE (components/gex/TapeBox.tsx)

  Today's price with the book's levels ON it (the
  competitive audit, 2026-10-13 — "levels on the
  trader's own chart" is the first thing every
  practitioner asks a dealer-positioning tool for,
  and the Map sent them to another page for it). One
  session, the close as a line; the call wall, the
  flip, the put wall, the pin and the supreme as
  price lines across it, each named on the line and
  priced on the scale; the flip's own path through
  the day under them; ahead of now, one expected move
  to the close. The levels' chips in the head KEEP the
  strike, and the bell beside each sets an alert on
  the level (components/gex/alertStore.ts armLevel —
  the same alert the Alerts drawer arms). The replay
  rewinds it with the rest of the page. Hover for the
  minute; the arrow keys walk the bars.

  DRAWN BY THE CHART LIBRARY, Compare's way (the
  owner, 2026-10-14, of Compare's "Since the open":
  "i need charts that look that clean in the map page
  … i dont want ones AI created"): the hand-drawn SVG
  — hour rules, a grey fill, three ticks in a margin,
  a lane of tags — is gone; the library's line, scale,
  crosshair and clock are the chart (dayChart.ts).
==================================================
*/

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createChart, LineSeries, LineStyle, LineType, type IChartApi, type IPriceLine, type ISeriesApi, type LineData, type Time, type UTCTimestamp, type WhitespaceData } from 'lightweight-charts';
import { Bell, BellRing, ChevronDown } from 'lucide-react';
import { roomLevels } from '../../data/roomLevels';
import { sessionBars } from '../../data/levelview';
import { bookMarket } from '../../data/bookMarket';
import { pickFlip } from '../../core/walls';
import { readSessionClock } from '../../data/moc';
import { YEAR_MINUTES } from '../../data/measure';
import { CLOSE_MIN, hhmm } from '../../data/ahead';
import { dayAxisFrom, dayAxisTo } from '../../data/dayAxis';
import { besideDot } from './besideDot';
import { nyMinutes } from '../../core/nyTime';
import { armLevel, removeAlert, useAlerts, type LevelName } from './alertStore';
import { useLevelsScope } from '../../data/levelsScope';
import { setDayHover, useDayHover } from '../../data/dayHover';
import { useResolvedTheme } from '../../theme/theme';
import { useRoomSpot } from '../../pages/pinpoint/useRoomScan';
import { undoable } from '../ui/undo';
import { CALL_WALL, FLIP, PUT_WALL, SUPREME, alpha, resolveInk } from './paletteInk';
import { CLOCK_SCALE, DAY_SCALE_W, dayChartOptions, dayClock, daySurface, dayStartOf, feedSeries } from './dayChart';
import type { Candle, GexSnapshot, MarketSnapshot } from '../../types/market';

const SILVER = 'rgb(var(--silver))';
const INK_3 = 'rgb(var(--text-muted))';
const fmtStrike = (v: number) => (!Number.isFinite(v) ? '—' : v % 1 === 0 ? v.toFixed(0) : v.toFixed(2));
const TAPE_KEY = 'slayer_map_tape';

interface Level {
  key: LevelName | 'pin';
  word: string;
  ink: string;
  price: number;
}

interface Props {
  snapshot: MarketSnapshot;
  /** The day so far, handed in — the Map's replay reads the bars up to its position */
  bars?: readonly Candle[];
  focus: number | null;
  onPick: (price: number) => void;
  scope?: ReactNode;
  /** Minutes from midnight ET the replay stands at — the cone starts there */
  at?: number | null;
  /** A part of the day box (DayBox.tsx): no head of its own, the facts in a row, the clock shared with the plot under it */
  part?: boolean;
}

/** The box's fold, remembered on this machine */
const readOpen = (): boolean => {
  try {
    return localStorage.getItem(TAPE_KEY) !== 'shut';
  } catch {
    return true;
  }
};

/** Levels on one price share one line and one chip — the highest of them names its ink (the strike column's rule) */
const PRIORITY: Level['key'][] = ['supreme', 'callWall', 'putWall', 'flip', 'pin'];
interface Group {
  key: string;
  price: number;
  levels: Level[];
  ink: string;
}

const TapeBox = ({ snapshot, bars: barsProp, focus, onPick, scope, at, part = false }: Props) => {
  const paper = useResolvedTheme() === 'light';
  const [openOwn, setOpen] = useState(readOpen);
  const open = part || openOwn;
  const toggle = () => {
    setOpen(v => {
      try {
        localStorage.setItem(TAPE_KEY, v ? 'shut' : 'open');
      } catch {
        /* storage off */
      }
      return !v;
    });
  };
  /* THE ROOM'S PRICE (pages/pinpoint/useRoomScan.ts useRoomSpot — one price on the page, 2026-10-14: this box's Last read
     455.52 under a head at 455.38): on the house the forming bar's close IS the tick (core/simulator.ts updateCandles),
     so the bars are read again on it and the line ends on the head's figure; a replay's bars are handed in and stand */
  const roomSpot = useRoomSpot(snapshot.ticker);
  const bars = useMemo(() => barsProp ?? sessionBars(snapshot.ticker) ?? [], [snapshot, barsProp, roomSpot]);
  /* the levels off today's contracts or every date — the desk's one choice (data/levelsScope.ts) */
  const levelsScope = useLevelsScope();
  const levels = useMemo<Level[]>(() => {
    try {
      /* the room's one reading of the levels (data/roomLevels.ts): the band's window and scope, so the tags here are the
         band's tags (the re-audit's H6) */
      const l = roomLevels(snapshot, levelsScope);
      if (!l) return [];
      const all: Level[] = [
        { key: 'callWall', word: 'Call wall', ink: CALL_WALL, price: l.callWall },
        { key: 'flip', word: 'Flip', ink: FLIP, price: l.flip },
        { key: 'putWall', word: 'Put wall', ink: PUT_WALL, price: l.putWall },
        { key: 'pin', word: 'Pin', ink: INK_3, price: l.pin },
        { key: 'supreme', word: 'Supreme', ink: SUPREME, price: l.supreme },
      ];
      return all.filter(x => Number.isFinite(x.price));
    } catch {
      return [];
    }
  }, [snapshot, levelsScope]);
  /* ONE LINE AND ONE CHIP WHERE LEVELS COINCIDE (the re-audit's M4) */
  const groups = useMemo<Group[]>(() => {
    const out: Group[] = [];
    for (const l of levels) {
      const g = out.find(x => Math.abs(x.price - l.price) < 1e-9);
      if (g) {
        g.levels.push(l);
        g.key = `${g.key}+${l.key}`;
      } else out.push({ key: l.key, price: l.price, levels: [l], ink: l.ink });
    }
    for (const g of out) {
      g.levels.sort((a, b) => PRIORITY.indexOf(a.key) - PRIORITY.indexOf(b.key));
      g.ink = g.levels[0].ink;
    }
    return out.sort((a, b) => b.price - a.price);
  }, [levels]);
  /* the lines are drawn again only when a level moves — the levels are read afresh every tick, the same prices */
  const groupsKey = groups.map(g => `${g.key}@${g.price}`).join('|');
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  /* THE FLIP'S PATH (idea 2, 2026-10-13): the flip of each minute's own book, paired to the bars by time. A closed
     minute's book never changes, so its flip is worked out once (kept by the book itself) — a tick re-reads the last. */
  const flipMemo = useRef(new WeakMap<GexSnapshot, number | null>());
  const flipTrail = useMemo<(LineData<Time> | WhitespaceData<Time>)[]>(() => {
    const snaps = bookMarket().getGexHistory(snapshot.ticker);
    if (!snaps?.length || !bars.length) return [];
    const byTime = new Map(snaps.map(s => [s.time, s]));
    return bars.map(b => {
      const s = byTime.get(b.time);
      let f: number | null | undefined = null;
      if (s) {
        f = flipMemo.current.get(s);
        if (f === undefined) {
          f = pickFlip(s.levels, b.close, l => l.value);
          flipMemo.current.set(s, f);
        }
      }
      return f != null && Number.isFinite(f) ? { time: b.time as UTCTimestamp, value: f } : { time: b.time as UTCTimestamp };
    });
  }, [snapshot.ticker, bars]);
  const alerts = useAlerts(snapshot.ticker);
  const watched = (key: Level['key']) => alerts.find(a => a.kind === 'level' && a.level === key && !a.firedAt);

  /* the clock: now, in session minutes — the replay's minute when rewound */
  const clock = readSessionClock();
  const [h, m] = clock.etTime.split(':').map(Number);
  const liveMin = h * 60 + m;
  const inSession = at != null ? true : clock.phase === 'OPEN' || clock.phase === 'AUCTION';
  /* the clock starts where the day's bars do (data/dayAxis.ts) — the book under it reads the same bars, so the same minute */
  const FROM = dayAxisFrom(bars[0]?.time);
  /* live, the axis is the session so far (dayAxis.ts); a replay and a closed day keep the whole session */
  const TO = dayAxisTo(bars[bars.length - 1]?.time, at == null && inSession);
  const nowMin = at != null ? Math.max(FROM, Math.min(TO, at)) : inSession ? Math.max(FROM, liveMin) : TO;
  const spot = bars.length ? bars[bars.length - 1].close : snapshot.spot;
  /* what "Last" prints: the room's price — the replay's last bar when rewound */
  const last = barsProp != null ? spot : roomSpot ?? spot;
  /* one expected move to the close, on the name's vol */
  const iv = bookMarket().cfg(snapshot.ticker)?.iv ?? 0.2;
  const minLeft = Math.max(0, CLOSE_MIN - nowMin);
  const w1 = spot * iv * Math.sqrt(minLeft / YEAR_MINUTES);
  const dayStart = bars.length ? dayStartOf(bars[0].time, nyMinutes(bars[0].time * 1000)) : 0;

  /* ---- the chart ---- */
  const hostRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceRef = useRef<ISeriesApi<'Line'> | null>(null);
  const flipRef = useRef<ISeriesApi<'Line'> | null>(null);
  const coneUpRef = useRef<ISeriesApi<'Line'> | null>(null);
  const coneDnRef = useRef<ISeriesApi<'Line'> | null>(null);
  const clockRef = useRef<ISeriesApi<'Line'> | null>(null);
  const linesRef = useRef<IPriceLine[]>([]);
  const fedPrice = useRef<readonly LineData<Time>[] | null>(null);
  const fedFlip = useRef<readonly (LineData<Time> | WhitespaceData<Time>)[] | null>(null);
  /* what the scale must hold beyond the bars: the levels within reach and the cone (read by the autoscale at draw time) */
  /* the cone as drawn: to the close, or cut at the axis' end while the session runs (the same share the series takes) */
  const coneShare = Math.max(0, Math.min(1, (Math.min(CLOSE_MIN, TO) - nowMin) / Math.max(1, CLOSE_MIN - nowMin)));
  const reachRef = useRef<{ levels: number[]; cone: [number, number] | null; spot: number }>({ levels: [], cone: null, spot });
  reachRef.current = { levels: [...levels.map(l => l.price), ...(focus != null ? [focus] : [])], cone: minLeft > 0 && bars.length && coneShare > 0 ? [spot - w1 * coneShare, spot + w1 * coneShare] : null, spot };
  const barsRef = useRef(bars);
  barsRef.current = bars;
  const indexOf = useMemo(() => new Map(bars.map((b, i) => [b.time, i] as const)), [bars]);
  const indexRef = useRef(indexOf);
  indexRef.current = indexOf;

  /* the hovered bar — the pointer's, or the keys' — and where its dot is on the chart */
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const hoverRef = useRef(hover);
  hoverRef.current = hover;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !open) return;
    const s = daySurface(host, paper);
    const chart = createChart(host, dayChartOptions(s, { clock: !part, logo: !part }));
    /* the scale holds the bars, the levels within reach of them, the cone and the kept strike — a level a day's range
       away would flatten the tape to a line, so it waits in the chips instead */
    const price = chart.addSeries(LineSeries, {
      color: s.ink,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerRadius: 3,
      priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      autoscaleInfoProvider: (original: () => { priceRange: { minValue: number; maxValue: number } } | null) => {
        const r = original();
        if (!r) return r;
        let lo = r.priceRange.minValue;
        let hi = r.priceRange.maxValue;
        const { levels: lv, cone, spot: sp } = reachRef.current;
        const reach = Math.max(hi - lo, sp * 0.004);
        for (const p of lv) if (p >= lo - reach && p <= hi + reach) {
          lo = Math.min(lo, p);
          hi = Math.max(hi, p);
        }
        if (cone) {
          lo = Math.min(lo, cone[0]);
          hi = Math.max(hi, cone[1]);
        }
        return { priceRange: { minValue: lo, maxValue: hi } };
      },
    });
    const flip = chart.addSeries(LineSeries, { color: alpha(resolveInk(FLIP, host), 0.55), lineWidth: 1, lineStyle: LineStyle.Dashed, lineType: LineType.WithSteps, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, autoscaleInfoProvider: () => null });
    const silver = resolveInk(SILVER, host);
    const coneOpts = { color: alpha(silver, 0.55), lineWidth: 1 as const, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false };
    const coneUp = chart.addSeries(LineSeries, coneOpts);
    const coneDn = chart.addSeries(LineSeries, coneOpts);
    /* the clock: whitespace on every minute of the session, so the axis is the day and holds still as bars come */
    /* the clock (dayChart.ts dayClock): every minute of the session, hidden, on a scale of its own */
    const clockS = chart.addSeries(LineSeries, { visible: false, priceScaleId: CLOCK_SCALE, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    chart.subscribeCrosshairMove(param => {
      /* the other plot's minute is set on this one from code — no pointer behind it, nothing to answer */
      if (!param.sourceEvent) {
        if (param.point === undefined && hoverRef.current) setHover(null);
        return;
      }
      if (param.point === undefined || param.time === undefined) {
        setHover(null);
        return;
      }
      const i = indexRef.current.get(param.time as number);
      const b = i != null ? barsRef.current[i] : null;
      if (i == null || !b) {
        setHover(null);
        return;
      }
      const x = chart.timeScale().timeToCoordinate(param.time) ?? param.point.x;
      const y = price.priceToCoordinate(b.close) ?? param.point.y;
      setHover({ i, x, y });
    });
    chartRef.current = chart;
    priceRef.current = price;
    flipRef.current = flip;
    coneUpRef.current = coneUp;
    coneDnRef.current = coneDn;
    clockRef.current = clockS;
    fedPrice.current = null;
    fedFlip.current = null;
    linesRef.current = [];
    return () => {
      chart.remove();
      chartRef.current = null;
      priceRef.current = null;
    };
  }, [paper, part, open]);

  /* the clock, when the day's span moves */
  useEffect(() => {
    const chart = chartRef.current;
    const c = clockRef.current;
    if (!chart || !c || !bars.length) return;
    c.setData(dayClock(dayStart, FROM, TO));
    chart.timeScale().fitContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayStart, FROM, TO, paper, part, open, bars.length > 0]);

  /* the price and the flip's path — the newest minute only, unless the day itself changed */
  const pricePoints = useMemo<LineData<Time>[]>(() => bars.map(b => ({ time: b.time as UTCTimestamp, value: b.close })), [bars]);
  useEffect(() => {
    if (priceRef.current) feedSeries(priceRef.current, pricePoints, fedPrice);
    if (flipRef.current) feedSeries(flipRef.current, flipTrail, fedFlip);
  }, [pricePoints, flipTrail, paper, part, open]);

  /* the cone: one expected move from the last bar to the close */
  useEffect(() => {
    const up = coneUpRef.current;
    const dn = coneDnRef.current;
    if (!up || !dn) return;
    if (minLeft > 0 && bars.length) {
      const t0 = bars[bars.length - 1].time as UTCTimestamp;
      /* to the close — or to the axis' end while the session runs, the same line cut there (a point past the end would
         pull the axis out to the close again) */
      const t1 = (dayStart + Math.min(CLOSE_MIN, TO) * 60) as UTCTimestamp;
      if (t1 > t0 && coneShare > 0) {
        up.setData([{ time: t0, value: spot }, { time: t1, value: spot + w1 * coneShare }]);
        dn.setData([{ time: t0, value: spot }, { time: t1, value: spot - w1 * coneShare }]);
        return;
      }
    }
    up.setData([]);
    dn.setData([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minLeft > 0, bars.length, spot, w1.toFixed(3), dayStart, TO, coneShare.toFixed(3), paper, part, open]);

  /* the levels as price lines — named on the line, priced on the scale — and the kept strike in silver */
  useEffect(() => {
    const series = priceRef.current;
    const host = hostRef.current;
    if (!series || !host) return;
    for (const l of linesRef.current) series.removePriceLine(l);
    linesRef.current = groupsRef.current.map(g =>
      series.createPriceLine({
        price: g.price,
        color: g.levels[0].key === 'pin' ? alpha(resolveInk(g.ink, host), 0.7) : resolveInk(g.ink, host),
        lineWidth: 1,
        lineStyle: g.levels[0].key === 'flip' ? LineStyle.Dashed : g.levels[0].key === 'pin' ? LineStyle.Dotted : LineStyle.Solid,
        axisLabelVisible: true,
        title: g.levels.map(l => l.word).join(' · '),
      })
    );
    if (focus != null) linesRef.current.push(series.createPriceLine({ price: focus, color: resolveInk(SILVER, host), lineWidth: 2, lineStyle: LineStyle.Solid, axisLabelVisible: true, title: 'Kept' }));
  }, [groupsKey, focus, paper, part, open]);

  /* THE KEPT STRIKE OFF THE SCALE (the owner, 2026-10-14, after a walk as a user: 463 kept, seven points up, and the tape
     showed nothing — no line, no chip, no word, under a note that had promised "every box"): the scale holds a kept strike
     within reach of the day's range (the provider above) and a strike beyond it would flatten the tape to a line, so it
     stays off — but a chip in the row and a tag at the plot's edge say so, and which way. Read off the drawn chart
     after every render: where the strike's price lands against the pane. */
  const [keptOff, setKeptOff] = useState<'up' | 'down' | null>(null);
  useEffect(() => {
    const series = priceRef.current;
    const chart = chartRef.current;
    if (!series || !chart || focus == null || !open || !bars.length) {
      setKeptOff(k => (k === null ? k : null));
      return;
    }
    const id = requestAnimationFrame(() => {
      const y = series.priceToCoordinate(focus);
      const h = chart.paneSize().height;
      const next: 'up' | 'down' | null = y == null ? (focus > spot ? 'up' : 'down') : y < 0 ? 'up' : y > h ? 'down' : null;
      setKeptOff(k => (k === next ? k : next));
    });
    return () => cancelAnimationFrame(id);
  });

  /* THE MINUTE, SHARED (idea 1): the pointer's minute is told to the plot under it, and its pointer's minute is set here
     as this chart's own crosshair — one clock, one rule across both */
  const hb = hover != null ? bars[hover.i] : null;
  const shared = useDayHover();
  useEffect(() => {
    if (!part) return;
    setDayHover(hb ? { min: nyMinutes(hb.time * 1000), from: 'tape' } : null);
  }, [part, hb]);
  useEffect(() => () => setDayHover(null), []);
  useEffect(() => {
    const chart = chartRef.current;
    const series = priceRef.current;
    if (!chart || !series || hover) return;
    if (part && shared?.from === 'through' && bars.length) {
      const t = dayStart + shared.min * 60;
      const i = indexOf.get(t);
      if (i != null) {
        chart.setCrosshairPosition(bars[i].close, t as UTCTimestamp, series);
        return;
      }
    }
    chart.clearCrosshairPosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shared, hover == null, part]);

  /* the keys walk the bars: the crosshair and the card go with them */
  const walk = (i: number) => {
    const chart = chartRef.current;
    const series = priceRef.current;
    const b = bars[i];
    if (!chart || !series || !b) return;
    chart.setCrosshairPosition(b.close, b.time as UTCTimestamp, series);
    setHover({ i, x: chart.timeScale().timeToCoordinate(b.time as UTCTimestamp) ?? 0, y: series.priceToCoordinate(b.close) ?? 0 });
  };
  const onKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !bars.length) return;
    const cur = hover?.i ?? bars.length - 1;
    if (e.key === 'ArrowLeft') walk(Math.max(0, cur - 1));
    else if (e.key === 'ArrowRight') walk(Math.min(bars.length - 1, cur + 1));
    else if (e.key === 'Home') walk(0);
    else if (e.key === 'End') walk(bars.length - 1);
    else if (e.key === 'Escape') {
      setHover(null);
      chartRef.current?.clearCrosshairPosition();
    } else return;
    e.preventDefault();
  };
  useEffect(() => setHover(h => (h && h.i < bars.length ? h : null)), [bars]);

  /* the nearest level to the hovered close, in words */
  const nearLevel = (price: number) => {
    let best: Level | null = null;
    for (const l of levels) if (!best || Math.abs(l.price - price) < Math.abs(best.price - price)) best = l;
    if (!best) return '';
    const d = price - best.price;
    return `${Math.abs(d) < 0.005 ? 'on' : `${Math.abs(d).toFixed(2)} ${d > 0 ? 'over' : 'under'}`} the ${best.word.toLowerCase()}`;
  };
  /* "the put wall, the pin and the supreme" — a group's levels in one breath */
  const say = (ws: string[]) => (ws.length <= 1 ? ws[0] ?? '' : `${ws.slice(0, -1).join(', ')} and ${ws[ws.length - 1]}`);
  const plotW = hostRef.current?.clientWidth ?? 0;
  const session = useMemo(() => (bars.length ? { lo: Math.min(...bars.map(b => b.low)), hi: Math.max(...bars.map(b => b.high)) } : null), [bars]);

  /* THE LEVELS' CHIPS: keep the strike, or set the alert — the chart names the lines, the chips act on them */
  const chips = (groups.length > 0 || focus != null) && (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1" data-tape-chips>
      {groups.map(g => {
        const on = focus != null && Math.abs(focus - g.price) < 1e-9;
        const alertable = g.levels.filter((l): l is Level & { key: LevelName } => l.key !== 'pin');
        const armed = alertable.map(l => watched(l.key)).filter((a): a is NonNullable<typeof a> => !!a);
        const words = say(g.levels.map(l => l.word.toLowerCase()));
        const bellWords = say(alertable.map(l => l.word.toLowerCase()));
        return (
          <span key={g.key} className={`inline-flex items-center rounded-md ${on ? 'bg-silver/[0.1]' : ''}`} data-tape-tag={g.key}>
            <button
              type="button"
              onClick={() => onPick(g.price)}
              aria-pressed={on}
              title={`${words} ${fmtStrike(g.price)} — click to keep the strike${alertable.length === 0 ? ' · no bell: the pin is where price settles, not a line it crosses' : ''}`}
              className="hit inline-flex items-center gap-1.5 h-6 pl-2 pr-1 rounded-md font-mono text-[11px] whitespace-nowrap hover:bg-ink/[0.05] transition-colors"
            >
              <span className="flex items-center gap-1">
                {g.levels.map((l, i) => (
                  <span key={l.key} style={{ color: l.ink }}>
                    {i > 0 && <span className="text-textMuted">·</span>}
                    {l.word}
                  </span>
                ))}
              </span>
              <span className="font-semibold tnum text-textPrimary">{fmtStrike(g.price)}</span>
            </button>
            {alertable.length > 0 && (
              <button
                type="button"
                /* IT SAYS IT TOOK (the owner, 2026-10-14 — "arming a bell gives no confirmation … I wasn't sure it took"): the
                   shell's own chip, with the way back (ui/undo.tsx) — "Bell set on the call wall 457 · Undo" */
                onClick={() => {
                  const t = snapshot.ticker;
                  if (armed.length) {
                    const gone = armed;
                    gone.forEach(a => removeAlert(t, a.id));
                    undoable({ label: `Bell off the ${bellWords} ${fmtStrike(g.price)}`, undo: () => gone.forEach(a => a.kind === 'level' && armLevel(t, a.level)), key: `tape-bell-${g.key}` });
                  } else {
                    const set = alertable.map(l => armLevel(t, l.key)).filter((a): a is NonNullable<typeof a> => !!a);
                    undoable({ label: `Bell set on the ${bellWords} ${fmtStrike(g.price)}`, undo: () => set.forEach(a => removeAlert(t, a.id)), key: `tape-bell-${g.key}` });
                  }
                }}
                aria-pressed={armed.length > 0}
                title={armed.length ? `Watching the ${bellWords} — click to stop` : `Tell me when price crosses the ${bellWords}`}
                className={`hit inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors ${armed.length ? 'text-silver' : 'text-textMuted hover:text-textPrimary hover:bg-ink/[0.05]'}`}
                data-tape-alert={alertable.map(l => l.key).join('+')}
                data-watching={armed.length ? '' : undefined}
              >
                {armed.length ? <BellRing className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
              </button>
            )}
          </span>
        );
      })}
      {/* THE KEPT STRIKE'S OWN CHIP, when it is no level's: on the scale it is the silver line; off it, the chip says which
          way it lies, and the tag at the plot's edge points there */}
      {focus != null && !groups.some(g => Math.abs(g.price - focus) < 1e-9) && (
        <span className="inline-flex items-center rounded-md bg-silver/[0.1]" data-tape-tag="kept" data-tape-kept-off={keptOff ?? undefined}>
          <button
            type="button"
            onClick={() => onPick(focus)}
            aria-pressed
            title={`Kept ${fmtStrike(focus)}${keptOff ? ` — ${Math.abs(focus - spot).toFixed(2)} ${keptOff === 'up' ? 'above' : 'below'} the chart's top: a line that far would flatten the tape` : ''} · click to let go`}
            className="hit inline-flex items-center gap-1.5 h-6 px-2 rounded-md font-mono text-[11px] whitespace-nowrap hover:bg-ink/[0.05] transition-colors"
          >
            <span className="text-silver">Kept</span>
            <span className="font-semibold tnum text-textPrimary">{fmtStrike(focus)}</span>
            {keptOff && (
              <span className="text-textMuted">
                · {keptOff === 'up' ? '↑' : '↓'} {Math.abs(focus - spot).toFixed(2)} {keptOff === 'up' ? 'above' : 'below'} the chart
              </span>
            )}
          </button>
        </span>
      )}
    </div>
  );

  return (
    <section className={`relative flex flex-col min-w-0 ${part ? 'flex-1' : ''}`} data-tape-box data-tape-open={open || undefined} data-tape-part={part || undefined}>
      <div className={part ? 'px-5 pt-2 pb-2 flex items-end gap-x-6 gap-y-2 flex-wrap' : 'px-5 pt-4 pb-3 flex items-start gap-6 flex-wrap'}>
        {part ? (
          <span className="font-mono text-[11px] uppercase tracking-widest text-textMuted" data-tape-part-word>
            The tape
          </span>
        ) : (
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-[16px] font-semibold leading-tight text-textPrimary">The tape</h3>
              {scope}
              <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                title={open ? 'Fold the tape away' : 'Show the tape'}
                className="hit inline-flex items-center gap-1 h-6 px-1.5 rounded-md text-[11px] text-textMuted hover:text-textPrimary hover:bg-ink/[0.05] transition-colors"
                data-tape-fold
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${open ? '' : '-rotate-90'}`} />
                {open ? 'Fold' : 'Unfold'}
              </button>
            </div>
            <p className="mt-0.5 text-[11px] text-textMuted">Today's price with the book's levels on it</p>
          </div>
        )}
        {bars.length > 0 && session && (
          <dl className={part ? 'flex flex-wrap gap-x-6 gap-y-1' : 'grid grid-cols-3 gap-x-6'}>
            <div>
              <dt className="text-[11px] text-textMuted">Last</dt>
              <dd className="mt-0.5 font-mono text-[14px] tnum text-textPrimary whitespace-nowrap" data-tape-last={last.toFixed(2)}>
                {last.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-textMuted">Session</dt>
              <dd className="mt-0.5 font-mono text-[14px] tnum text-textPrimary whitespace-nowrap">
                {session.lo.toFixed(2)} – {session.hi.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-textMuted">One move to the close</dt>
              <dd className="mt-0.5 font-mono text-[14px] tnum text-textPrimary whitespace-nowrap" data-tape-move={w1.toFixed(2)}>
                {minLeft > 0 ? `±${w1.toFixed(2)} · ${minLeft} ${minLeft === 1 ? 'minute' : 'minutes'} left` : 'closed'}
              </dd>
            </div>
          </dl>
        )}
        {part && <div className="ml-auto">{chips}</div>}
      </div>
      {!part && open && chips && <div className="px-5 pb-2">{chips}</div>}
      {open && (
        /* AS A PART OF THE DAY BOX the plot takes its share of the box's height — 240 at least, more when the box stands
           beside the book and is stretched to its height (2026-10-13) */
        <div className={part ? 'flex-1 flex flex-col border-t border-borderSubtle/60' : 'border-t border-borderSubtle/60'}>
          <div
            className={`relative ${part ? 'flex-[1_1_240px] min-h-[150px]' : 'h-[260px]'} outline-none`}
            tabIndex={0}
            role="group"
            aria-label={`${snapshot.ticker}'s tape with the book's levels — the arrow keys walk the bars`}
            onKeyDown={onKeys}
            data-tape-plot
          >
            <div ref={hostRef} className="absolute inset-0" data-tape-chart />
            {/* the pointer's minute — Compare's glass, beside the point it reads */}
            {hb && hover && (
              <div
                className="pointer-events-none absolute z-10 whitespace-nowrap rounded-md border border-borderSubtle px-2.5 py-1.5 font-mono text-[11px] text-textSecondary"
                style={{ ...besideDot(hover.x, hover.y, hover.x > plotW / 2), background: 'rgba(8,8,10,0.88)', backdropFilter: 'blur(3px)' }}
                data-theme="dark"
                data-chart-glass
                data-tape-card={hhmm(nyMinutes(hb.time * 1000))}
              >
                <span className="font-bold tnum text-textPrimary">{hhmm(nyMinutes(hb.time * 1000))}</span>
                <span className="ml-2 tnum text-textPrimary">{hb.close.toFixed(2)}</span>
                <span className="ml-2 text-textMuted">{nearLevel(hb.close)}</span>
              </div>
            )}
            {/* the kept strike's tag at the edge it lies beyond, beside the scale — silver, the line's own ink */}
            {focus != null && keptOff && (
              <div
                className="pointer-events-none absolute z-10 whitespace-nowrap rounded-sm border border-silver/50 bg-panel/90 px-1.5 py-0.5 font-mono text-[11px] text-silver"
                style={{ right: DAY_SCALE_W + 8, ...(keptOff === 'up' ? { top: 4 } : { bottom: 4 }) }}
                data-tape-kept-edge={keptOff}
              >
                {keptOff === 'up' ? '▲' : '▼'} Kept {fmtStrike(focus)} · {Math.abs(focus - spot).toFixed(2)} {keptOff === 'up' ? 'above' : 'below'}
              </div>
            )}
            {bars.length === 0 && <div className="absolute inset-0 grid place-items-center font-mono text-[11px] uppercase tracking-widest text-textMuted">No bars yet this session</div>}
          </div>
        </div>
      )}
    </section>
  );
};

export default TapeBox;
