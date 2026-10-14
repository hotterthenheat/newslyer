/*
==================================================
  SLAYER TERMINAL - THE PROFILE (components/gex/ExposureProfileView.tsx)

  The book's third view (the competitive audit,
  2026-10-13): dealer gamma AS A FUNCTION OF SPOT —
  the curve every desk draws under the name "gamma
  profile" (data/exposureCurve.ts). One line per
  drawn expiry, quiet; the total, loud; the ground
  tinted where hedging amplifies (above zero) and
  where it absorbs (below); spot, the flip (the
  total's zero crossing), the walls and the supreme
  as rules across it, in the house's inks. Hover a
  spot for the figures; click to keep the nearest
  strike; the arrow keys walk the curve.
==================================================
*/

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { buildExposureCurve } from '../../data/exposureCurve';
import { fmtUsd } from '../../data/gex';
import type { ExposureSurface } from '../../data/exposureSurface';
import { CALL_WALL, FLIP, LONG_GAMMA, PUT_WALL, SHORT_GAMMA, SUPREME, alpha } from './paletteInk';

const SILVER = 'rgb(var(--silver))';
const INK = 'rgb(var(--text-primary))';
const INK_3 = 'rgb(var(--text-muted))';
const RULE = 'rgb(var(--ink) / 0.14)';
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const fmtStrike = (v: number) => (!Number.isFinite(v) ? '—' : v % 1 === 0 ? v.toFixed(0) : v.toFixed(2));
const ML = 68;
const MR = 18;
const MT = 44;
const MB = 46;
/** a tag's width, near enough, for keeping the rules' tags off each other */
const TAG_PX = 6.7;

interface Props {
  surface: ExposureSurface;
  /** The expiry columns drawn, as surface indices — the band's window */
  expiries: number[];
  liveSpot?: number;
  selectedStrike?: number | null;
  onSelectStrike?: (strike: number) => void;
  paper?: boolean;
}

