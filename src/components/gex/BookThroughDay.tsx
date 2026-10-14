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
                session as a line, the ground tinted
                where hedging amplified (above zero)
                and absorbed (below); spot beside it,
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
==================================================
*/

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { bookMarket } from '../../data/bookMarket';
import { sessionBars } from '../../data/levelview';
import { fmtUsd } from '../../data/gex';
import { CLOSE_MIN, hhmm } from '../../data/ahead';
import { dayAxisFrom, dayHours } from '../../data/dayAxis';
import { nyMinutes } from '../../core/nyTime';
import { HEAT_MODE, heatLaneColor } from './heatmap';
import { LONG_GAMMA, SHORT_GAMMA, alpha } from './paletteInk';
import { useResolvedTheme } from '../../theme/theme';
import { setDayHover, useDayHover } from '../../data/dayHover';
import type { Candle, GexSnapshot, MarketSnapshot } from '../../types/market';

const SILVER = 'rgb(var(--silver))';
const INK = 'rgb(var(--text-primary))';
const INK_3 = 'rgb(var(--text-muted))';
const RULE = 'rgb(var(--ink) / 0.12)';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const fmtStrike = (v: number) => (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2));
const ML = 64;
const MR = 56;
const MR_PART = 150; /* as a part of the day box: the tape's tag lane above, so the clocks align */
const MR_PART_OVER = 24; /* …a phone's tape keeps the day, its tags over the plot's edge */
const MT = 10;
const MB = 22;
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

