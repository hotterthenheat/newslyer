/*
==================================================
  SLAYER TERMINAL - THE TAPE (components/gex/TapeBox.tsx)

  Today's price with the book's levels ON it (the
  competitive audit, 2026-10-13 — "levels on the
  trader's own chart" is the first thing every
  practitioner asks a dealer-positioning tool for,
  and the Map sent them to another page for it). One
  session, 09:30 to 16:00 New York, the close as a
  line; the call wall, the flip, the put wall, the
  pin and the supreme as rules across it, each with a
  tag at the right edge that KEEPS the strike, and a
  bell beside it that sets an alert on the level
  (components/gex/alertStore.ts armLevel — the same
  alert the Alerts drawer arms); ahead of now, the
  shaded cone is one expected move to the close on
  the name's vol. The replay rewinds it with the
  rest of the page. Hover for the minute; the arrow
  keys walk the bars.

  Plain SVG, the profile's hand — the full chart,
  drawings and all, is Terrain's; this is the tape
  with the levels on it and nothing else.
==================================================
*/

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Bell, BellRing, ChevronDown } from 'lucide-react';
import { roomLevels } from '../../data/roomLevels';
import { sessionBars } from '../../data/levelview';
import { bookMarket, isFeedSnap } from '../../data/bookMarket';
import { pickFlip } from '../../core/walls';
import { readSessionClock } from '../../data/moc';
import { YEAR_MINUTES } from '../../data/measure';
import { CLOSE_MIN, OPEN_MIN, hhmm } from '../../data/ahead';
import { nyMinutes } from '../../core/nyTime';
import { armLevel, removeAlert, useAlerts, type LevelName } from './alertStore';
import { useLevelsScope } from '../../data/levelsScope';
import { setDayHover, useDayHover } from '../../data/dayHover';
import { CALL_WALL, FLIP, PUT_WALL, SUPREME, alpha } from './paletteInk';
import type { Candle, MarketSnapshot } from '../../types/market';

const SILVER = 'rgb(var(--silver))';
const INK = 'rgb(var(--text-primary))';
const INK_3 = 'rgb(var(--text-muted))';
const RULE = 'rgb(var(--ink) / 0.12)';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const fmtStrike = (v: number) => (!Number.isFinite(v) ? '—' : v % 1 === 0 ? v.toFixed(0) : v.toFixed(2));
const ML = 8;
const ML_PART = 64; /* as a part of the day box: the net gamma's y labels sit in the margin under it, so the clocks align */
const MB_PART = 8; /* …and the hours are printed once, under the lower plot */
const MR_WIDE = 150; /* the tags' lane */
const MR_OVER = 24; /* a phone's plot keeps the day — the tags sit over its right edge instead (the re-audit's L8) */
const MT = 10;
const MB = 22;
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