const ExposureProfileView = ({ surface, expiries, liveSpot, selectedStrike, onSelectStrike, paper = false }: Props) => {
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
  }, []);
  const curve = useMemo(() => buildExposureCurve(surface, expiries), [surface, expiries]);
  const { points } = curve;
  const spot = liveSpot ?? surface.spot;
  const x0 = points[0]?.spot ?? spot;
  const x1 = points[points.length - 1]?.spot ?? spot;
  const W = box.w;
  const H = box.h;
  const plotW = Math.max(10, W - ML - MR);
  const xOf = (s: number) => ML + ((s - x0) / Math.max(1e-9, x1 - x0)) * plotW;
  /* the rules across the plot: spot, the flip, the walls, the supreme — those inside the band, their tags on two rows */
  const { levels } = surface;
  const rules: { key: string; x: number; ink: string; word: string; dash?: boolean }[] = [];
  const inBand = (v: number) => Number.isFinite(v) && v >= x0 && v <= x1;
  if (inBand(levels.putWall)) rules.push({ key: 'pw', x: levels.putWall, ink: PUT_WALL, word: `PUT WALL ${fmtStrike(levels.putWall)}` });
  if (inBand(levels.callWall)) rules.push({ key: 'cw', x: levels.callWall, ink: CALL_WALL, word: `CALL WALL ${fmtStrike(levels.callWall)}` });
  if (inBand(levels.supreme)) rules.push({ key: 'sup', x: levels.supreme, ink: SUPREME, word: `SUPREME ${fmtStrike(levels.supreme)}` });
  if (curve.flip != null && inBand(curve.flip)) rules.push({ key: 'flip', x: curve.flip, ink: FLIP, word: `FLIP ${curve.flip.toFixed(2)}`, dash: true });
  if (inBand(spot)) rules.push({ key: 'spot', x: spot, ink: SILVER, word: `SPOT ${spot.toFixed(2)}` });
  if (selectedStrike != null && inBand(selectedStrike)) rules.push({ key: 'kept', x: selectedStrike, ink: SILVER, word: `KEPT ${fmtStrike(selectedStrike)}`, dash: true });
  rules.sort((a, b) => a.x - b.x);
  /* the tags on as many rows as they need (2026-10-13: five levels within a strike or two of spot ran out of the three
     rows and printed over each other — "PUT CALL WALL 457"): each takes the first row whose last tag ends before this one
     begins, else a row of its own, and the plot starts under the last row */
  const rowEnds: number[] = [];
  const rowOf = rules.map(r => {
    const half = (r.word.length * TAG_PX) / 2;
    const left = xOf(r.x) - half;
    let row = rowEnds.findIndex(end => end < left - 6);
    if (row < 0) {
      rowEnds.push(-Infinity);
      row = rowEnds.length - 1;
    }
    rowEnds[row] = xOf(r.x) + half;
    return row;
  });
  /* three rows' room at least (the "amplifies" word sits in it), a row more for each tag row past three */
  const mt = Math.max(MT, rowEnds.length * 13 + 5);
  const plotH = Math.max(10, H - mt - MB);
  const yOf = (v: number) => mt + plotH / 2 - (v / curve.maxAbs) * (plotH / 2);
  const y0 = yOf(0);

  /* the hovered point — the pointer's, or the keys' */
  const [hover, setHover] = useState<number | null>(null);
  const nearestIdx = (clientX: number) => {
    const r = hostRef.current?.getBoundingClientRect();
    if (!r || !points.length) return null;
    const s = x0 + ((clientX - r.left - ML) / plotW) * (x1 - x0);
    let best = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(points[i].spot - s) < Math.abs(points[best].spot - s)) best = i;
    return best;
  };
  const nearestStrike = (s: number) => surface.strikes.reduce((b, k) => (Math.abs(k - s) < Math.abs(b - s) ? k : b), surface.strikes[0] ?? s);
  const onKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !points.length) return;
    const cur = hover ?? points.findIndex(p => p.spot >= spot);
    if (e.key === 'ArrowLeft') setHover(Math.max(0, cur - 1));
    else if (e.key === 'ArrowRight') setHover(Math.min(points.length - 1, cur + 1));
    else if (e.key === 'Home') setHover(0);
    else if (e.key === 'End') setHover(points.length - 1);
    else if ((e.key === 'Enter' || e.key === ' ') && hover != null) onSelectStrike?.(nearestStrike(points[hover].spot));
    else return;
    e.preventDefault();
  };
  useEffect(() => setHover(null), [surface]);

  /* the paths */
  const line = (pick: (p: (typeof points)[number]) => number) => points.map((p, i) => `${i ? 'L' : 'M'}${xOf(p.spot).toFixed(1)} ${yOf(pick(p)).toFixed(1)}`).join(' ');
  const area = (sign: 1 | -1) => {
    const top = points.map((p, i) => `${i ? 'L' : 'M'}${xOf(p.spot).toFixed(1)} ${yOf(sign > 0 ? Math.max(0, p.total) : Math.min(0, p.total)).toFixed(1)}`).join(' ');
    return `${top} L${xOf(x1).toFixed(1)} ${y0.toFixed(1)} L${xOf(x0).toFixed(1)} ${y0.toFixed(1)} Z`;
  };
  /* y ticks: five, symmetric; x ticks: every ~90px, on a round figure */
  const yTicks = [-1, -0.5, 0, 0.5, 1].map(f => f * curve.maxAbs);
  /* x ticks on round figures: the strikes' own step, or a multiple of it that keeps ~90px between ticks */
  const step = surface.strikes.length > 1 ? Math.max(0.01, surface.strikes[1] - surface.strikes[0]) : 1;
  const perPx = (x1 - x0) / plotW;
  const tick = step * Math.max(1, Math.ceil((perPx * 90) / step));
  const xTicks: number[] = [];
  for (let s = Math.ceil(x0 / tick) * tick; s <= x1 + 1e-9; s += tick) xTicks.push(s);
  const hp = hover != null ? points[hover] : null;
  /* THE CARD TAKES THE CORNER THE POINTER IS NOT IN (the re-audit's M3): beside the pointer it covered the spot and
     flip rules, the two lines the reader hovers near to see */
  const cardLeft = hp ? (xOf(hp.spot) > ML + plotW / 2 ? ML + 8 : W - MR - 228) : 0;
  /* the two heaviest dates named at their right ends (the re-audit's L4) — the thin lines were nameless off the card */
  const dateTags = (() => {
    const out: { e: number; y: number; word: string }[] = [];
    if (!points.length || curve.expiries.length < 2) return out;
    const weight = curve.expiries.map((_, i) => Math.max(...points.map(p => Math.abs(p.byExpiry[i]))));
    const top = curve.expiries.map((e, i) => ({ e, i, w: weight[i] })).sort((a, b) => b.w - a.w).slice(0, 2);
    const end = points[points.length - 1];
    for (const t of top) out.push({ e: t.e, y: yOf(end.byExpiry[t.i]), word: surface.expiries[t.e]?.date ?? '' });
    out.sort((a, b) => a.y - b.y);
    if (out.length === 2 && out[1].y - out[0].y < 13) out[1].y = out[0].y + 13;
    return out;
  })();

  return (
    <div
      ref={hostRef}
      className="relative h-full min-h-0 select-none outline-none"
      tabIndex={0}
      role="group"
      aria-label="Dealer gamma across spot — the arrow keys walk the curve, Enter keeps the nearest strike"
      onKeyDown={onKeys}
      onPointerMove={e => setHover(nearestIdx(e.clientX))}
      onPointerLeave={() => setHover(null)}
      onClick={e => {
        const i = nearestIdx(e.clientX);
        if (i != null) onSelectStrike?.(nearestStrike(points[i].spot));
      }}
      data-exposure-profile={surface.ticker}
      data-profile-flip={curve.flip != null ? curve.flip.toFixed(2) : undefined}
    >
      {W > 0 && H > 0 && points.length > 1 && (
        <svg width={W} height={H} className="block" role="img" aria-label={`Dealer gamma across spot for ${surface.ticker}: ${fmtUsd(curve.atSpot)} at ${spot.toFixed(2)}${curve.flip != null ? `, the flip at ${curve.flip.toFixed(2)}` : ''}`}>
          {/* the ground: amplifies above zero, absorbs below */}
          <path d={area(1)} fill={alpha(SHORT_GAMMA, paper ? 0.1 : 0.14)} />
          <path d={area(-1)} fill={alpha(LONG_GAMMA, paper ? 0.1 : 0.14)} />
          {/* the y rules and their figures */}
          {yTicks.map(v => (
            <g key={v}>
              <line x1={ML} x2={W - MR} y1={yOf(v)} y2={yOf(v)} stroke={v === 0 ? 'rgb(var(--ink) / 0.35)' : RULE} strokeDasharray={v === 0 ? undefined : '2 3'} />
              <text x={ML - 8} y={yOf(v)} textAnchor="end" dominantBaseline="middle" fontFamily={MONO} fontSize={11} fill={INK_3}>
                {v === 0 ? '0' : fmtUsd(v)}
              </text>
            </g>
          ))}
          <text x={ML - 8} y={mt - 10} textAnchor="end" fontFamily={MONO} fontSize={11} fill={SHORT_GAMMA}>amplifies</text>
          <text x={ML - 8} y={H - MB + 16} textAnchor="end" fontFamily={MONO} fontSize={11} fill={LONG_GAMMA}>absorbs</text>
          {/* the x figures */}
          {xTicks.map(s => (
            <text key={s} x={xOf(s)} y={H - MB + 16} textAnchor="middle" fontFamily={MONO} fontSize={11} fill={INK_3}>
              {fmtStrike(Math.round(s / step) * step)}
            </text>
          ))}
          {/* a line per date, quiet */}
          {curve.expiries.map((e, i) => (
            <path key={e} d={line(p => p.byExpiry[i])} fill="none" stroke={INK_3} strokeOpacity={0.5} strokeWidth={1} />
          ))}
          {dateTags.map(t => (
            <text key={t.e} x={W - MR - 4} y={t.y} textAnchor="end" dominantBaseline="middle" fontFamily={MONO} fontSize={11} fill={INK_3} data-profile-date={t.word}>
              {t.word}
            </text>
          ))}
          {/* the total, loud */}
          <path d={line(p => p.total)} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          {/* the rules and their tags, on as many rows as they need so they never overprint */}
          {rules.map((r, i) => (
            <g key={r.key} data-profile-rule={r.key}>
              <line x1={xOf(r.x)} x2={xOf(r.x)} y1={mt - 2} y2={H - MB} stroke={r.ink} strokeOpacity={r.key === 'spot' ? 0.9 : 0.6} strokeDasharray={r.dash ? '3 3' : undefined} />
              <text x={xOf(r.x)} y={12 + rowOf[i] * 13} textAnchor="middle" fontFamily={MONO} fontSize={11} fontWeight={700} fill={r.ink}>
                {r.word}
              </text>
            </g>
          ))}
          {/* the pointer's spot */}
          {hp && (
            <g>
              <line x1={xOf(hp.spot)} x2={xOf(hp.spot)} y1={mt} y2={H - MB} stroke={SILVER} strokeOpacity={0.5} />
              <circle cx={xOf(hp.spot)} cy={yOf(hp.total)} r={3.5} fill={SILVER} />
            </g>
          )}
        </svg>
      )}
      {/* the figures under the pointer */}
      {hp && (
        <div
          className="pointer-events-none absolute z-10 w-[220px] rounded-md border border-borderMuted bg-card/95 px-2.5 py-2 font-mono text-[11px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur-sm"
          style={{ top: mt + 4, left: cardLeft }}
          data-profile-card={hp.spot.toFixed(2)}
        >
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold tnum text-textPrimary">at {hp.spot.toFixed(2)}</span>
            <span className="tnum text-textMuted">{(((hp.spot - spot) / spot) * 100).toFixed(2)}%</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-textSecondary">Total</span>
            <span className="font-semibold tnum" style={{ color: hp.total >= 0 ? SHORT_GAMMA : LONG_GAMMA }}>
              {fmtUsd(hp.total)} · {hp.total >= 0 ? 'amplifies' : 'absorbs'}
            </span>
          </div>
          {curve.expiries.map((e, i) => (
            <div key={e} className="flex items-baseline justify-between gap-2">
              <span className="text-textMuted">{surface.expiries[e]?.date}</span>
              <span className="tnum text-textSecondary">{fmtUsd(hp.byExpiry[i])}</span>
            </div>
          ))}
          <div className="mt-1 text-textMuted">click to keep {fmtStrike(nearestStrike(hp.spot))}</div>
        </div>
      )}
      {/* what this is, in one line */}
      <p className="pointer-events-none absolute inset-x-0 bottom-0 truncate px-3 pb-1.5 text-[11px] text-textMuted">
        Dealer gamma re-priced across spot, GEX alone — each cell moved with Black-Scholes at its date's vol · above zero hedging amplifies a move, below it absorbs · the flip is where the total crosses zero
      </p>
    </div>
  );
};

export default ExposureProfileView;