const BookThroughDay = ({ snapshot, bars: barsProp, focus, onPick, scope, part = false }: Props) => {
  const paper = useResolvedTheme() === 'light';
  const [face, setFace] = useState<Face>('net');
  const ticker = snapshot.ticker;
  const bars = useMemo(() => barsProp ?? sessionBars(ticker) ?? [], [ticker, barsProp]);
  const until = bars.length ? bars[bars.length - 1].time : Infinity;
  const first = bars[0]?.time ?? 0;

  /* THE MINUTES: the books kept this session, each with its net and the price at its minute */
  const minutes = useMemo<Minute[]>(() => {
    const market = bookMarket();
    const snaps: GexSnapshot[] = market.getGexHistory(ticker).filter(s => s.time >= first && s.time <= until);
    const priceAt = new Map(bars.map(b => [b.time, b.close] as const));
    const own = market.bookMinutes(ticker);
    const netAt = own ? new Map(own.filter(m => m.time >= first && m.time <= until).map(m => [m.time, m.netGex] as const)) : null;
    return snaps.map(s => {
      let net = 0;
      const byStrike = new Map<number, number>();
      for (const l of s.levels) {
        net += l.value;
        byStrike.set(l.strike, l.value);
      }
      return { time: s.time, min: nyMinutes(s.time * 1000), net: netAt?.get(s.time) ?? net, spot: s.spot ?? priceAt.get(s.time) ?? null, byStrike };
    });
  }, [ticker, bars, first, until]);

  /* the strikes on the surface: round the last book's spot */
  const spotNow = minutes.length ? (minutes[minutes.length - 1].spot ?? snapshot.spot) : snapshot.spot;
  const strikes = useMemo(() => {
    const all = [...new Set(minutes.flatMap(m => [...m.byStrike.keys()]))].sort((a, b) => b - a);
    const above = all.filter(k => k >= spotNow).slice(-HALF);
    const below = all.filter(k => k < spotNow).slice(0, HALF);
    return [...above, ...below];
  }, [minutes, spotNow]);
  const maxAbs = useMemo(() => {
    let m = 1;
    for (const mi of minutes) for (const k of strikes) m = Math.max(m, Math.abs(mi.byStrike.get(k) ?? 0));
    return m;
  }, [minutes, strikes]);
  const netMax = useMemo(() => Math.max(1, ...minutes.map(m => Math.abs(m.net))), [minutes]);
  const spotLo = useMemo(() => Math.min(...minutes.map(m => m.spot ?? Infinity)), [minutes]);
  const spotHi = useMemo(() => Math.max(...minutes.map(m => m.spot ?? -Infinity)), [minutes]);

  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const read = () => setBox(prev => (prev.w === el.clientWidth && prev.h === el.clientHeight ? prev : { w: el.clientWidth, h: el.clientHeight }));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [face]);
  const W = box.w;
  const H = box.h;
  const mr = part ? (W > 0 && W < 520 ? MR_PART_OVER : MR_PART) : MR;
  const plotW = Math.max(10, W - ML - mr);
  const plotH = Math.max(10, H - MT - MB);
  /* the tape's clock, off the same bars (data/dayAxis.ts) */
  const FROM = dayAxisFrom(bars[0]?.time);
  const xOfMin = (min: number) => ML + ((min - FROM) / (CLOSE_MIN - FROM)) * plotW;
  const yOfNet = (v: number) => MT + plotH / 2 - (v / netMax) * (plotH / 2);
  const yOfSpot = (p: number) => (spotHi > spotLo ? MT + ((spotHi - p) / (spotHi - spotLo)) * plotH : MT + plotH / 2);
  const rowH = strikes.length ? plotH / strikes.length : 0;
  const yOfRow = (i: number) => MT + i * rowH;

  /* THE HEAT SURFACE, painted on a canvas — forty strikes by four hundred minutes is sixteen thousand cells */
  useEffect(() => {
    if (face !== 'heat') return;
    const c = canvasRef.current;
    if (!c || !W || !H) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const colW = Math.max(1, plotW / (CLOSE_MIN - FROM));
    for (const m of minutes) {
      const x = xOfMin(m.min);
      strikes.forEach((k, i) => {
        const v = m.byStrike.get(k);
        if (v == null || v === 0) return;
        ctx.fillStyle = heatLaneColor(v, maxAbs, HEAT_MODE, 0.12, paper);
        ctx.fillRect(x, yOfRow(i), colW + 0.5, Math.max(1, rowH - 0.5));
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [face, minutes, strikes, maxAbs, W, H, paper, FROM]);

  /* the hovered minute (and row, on the surface) */
  const [hover, setHover] = useState<{ i: number; row: number | null } | null>(null);
  useEffect(() => setHover(null), [minutes]);
  const onMove = (clientX: number, clientY: number) => {
    const r = hostRef.current?.getBoundingClientRect();
    if (!r || !minutes.length) return setHover(null);
    const min = FROM + ((clientX - r.left - ML) / plotW) * (CLOSE_MIN - FROM);
    let best = 0;
    for (let i = 1; i < minutes.length; i++) if (Math.abs(minutes[i].min - min) < Math.abs(minutes[best].min - min)) best = i;
    const row = face === 'heat' && rowH > 0 ? Math.max(0, Math.min(strikes.length - 1, Math.floor((clientY - r.top - MT) / rowH))) : null;
    setHover({ i: best, row });
  };
  const hm = hover ? minutes[hover.i] : null;
  /* THE MINUTE, SHARED (idea 1): the pointer's minute told to the tape above, the tape's drawn here as a quiet rule */
  const shared = useDayHover();
  useEffect(() => {
    if (!part) return;
    setDayHover(hm ? { min: hm.min, from: 'through' } : null);
  }, [part, hm]);
  useEffect(() => () => setDayHover(null), []);
  const otherMin = part && hm == null && shared?.from === 'tape' ? shared.min : null;
  /* a narrow plot (a phone) holds four hours, not eight */
  const hours = dayHours(FROM, plotW < 480);
  const netPath = minutes.map((m, i) => `${i ? 'L' : 'M'}${xOfMin(m.min).toFixed(1)} ${yOfNet(m.net).toFixed(1)}`).join(' ');
  const netArea = (sign: 1 | -1) => (minutes.length ? `${minutes.map((m, i) => `${i ? 'L' : 'M'}${xOfMin(m.min).toFixed(1)} ${yOfNet(sign > 0 ? Math.max(0, m.net) : Math.min(0, m.net)).toFixed(1)}`).join(' ')} L${xOfMin(minutes[minutes.length - 1].min).toFixed(1)} ${yOfNet(0).toFixed(1)} L${xOfMin(minutes[0].min).toFixed(1)} ${yOfNet(0).toFixed(1)} Z` : '');
  const spotPath = minutes.filter(m => m.spot != null).map((m, i) => `${i ? 'L' : 'M'}${xOfMin(m.min).toFixed(1)} ${yOfSpot(m.spot!).toFixed(1)}`).join(' ');
  const flips = useMemo(() => {
    let n = 0;
    for (let i = 1; i < minutes.length; i++) if (Math.sign(minutes[i].net) !== Math.sign(minutes[i - 1].net) && minutes[i].net !== 0 && minutes[i - 1].net !== 0) n++;
    return n;
  }, [minutes]);
  const last = minutes[minutes.length - 1];
  const focusRow = focus != null ? strikes.findIndex(k => Math.abs(k - focus) < 1e-9) : -1;
  /* THE KEYS WALK IT TOO (the re-audit's M6) — the tape's walk: left and right along the minutes, up and down the
     strikes on the surface, Enter keeps the row's strike */
  const onKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !minutes.length) return;
    const i = hover?.i ?? minutes.length - 1;
    const row = hover?.row ?? (face === 'heat' ? (focusRow >= 0 ? focusRow : Math.floor(strikes.length / 2)) : null);
    if (e.key === 'ArrowLeft') setHover({ i: Math.max(0, i - 1), row });
    else if (e.key === 'ArrowRight') setHover({ i: Math.min(minutes.length - 1, i + 1), row });
    else if (e.key === 'ArrowUp' && face === 'heat') setHover({ i, row: Math.max(0, (row ?? 0) - 1) });
    else if (e.key === 'ArrowDown' && face === 'heat') setHover({ i, row: Math.min(strikes.length - 1, (row ?? -1) + 1) });
    else if (e.key === 'Home') setHover({ i: 0, row });
    else if (e.key === 'End') setHover({ i: minutes.length - 1, row });
    else if ((e.key === 'Enter' || e.key === ' ') && face === 'heat' && row != null && strikes[row] != null) onPick(strikes[row]);
    else return;
    e.preventDefault();
  };

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
              <dt className="text-[11px] text-textMuted">Flipped sides</dt>
              <dd className="mt-0.5 font-mono text-[12px] tnum text-textPrimary whitespace-nowrap">{flips === 0 ? 'not yet' : `${flips} ${flips === 1 ? 'time' : 'times'}`}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-textMuted">Books kept</dt>
              <dd className="mt-0.5 font-mono text-[12px] tnum text-textPrimary whitespace-nowrap">{minutes.length} {minutes.length === 1 ? 'minute' : 'minutes'}</dd>
            </div>
          </dl>
        )}
      </div>
      <div className={part ? 'px-3 pb-3 flex-1 flex flex-col' : 'px-3 pb-3'}>
        <div
          ref={hostRef}
          className={`relative ${part ? 'flex-[1_1_260px] min-h-[170px]' : 'h-[260px]'} rounded-md border border-borderSubtle/60 bg-inset outline-none`}
          tabIndex={0}
          role="group"
          aria-label={`${ticker}'s book through the day — the arrow keys walk the minutes${face === 'heat' ? ' and the strikes, Enter keeps the strike' : ''}`}
          onKeyDown={onKeys}
          onPointerMove={e => onMove(e.clientX, e.clientY)}
          onPointerLeave={() => setHover(null)}
          onClick={() => {
            if (face === 'heat' && hover?.row != null && strikes[hover.row] != null) onPick(strikes[hover.row]);
          }}
          data-through-plot
        >
          {face === 'heat' && <canvas ref={canvasRef} className="absolute inset-0" style={{ width: W, height: H }} aria-hidden />}
          {W > 0 && H > 0 && (
            <svg width={W} height={H} className="relative block" role="img" aria-label={face === 'net' ? `${ticker}'s net gamma through the session, ${minutes.length} minutes` : `${ticker}'s gamma by strike through the session`}>
              {hours.map(t => (
                <g key={t}>
                  <line x1={xOfMin(t)} x2={xOfMin(t)} y1={MT} y2={MT + plotH} stroke={RULE} />
                  <text x={xOfMin(t)} y={H - 7} textAnchor={t === FROM ? 'start' : t === CLOSE_MIN ? 'end' : 'middle'} fontFamily={MONO} fontSize={11} fill={INK_3}>
                    {hhmm(t)}
                  </text>
                </g>
              ))}
              {face === 'net' && minutes.length > 1 && (
                <g>
                  <path d={netArea(1)} fill={alpha(SHORT_GAMMA, paper ? 0.1 : 0.14)} />
                  <path d={netArea(-1)} fill={alpha(LONG_GAMMA, paper ? 0.1 : 0.14)} />
                  <line x1={ML} x2={W - mr} y1={yOfNet(0)} y2={yOfNet(0)} stroke="rgb(var(--ink) / 0.35)" />
                  {[-1, 0, 1].map(f => (
                    <text key={f} x={ML - 8} y={yOfNet(f * netMax)} textAnchor="end" dominantBaseline="middle" fontFamily={MONO} fontSize={11} fill={INK_3}>
                      {f === 0 ? '0' : fmtUsd(f * netMax)}
                    </text>
                  ))}
                  {spotPath && <path d={spotPath} fill="none" stroke={INK_3} strokeOpacity={0.6} strokeWidth={1} strokeDasharray="2 2" />}
                  {spotHi > spotLo && mr >= 100 && (
                    <>
                      <text x={W - mr + 8} y={MT + 4} fontFamily={MONO} fontSize={11} fill={INK_3}>{spotHi.toFixed(2)}</text>
                      <text x={W - mr + 8} y={MT + plotH} fontFamily={MONO} fontSize={11} fill={INK_3}>{spotLo.toFixed(2)}</text>
                      <text x={W - mr + 8} y={MT + plotH / 2 + 3} fontFamily={MONO} fontSize={11} fill={INK_3}>spot</text>
                    </>
                  )}
                  <path d={netPath} fill="none" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
                </g>
              )}
              {face === 'heat' &&
                strikes.map((k, i) =>
                  i % Math.max(1, Math.round(strikes.length / 10)) === 0 || i === focusRow ? (
                    <text key={k} x={ML - 8} y={yOfRow(i) + rowH / 2} textAnchor="end" dominantBaseline="middle" fontFamily={MONO} fontSize={11} fill={i === focusRow ? SILVER : INK_3} fontWeight={i === focusRow ? 700 : 400}>
                      {fmtStrike(k)}
                    </text>
                  ) : null
                )}
              {face === 'heat' && focusRow >= 0 && <rect x={ML} y={yOfRow(focusRow)} width={plotW} height={Math.max(1, rowH)} fill="none" stroke={SILVER} strokeWidth={1.5} data-through-kept-row={focus ?? undefined} />}
              {face === 'heat' && hover?.row != null && <rect x={ML} y={yOfRow(hover.row)} width={plotW} height={Math.max(1, rowH)} fill={alpha(SILVER, 0.08)} />}
              {otherMin != null && <line x1={xOfMin(otherMin)} x2={xOfMin(otherMin)} y1={MT} y2={MT + plotH} stroke={SILVER} strokeOpacity={0.35} strokeDasharray="2 2" data-through-shared-minute />}
              {hm && (
                <g>
                  <line x1={xOfMin(hm.min)} x2={xOfMin(hm.min)} y1={MT} y2={MT + plotH} stroke={SILVER} strokeOpacity={0.5} />
                  {face === 'net' && <circle cx={xOfMin(hm.min)} cy={yOfNet(hm.net)} r={3.5} fill={SILVER} />}
                </g>
              )}
            </svg>
          )}
          {hm && (
            <div className="pointer-events-none absolute top-2 rounded-md border border-borderMuted bg-card/95 px-2.5 py-1.5 font-mono text-[11px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm" style={xOfMin(hm.min) > ML + plotW / 2 ? { left: 8 } : { right: mr + 8 }} data-through-card={hhmm(hm.min)}>
              <span className="font-semibold tnum text-textPrimary">{hhmm(hm.min)}</span>
              {face === 'net' ? (
                <>
                  <span className="ml-2 tnum" style={{ color: hm.net >= 0 ? SHORT_GAMMA : LONG_GAMMA }}>
                    {fmtUsd(hm.net)}
                  </span>
                  {hm.spot != null && <span className="ml-2 tnum text-textMuted">spot {hm.spot.toFixed(2)}</span>}
                </>
              ) : (
                hover?.row != null &&
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