const TapeBox = ({ snapshot, bars: barsProp, focus, onPick, scope, at, part = false }: Props) => {
  const ml = part ? ML_PART : ML;
  const mb = part ? MB_PART : MB;
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
  const bars = useMemo(() => barsProp ?? sessionBars(snapshot.ticker) ?? [], [snapshot, barsProp]);
  /* the levels off today's contracts or every date — the desk's one choice (data/levelsScope.ts) */
  const levelsScope = useLevelsScope();
  const levels = useMemo<Level[]>(() => {
    try {
      /* the room's one reading of the levels (data/roomLevels.ts): the band's window and scope, so the tags here are the
         band's tags (the re-audit's H6) */
      const l = roomLevels(snapshot, levelsScope);
      if (!l) return [];
      const all: Level[] = [
        { key: 'callWall', word: 'CALL WALL', ink: CALL_WALL, price: l.callWall },
        { key: 'flip', word: 'FLIP', ink: FLIP, price: l.flip },
        { key: 'putWall', word: 'PUT WALL', ink: PUT_WALL, price: l.putWall },
        { key: 'pin', word: 'PIN', ink: INK_3, price: l.pin },
        { key: 'supreme', word: 'SUPREME', ink: SUPREME, price: l.supreme },
      ];
      return all.filter(x => Number.isFinite(x.price));
    } catch {
      return [];
    }
  }, [snapshot, levelsScope]);
  /* THE FLIP'S PATH (idea 2, 2026-10-13): the flip of each minute's own book, paired to the bars by time — the line the
     gauge counts crossings of, drawn on the price rather than left as a number. A minute with no book, or a one-sided
     book, breaks the path. */
  const flipTrail = useMemo(() => {
    const snaps = bookMarket().getGexHistory(snapshot.ticker);
    if (!snaps?.length || !bars.length) return [] as { min: number; flip: number | null }[];
    const byTime = new Map(snaps.map(s => [s.time, s]));
    return bars.map(b => {
      const s = byTime.get(b.time);
      return { min: nyMinutes(b.time * 1000), flip: s ? pickFlip(s.levels, b.close, l => l.value) : null };
    });
  }, [snapshot.ticker, bars]);
  const simulated = !isFeedSnap(snapshot);
  const alerts = useAlerts(snapshot.ticker);
  const watched = (key: Level['key']) => alerts.find(a => a.kind === 'level' && a.level === key && !a.firedAt);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const read = () => setBox(prev => (prev.w === el.clientWidth && prev.h === el.clientHeight ? prev : { w: el.clientWidth, h: el.clientHeight }));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  /* the clock: now, in session minutes — the replay's minute when rewound */
  const clock = readSessionClock();
  const [h, m] = clock.etTime.split(':').map(Number);
  const liveMin = h * 60 + m;
  const inSession = at != null ? true : clock.phase === 'OPEN' || clock.phase === 'AUCTION';
  const nowMin = at != null ? Math.max(OPEN_MIN, Math.min(CLOSE_MIN, at)) : inSession ? liveMin : CLOSE_MIN;
  const spot = bars.length ? bars[bars.length - 1].close : snapshot.spot;
  /* one expected move to the close, on the name's vol */
  const iv = bookMarket().cfg(snapshot.ticker)?.iv ?? 0.2;
  const minLeft = Math.max(0, CLOSE_MIN - nowMin);
  const w1 = spot * iv * Math.sqrt(minLeft / YEAR_MINUTES);

  /* the scales: the session across, price up — the bars' range and the levels within reach of it */
  const W = box.w;
  const H = box.h;
  const over = W > 0 && W < 520;
  const MR = over ? MR_OVER : MR_WIDE;
  const plotW = Math.max(10, W - ml - MR);
  const plotH = Math.max(10, H - MT - mb);
  const xOfMin = (min: number) => ml + ((min - OPEN_MIN) / (CLOSE_MIN - OPEN_MIN)) * plotW;
  const minOf = (b: Candle) => nyMinutes(b.time * 1000);
  const { lo, hi } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const b of bars) {
      lo = Math.min(lo, b.low);
      hi = Math.max(hi, b.high);
    }
    if (!Number.isFinite(lo)) {
      lo = spot * 0.995;
      hi = spot * 1.005;
    }
    const reach = Math.max(hi - lo, spot * 0.004);
    for (const l of levels) if (l.price >= lo - reach && l.price <= hi + reach) {
      lo = Math.min(lo, l.price);
      hi = Math.max(hi, l.price);
    }
    if (minLeft > 0) {
      lo = Math.min(lo, spot - w1);
      hi = Math.max(hi, spot + w1);
    }
    const pad = (hi - lo) * 0.08 || spot * 0.002;
    return { lo: lo - pad, hi: hi + pad };
  }, [bars, levels, spot, w1, minLeft]);
  const yOf = (p: number) => MT + ((hi - p) / Math.max(1e-9, hi - lo)) * plotH;

  /* the hovered bar — the pointer's, or the keys' */
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => setHover(null), [bars]);
  const nearest = (clientX: number) => {
    const r = hostRef.current?.getBoundingClientRect();
    if (!r || !bars.length) return null;
    const min = OPEN_MIN + ((clientX - r.left - ml) / plotW) * (CLOSE_MIN - OPEN_MIN);
    let best = 0;
    for (let i = 1; i < bars.length; i++) if (Math.abs(minOf(bars[i]) - min) < Math.abs(minOf(bars[best]) - min)) best = i;
    return best;
  };
  const onKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !bars.length) return;
    const cur = hover ?? bars.length - 1;
    if (e.key === 'ArrowLeft') setHover(Math.max(0, cur - 1));
    else if (e.key === 'ArrowRight') setHover(Math.min(bars.length - 1, cur + 1));
    else if (e.key === 'Home') setHover(0);
    else if (e.key === 'End') setHover(bars.length - 1);
    else return;
    e.preventDefault();
  };
  const hb = hover != null ? bars[hover] : null;
  /* THE MINUTE, SHARED (idea 1): as a part of the day box the pointer's minute is told to the plot under it, and its
     pointer's minute drawn here as a quiet rule */
  const shared = useDayHover();
  useEffect(() => {
    if (!part) return;
    setDayHover(hb ? { min: minOf(hb), from: 'tape' } : null);
  }, [part, hb]);
  useEffect(() => () => setDayHover(null), []);
  const otherMin = part && hb == null && shared?.from === 'through' ? shared.min : null;
  /* the nearest level to the hovered close, in words */
  const nearLevel = (price: number) => {
    let best: Level | null = null;
    for (const l of levels) if (!best || Math.abs(l.price - price) < Math.abs(best.price - price)) best = l;
    if (!best) return '';
    const d = price - best.price;
    return `${Math.abs(d) < 0.005 ? 'on' : `${Math.abs(d).toFixed(2)} ${d > 0 ? 'over' : 'under'}`} the ${best.word.toLowerCase()}`;
  };

  const path = bars.map((b, i) => `${i ? 'L' : 'M'}${xOfMin(minOf(b)).toFixed(1)} ${yOf(b.close).toFixed(1)}`).join(' ');
  const area = bars.length ? `${path} L${xOfMin(minOf(bars[bars.length - 1])).toFixed(1)} ${(MT + plotH).toFixed(1)} L${xOfMin(minOf(bars[0])).toFixed(1)} ${(MT + plotH).toFixed(1)} Z` : '';
  const flipPath = (() => {
    let d = '';
    let pen = false;
    for (const p of flipTrail) {
      if (p.flip == null || p.flip < lo || p.flip > hi) {
        pen = false;
        continue;
      }
      d += `${pen ? 'L' : 'M'}${xOfMin(p.min).toFixed(1)} ${yOf(p.flip).toFixed(1)} `;
      pen = true;
    }
    return d;
  })();
  const xNow = xOfMin(nowMin);
  const xClose = xOfMin(CLOSE_MIN);
  const cone = minLeft > 0 && bars.length ? `M${xNow.toFixed(1)} ${yOf(spot).toFixed(1)} L${xClose.toFixed(1)} ${yOf(spot + w1).toFixed(1)} L${xClose.toFixed(1)} ${yOf(spot - w1).toFixed(1)} Z` : '';
  /* a narrow plot (a phone) holds four hours, not eight — the labels overprinted at 390px */
  const hours = plotW < 480 ? [OPEN_MIN, 12 * 60, 14 * 60, CLOSE_MIN] : [OPEN_MIN, 10 * 60, 11 * 60, 12 * 60, 13 * 60, 14 * 60, 15 * 60, CLOSE_MIN];
  /* ONE TAG WHERE LEVELS COINCIDE (the re-audit's M4): the report prints one row for levels on one strike; the tape
     printed three tags. Levels that share a price share a tag, their words stacked in their own inks; its bell arms
     every level in it that an alert can watch. */
  const groups = (() => {
    const out: { key: string; price: number; levels: Level[]; h: number }[] = [];
    for (const l of levels) {
      const g = out.find(x => Math.abs(x.price - l.price) < 1e-9);
      if (g) {
        g.levels.push(l);
        g.key = `${g.key}+${l.key}`;
      } else out.push({ key: l.key, price: l.price, levels: [l], h: 18 });
    }
    for (const g of out) if (g.levels.length > 1) g.h = 6 + 12 * g.levels.length;
    return out;
  })();
  /* the tags in the right lane, pushed apart when two sit within each other's height, and kept inside the plot */
  const tagYs = (() => {
    const sorted = [...groups].map(g => ({ g, y: yOf(g.price) })).sort((a, b) => a.y - b.y);
    const room = (a: { g: { h: number } }, b: { g: { h: number } }) => a.g.h / 2 + b.g.h / 2 + 2;
    for (let i = 1; i < sorted.length; i++) if (sorted[i].y - sorted[i - 1].y < room(sorted[i - 1], sorted[i])) sorted[i].y = sorted[i - 1].y + room(sorted[i - 1], sorted[i]);
    for (let i = sorted.length - 2; i >= 0; i--) if (sorted[i + 1].y - sorted[i].y < room(sorted[i], sorted[i + 1])) sorted[i].y = sorted[i + 1].y - room(sorted[i], sorted[i + 1]);
    if (sorted.length) {
      /* …and above the hours' band at the foot (a phone's tags sit over the plot) */
      const tail = sorted[sorted.length - 1];
      const down = Math.max(0, tail.y + tail.g.h / 2 - (H - mb + 2));
      for (const s of sorted) s.y -= down;
      const up = Math.max(0, MT + sorted[0].g.h / 2 - sorted[0].y);
      for (const s of sorted) s.y += up;
    }
    return new Map(sorted.map(s => [s.g.key, s.y]));
  })();
  /* "the put wall, the pin and the supreme" — a group's levels in one breath */
  const say = (ws: string[]) => (ws.length <= 1 ? ws[0] ?? '' : `${ws.slice(0, -1).join(', ')} and ${ws[ws.length - 1]}`);

  return (
    <section className="relative flex flex-col min-w-0" data-tape-box data-tape-open={open || undefined} data-tape-part={part || undefined}>
      <div className={part ? 'px-5 pt-2 pb-2 flex items-end gap-6 flex-wrap' : 'px-5 pt-4 pb-3 flex items-start gap-6 flex-wrap'}>
        {part ? (
          <span className="font-mono text-[11px] uppercase tracking-widest text-textMuted" data-tape-part-word>
            The tape
          </span>
        ) : (
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-[15px] font-semibold leading-tight text-textPrimary">The tape</h3>
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
          <p className="mt-0.5 text-[11px] text-textMuted">Today's price with the book's levels on it and the flip's path as it moved · a tag keeps the strike, its bell sets an alert on the level · the cone ahead is one expected move to the close</p>
        </div>
        )}
        {bars.length > 0 && (
          <dl className={part ? 'flex flex-wrap gap-x-6 gap-y-1' : 'grid grid-cols-3 gap-x-6'}>
            <div>
              <dt className="text-[11px] text-textMuted">Last</dt>
              <dd className="mt-0.5 font-mono text-[12px] tnum text-textPrimary whitespace-nowrap">{spot.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-textMuted">Session</dt>
              <dd className="mt-0.5 font-mono text-[12px] tnum text-textPrimary whitespace-nowrap">
                {Math.min(...bars.map(b => b.low)).toFixed(2)} – {Math.max(...bars.map(b => b.high)).toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-textMuted">One move to the close</dt>
              <dd className="mt-0.5 font-mono text-[12px] tnum text-textPrimary whitespace-nowrap" data-tape-move={w1.toFixed(2)}>
                {minLeft > 0 ? `±${w1.toFixed(2)} · ${minLeft} ${minLeft === 1 ? 'minute' : 'minutes'} left` : 'closed'}
              </dd>
            </div>
          </dl>
        )}
      </div>
      {open && (
        <div className="px-3 pb-3">
          <div
            ref={hostRef}
            className="relative h-[240px] rounded-md border border-borderSubtle/60 bg-inset outline-none"
            tabIndex={0}
            role="group"
            aria-label={`${snapshot.ticker}'s tape with the book's levels — the arrow keys walk the bars`}
            onKeyDown={onKeys}
            onPointerMove={e => setHover(nearest(e.clientX))}
            onPointerLeave={() => setHover(null)}
            data-tape-plot
          >
            {W > 0 && H > 0 && (
              <svg width={W} height={H} className="block" role="img" aria-label={`${snapshot.ticker} today, ${bars.length} minute bars, last ${spot.toFixed(2)}`}>
                {/* the hours */}
                {hours.map(t => (
                  <g key={t}>
                    <line x1={xOfMin(t)} x2={xOfMin(t)} y1={MT} y2={MT + plotH} stroke={RULE} />
                    {!part && (
                      <text x={xOfMin(t)} y={H - 7} textAnchor={t === OPEN_MIN ? 'start' : t === CLOSE_MIN ? 'end' : 'middle'} fontFamily={MONO} fontSize={11} fill={INK_3}>
                        {hhmm(t)}
                      </text>
                    )}
                  </g>
                ))}
                {/* the flip's path through the day, under the levels */}
                {flipPath && <path d={flipPath} fill="none" stroke={FLIP} strokeOpacity={0.7} strokeWidth={1} strokeDasharray="2 2" strokeLinejoin="round" data-tape-flip-path />}
                {/* the house book says so on the chart itself, not only on the door (idea 5) */}
                {simulated && (
                  <text x={ml + 6} y={MT + plotH - 6} fontFamily={MONO} fontSize={11} fill={INK_3} opacity={0.8} data-simulated-mark>
                    simulated
                  </text>
                )}
                {/* the cone ahead: one expected move to the close */}
                {cone && <path d={cone} fill={alpha(SILVER, 0.1)} stroke={SILVER} strokeOpacity={0.35} strokeDasharray="3 3" />}
                {/* the levels */}
                {levels.map(l => (
                  <line key={l.key} x1={ml} x2={W - MR + 6} y1={yOf(l.price)} y2={yOf(l.price)} stroke={l.ink} strokeOpacity={l.key === 'pin' ? 0.5 : 0.75} strokeDasharray={l.key === 'flip' ? '3 3' : undefined} data-tape-level={l.key} />
                ))}
                {/* the kept strike */}
                {focus != null && focus >= lo && focus <= hi && <line x1={ml} x2={W - MR + 6} y1={yOf(focus)} y2={yOf(focus)} stroke={SILVER} strokeOpacity={0.9} strokeWidth={1.5} data-tape-kept={focus} />}
                {/* the price */}
                {area && <path d={area} fill={alpha(INK, 0.06)} />}
                {path && <path d={path} fill="none" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />}
                {/* now */}
                {bars.length > 0 && <line x1={xNow} x2={xNow} y1={MT} y2={MT + plotH} stroke={SILVER} strokeOpacity={0.6} />}
                {/* the other plot's minute, as a part of the day box */}
                {otherMin != null && <line x1={xOfMin(otherMin)} x2={xOfMin(otherMin)} y1={MT} y2={MT + plotH} stroke={SILVER} strokeOpacity={0.35} strokeDasharray="2 2" data-tape-shared-minute />}
                {/* the pointer's bar */}
                {hb && (
                  <g>
                    <line x1={xOfMin(minOf(hb))} x2={xOfMin(minOf(hb))} y1={MT} y2={MT + plotH} stroke={SILVER} strokeOpacity={0.4} />
                    <circle cx={xOfMin(minOf(hb))} cy={yOf(hb.close)} r={3.5} fill={SILVER} />
                  </g>
                )}
              </svg>
            )}
            {/* the tags: keep the strike, or set the alert */}
            {W > 0 &&
              groups.map(g => {
                const on = focus != null && Math.abs(focus - g.price) < 1e-9;
                const alertable = g.levels.filter((l): l is Level & { key: LevelName } => l.key !== 'pin');
                const armed = alertable.map(l => watched(l.key)).filter((a): a is NonNullable<typeof a> => !!a);
                const words = say(g.levels.map(l => l.word.toLowerCase()));
                const bellWords = say(alertable.map(l => l.word.toLowerCase()));
                const y = tagYs.get(g.key) ?? 0;
                return (
                  <div key={g.key} className={`absolute flex items-center gap-1 ${over ? 'rounded bg-inset/90' : ''}`} style={over ? { right: 6, top: y - g.h / 2 } : { left: W - MR + 10, top: y - g.h / 2 }} data-tape-tag={g.key}>
                    <button
                      type="button"
                      onClick={() => onPick(g.price)}
                      title={`${words} ${fmtStrike(g.price)} — click to keep the strike${alertable.length === 0 ? ' · no bell: the pin is where price settles, not a line it crosses' : ''}`}
                      className={`hit inline-flex items-center gap-1.5 rounded px-1.5 font-mono text-[11px] font-bold tracking-wider transition-colors ${on ? 'bg-silver/[0.12]' : 'hover:bg-ink/[0.06]'}`}
                      style={{ height: g.h }}
                    >
                      <span className="flex flex-col leading-[12px]">
                        {g.levels.map(l => (
                          <span key={l.key} className={on ? 'text-textPrimary' : undefined} style={{ color: on ? undefined : l.ink }}>
                            {l.word}
                          </span>
                        ))}
                      </span>
                      <span className="font-semibold tnum text-textPrimary">{fmtStrike(g.price)}</span>
                    </button>
                    {alertable.length > 0 && (
                      <button
                        type="button"
                        onClick={() => (armed.length ? armed.forEach(a => removeAlert(snapshot.ticker, a.id)) : alertable.forEach(l => armLevel(snapshot.ticker, l.key)))}
                        aria-pressed={armed.length > 0}
                        title={armed.length ? `Watching the ${bellWords} — click to stop` : `Tell me when price crosses the ${bellWords}`}
                        className={`hit inline-flex h-[18px] w-[18px] items-center justify-center rounded transition-colors ${armed.length ? 'text-silver' : 'text-textMuted hover:text-textPrimary hover:bg-ink/[0.06]'}`}
                        data-tape-alert={alertable.map(l => l.key).join('+')}
                        data-watching={armed.length ? '' : undefined}
                      >
                        {armed.length ? <BellRing className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                );
              })}
            {/* the pointer's minute */}
            {hb && (
              <div className="pointer-events-none absolute top-2 rounded-md border border-borderMuted bg-card/95 px-2.5 py-1.5 font-mono text-[11px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm" style={over || xOfMin(minOf(hb)) > ml + plotW / 2 ? { left: 8 } : { right: MR + 8 }} data-tape-card={hhmm(minOf(hb))}>
                <span className="font-semibold tnum text-textPrimary">{hhmm(minOf(hb))}</span>
                <span className="ml-2 tnum text-textPrimary">{hb.close.toFixed(2)}</span>
                <span className="ml-2 text-textMuted">{nearLevel(hb.close)}</span>
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
