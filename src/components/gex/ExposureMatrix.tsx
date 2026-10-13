/*
==================================================
  SLAYER TERMINAL - THE EXPOSURE MATRIX
  (components/gex/ExposureMatrix.tsx)

  Back at Noah's word (2026-09-28, with the picture
  of the 22 August build: "delete the first part of
  the pinpoint map page that showcases our current
  ladder and replace that with this one"), then made
  A VIEW OF THE CALENDAR'S BOX ("this should have the
  same hover card and top button layout that the
  ladder had with the color palette choice and all …
  the calendar should be a button you can switch up
  top as well like matrix vs calendar"). So it reads
  what the ladder read — the surface under the
  band's expiries, strikes and greeks — and wears
  what the ladder wore: the Colours switch's ramp on
  every bar, the pointer card, the kept strike, the
  wall words on the strike.

  The table it was: one row a strike, and for every
  greek three cells — PUT · CALL · NET — each a
  figure with a thin bar under it, the bar's length
  the cell's share of its column's heaviest and its
  ink that share on the palette's ramp (warm or gold
  where hedging amplifies, cool or ice where it
  absorbs; the August red-and-green on the legs went,
  because red and green mean price direction in this
  house and the leg's name stands in the head). The
  spot rule between the strikes above and below
  price.

  SINCE 2026-10-12 (the partner, through Noah): the
  NET alone on the table, one column a greek filling
  the box, its bar the whole lane; the put and call
  legs stay on the pointer card. `LEGS` says which.
==================================================
*/

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { HEAT_MODE, heatLadderColor, type HeatMode } from './heatmap';
import SpotRule from '../ui/SpotRule';
import PointerCard, { CardRow, PointerFollowCard } from '../ui/PointerCard';
import { fmtUsd } from '../../data/gex';
import { GREEKS, GREEK_UNIT, type ExposureSurface, type Greek } from '../../data/exposureSurface';
import { CALL_WALL, FLIP, PUT_WALL, SUPREME } from './paletteInk';
import { useResolvedTheme } from '../../theme/theme';
import type { SurfaceCell } from './exposureView';

interface ExposureMatrixProps {
  surface: ExposureSurface;
  liveSpot: number;
  /** The greeks drawn, in the band's pick — a column group each */
  greeks: Greek[];
  /** Indices into surface.expiries — the band's window, summed per cell */
  expiries: number[];
  /** Strikes each side of spot */
  rings: number;
  hoverStrike?: number | null;
  palette?: 'house' | 'thermal';
  selectedStrike?: number | null;
  marks?: ReadonlyMap<number, string>;
  onPointer?: (cell: SurfaceCell | null, clientX: number, clientY: number) => void;
  onSelectStrike?: (strike: number) => void;
  /** The greek the pointer card reads — the band's lead */
  lead?: Greek;
}

type Leg = 'put' | 'call' | 'net';
/* THE NET ALONE ON THE TABLE (the partner through Noah, 2026-10-12: the matrix "only showing the net and on hover do
   we keep the put/call etc" … "the net to fill its container"): one column a greek, as wide as the box lets it,
   its bar the whole lane; the put and call legs live on the pointer card, as they did. */
const LEGS: Leg[] = ['net'];
const GREEK_LABEL: Record<Greek, string> = { gex: 'GEX', dex: 'DEX', vex: 'VEX', vanna: 'VANNA', charm: 'CHARM' };
const SILVER = 'rgb(var(--silver))';
const PUT_INK = PUT_WALL;
const CALL_INK = CALL_WALL;
const ROW_H = 27;
const fmtStrike = (v: number) => (v % 1 === 0 ? v.toFixed(0) : v.toFixed(2));
/* the wall words on the strike at the house's 11px floor (the audit's H5, 2026-10-13 — they were 7.5px, the smallest type
   on the terminal); the column's reserve below prints the same words, so it grows with them */
const TAG = 'ml-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider';
const head = 'font-mono text-[11px] font-semibold uppercase tracking-widest';

interface Row {
  strike: number;
  legs: Record<Greek, { put: number; call: number; net: number }>;
}

/* THE GROUPS APART (Noah, 2026-09-28: "better dividers between each greek section … where the net ends and the put
   begins for another greek there is no appearance of separation, but it also should not cast too much attention"):
   the ladder's pane skin — a hairline at a group's left edge, a faint wash on every other group, a little more air
   at the seam. */
/* A shade more on the dark terminal (Noah: "a slight bit more for the dark mode, the light mode is pretty good") — the
   light values are untouched; the two grounds get their own hairline and wash. */
const groupSkin = (gi: number, leg: Leg, paper: boolean) =>
  `${leg === LEGS[0] ? `border-l ${paper ? 'border-borderSubtle' : 'border-borderMuted'} pl-3` : ''} ${leg === LEGS[LEGS.length - 1] ? 'pr-3' : ''} ${gi % 2 === 1 ? (paper ? 'bg-ink/[0.02]' : 'bg-ink/[0.045]') : ''}`;
const groupWash = (gi: number, paper: boolean) => (gi % 2 === 1 ? (paper ? 'bg-ink/[0.02]' : 'bg-ink/[0.045]') : '');

const Cell = ({ value, leg, cap, mode, paper, gi }: { value: number; leg: Leg; cap: number; mode: HeatMode; paper: boolean; gi: number }) => {
  const pct = Math.min(100, (Math.abs(value) / Math.max(1, cap)) * 100);
  return (
    <td className={`px-2 py-1 text-right align-middle ${groupSkin(gi, leg, paper)}`} data-matrix-leg={leg}>
      <span className={`block font-mono text-[11px] tnum leading-none ${leg === 'net' ? 'text-textPrimary font-semibold' : 'text-textPrimary'}`}>{fmtUsd(value)}</span>
      {/* the bar's lane is the whole cell — the net fills its container (2026-10-12) */}
      <span className="mt-1 ml-auto block h-[3px] w-full rounded-full bg-ink/[0.06]">
        {/* the width glides with the data, the ink with the Colours switch — the ladder's two clocks */}
        <span className="block h-full rounded-full transition-[width,background-color] [transition-duration:700ms,450ms]" style={{ width: `${pct}%`, background: value === 0 ? 'transparent' : heatLadderColor(value, cap, mode, paper) }} />
      </span>
    </td>
  );
};

const ExposureMatrix = ({ surface, liveSpot, greeks, expiries, rings, hoverStrike, palette = 'house', selectedStrike, marks, onPointer, onSelectStrike, lead: leadProp }: ExposureMatrixProps) => {
  const mode: HeatMode = palette === 'thermal' ? 'thermal-yellow' : HEAT_MODE;
  const paper = useResolvedTheme() === 'light';
  const shownGreeks = useMemo(() => GREEKS.filter(g => greeks.includes(g)), [greeks]);
  const lead: Greek = leadProp && shownGreeks.includes(leadProp) ? leadProp : shownGreeks[0] ?? 'gex';
  const cols = 1 + shownGreeks.length * LEGS.length;
  /* THE EXPIRIES DRAWN — the host's list, so every view sums the same book */
  const shownIdx = useMemo(() => (expiries.length ? expiries.filter(i => i >= 0 && i < surface.expiries.length) : [Math.max(0, surface.expiries.findIndex(e => e.dte === 0))]), [expiries, surface]);
  const { above, below } = useMemo(() => {
    const desc = [...surface.strikes].sort((a, b) => b - a);
    return {
      above: desc.filter(s => s >= surface.spot).slice(-Math.max(1, rings)),
      below: desc.filter(s => s < surface.spot).slice(0, Math.max(1, rings)),
    };
  }, [surface, rings]);
  const rowFor = (strike: number): Row => {
    const si = surface.strikes.indexOf(strike);
    const legs = {} as Row['legs'];
    for (const g of GREEKS) {
      let put = 0, call = 0, net = 0;
      if (si >= 0)
        for (const e of shownIdx) {
          put += surface.put[g][e]?.[si] ?? 0;
          call += surface.call[g][e]?.[si] ?? 0;
          net += surface.net[g][e]?.[si] ?? 0;
        }
      legs[g] = { put, call, net };
    }
    return { strike, legs };
  };
  const rowsAbove = useMemo(() => above.map(rowFor), [above, surface, shownIdx]); // eslint-disable-line react-hooks/exhaustive-deps
  const rowsBelow = useMemo(() => below.map(rowFor), [below, surface, shownIdx]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => [...rowsAbove, ...rowsBelow], [rowsAbove, rowsBelow]);
  /* THE SCALES — each column against its own heaviest among the rows shown: a bar's length and its ink read the same */
  const caps = useMemo(() => {
    const m = {} as Record<Greek, Record<Leg, number>>;
    for (const g of GREEKS) m[g] = { put: Math.max(1, ...rows.map(r => Math.abs(r.legs[g].put))), call: Math.max(1, ...rows.map(r => Math.abs(r.legs[g].call))), net: Math.max(1, ...rows.map(r => Math.abs(r.legs[g].net))) };
    return m;
  }, [rows]);

  const levels = surface.levels;
  const pinStrike = surface.front.strikes.find(r => r.pin)?.strike;
  const tagFor = (strike: number): { word: string; ink: string } | null =>
    strike === levels.supreme ? { word: 'supreme', ink: SUPREME }
    : strike === levels.callWall ? { word: 'call wall', ink: CALL_WALL }
    : strike === levels.putWall ? { word: 'put wall', ink: PUT_WALL }
    : strike === levels.flip ? { word: 'flip', ink: FLIP }
    : strike === pinStrike ? { word: 'pin', ink: 'rgb(var(--text-muted))' }
    : null;

  /* THE KEPT STRIKE — the ladder's rule: no card while one is kept; a click anywhere off the rows lets it go */
  const keptStrike = selectedStrike ?? null;
  const pinned = keptStrike != null;
  const keptRef = useRef(keptStrike);
  keptRef.current = keptStrike;
  useEffect(() => {
    if (!pinned) return;
    const h = (ev: MouseEvent) => {
      const t = ev.target as Element | null;
      if (t?.closest('[data-matrix-row],[data-ladder-row],[data-cell],[data-strike],[data-profile-panel],[data-dropdown],[data-dropdown-card],[role="menu"],[data-focus-chip],[data-guide-door],button,a,input,select,textarea')) return;
      if (keptRef.current != null) onSelectStrike?.(keptRef.current);
    };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, [pinned, onSelectStrike]);

  /* THE POINTER CARD — the ladder's, one mounted element per hover, tracking the pointer by itself */
  const [hovered, setHovered] = useState<number | null>(null);
  const [card, setCard] = useState<{ strike: number; x: number; y: number } | null>(null);
  const leaveTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);
  /* A CLICK KEEPS THE CARD (2026-10-12, with the calendar's): the same card stands on the row where the pointer was
     when it was clicked — an offset from the row's box, read again on scroll and resize — until the strike is let go.
     A strike kept from elsewhere (the panel, the gutter) anchors at the strike cell's right edge. */
  const [keptAt, setKeptAt] = useState<{ strike: number; dx: number; dy: number } | null>(null);
  const [keptPos, setKeptPos] = useState<{ x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (keptStrike == null) {
      setKeptPos(null);
      return;
    }
    const box = scrollRef.current;
    const at = keptAt && Math.abs(keptAt.strike - keptStrike) < 1e-9 ? keptAt : null;
    const read = () => {
      const row = box?.querySelector<HTMLElement>(`[data-matrix-row="${keptStrike}"]`);
      if (!row) {
        setKeptPos(null);
        return;
      }
      const r = row.getBoundingClientRect();
      const td = row.firstElementChild?.getBoundingClientRect();
      setKeptPos({ x: r.left + (at ? at.dx : (td?.width ?? 80) + 8), y: r.top + (at ? at.dy : r.height / 2) });
    };
    read();
    box?.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read);
    window.addEventListener('scroll', read, { capture: true, passive: true });
    return () => {
      box?.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
      window.removeEventListener('scroll', read, { capture: true });
    };
  }, [keptStrike, keptAt, rows]);
  const rowCard = (r: Row, start: { x: number; y: number }, still = false) => {
    const tag = tagFor(r.strike);
    const you = marks?.get(r.strike);
    const si = surface.strikes.indexOf(r.strike);
    const distPct = ((r.strike - surface.spot) / surface.spot) * 100;
    const l = r.legs[lead];
    const ink = heatLadderColor(l.net, caps[lead].net, mode, paper);
    const total = rows.reduce((s, x) => s + Math.abs(x.legs[lead].net), 0);
    const share = total > 0 ? (Math.abs(l.net) / total) * 100 : 0;
    const heaviest = si >= 0 ? shownIdx.map(e => ({ e, v: surface.net[lead][e]?.[si] ?? 0 })).sort((a, b) => Math.abs(b.v) - Math.abs(a.v))[0] : undefined;
    const oi = si >= 0 ? shownIdx.reduce((s, e) => s + (surface.oi[e]?.[si] ?? 0), 0) : 0;
    const pct = (v: number, max: number) => `${Math.round((Math.abs(v) / Math.max(1, max)) * 100)}%`;
    const title = (
      <>
        {fmtStrike(r.strike)}
        {tag && (
          <span className="text-[11px] uppercase tracking-widest font-normal" style={{ color: tag.ink }}>
            {tag.word}
          </span>
        )}
        {you && (
          <span className="text-[11px] uppercase tracking-widest font-normal" style={{ color: SILVER }}>
            you
          </span>
        )}
      </>
    );
    const aside = `${distPct >= 0 ? '+' : '−'}${Math.abs(distPct).toFixed(2)}% · ${distPct >= 0 ? 'above' : 'below'} spot`;
    const body = (
      <>
        <CardRow k="Put" v={fmtUsd(l.put)} sub={pct(l.put, caps[lead].put)} ink={PUT_INK} />
        <CardRow k="Call" v={fmtUsd(l.call)} sub={pct(l.call, caps[lead].call)} ink={CALL_INK} />
        <CardRow k={`Net · ${GREEK_LABEL[lead]}`} v={fmtUsd(l.net)} sub={l.net >= 0 ? 'put-heavy' : 'call-heavy'} ink={ink} />
        {oi > 0 && <CardRow k="Open interest" v={Math.round(oi).toLocaleString()} sub="contracts" />}
        {heaviest && <CardRow k="Heaviest expiry" v={fmtUsd(heaviest.v)} sub={surface.expiries[heaviest.e]?.date} ink={ink} />}
        <CardRow k="Of the book" v={`${share.toFixed(1)}%`} sub="shown" />
      </>
    );
    return still ? (
      <PointerCard x={start.x} y={start.y} still width={212} testId="data-matrix-card" testValue={r.strike} title={title} aside={aside} foot={<span className="text-[11px] uppercase tracking-widest text-textMuted">kept · click it again, or anywhere off the grid, to let go</span>}>
        {body}
      </PointerCard>
    ) : (
      <PointerFollowCard start={start} width={212} testId="data-matrix-card" testValue={r.strike} title={title} aside={aside}>
        {body}
      </PointerFollowCard>
    );
  };
  const cardRow = card && !pinned ? rows.find(r => Math.abs(r.strike - card.strike) < 1e-9) ?? null : null;
  const keptRow = pinned ? rows.find(r => Math.abs(r.strike - keptStrike) < 1e-9) ?? null : null;

  /* THE KEYS REACH THE ROWS (the audit's H10, 2026-10-13): the table is one tab stop; ↑ ↓ walk the strikes, Home and End
     jump to the ends, Enter or Space keeps the row — the same card and the same keep a click gives. The walked row lights
     as a hovered one does and wears the house ring; the walk starts on the kept strike, else the strike just over spot,
     and only from the keys (:focus-visible) — a click inside the box focuses it too, and changes nothing. */
  const [keyRow, setKeyRow] = useState<number | null>(null);
  const rowId = (strike: number) => `matrix-${surface.ticker}-${String(strike).replace('.', '_')}`;
  const walkTo = (strike: number) => {
    setKeyRow(strike);
    const row = scrollRef.current?.querySelector<HTMLElement>(`[data-matrix-row="${strike}"]`);
    if (!row) return;
    row.scrollIntoView({ block: 'nearest' });
    const b = row.getBoundingClientRect();
    const td = row.firstElementChild?.getBoundingClientRect();
    const x = b.left + (td?.width ?? 80) + 8;
    const y = b.top + b.height / 2;
    setHovered(strike);
    setCard({ strike, x, y });
    onPointer?.({ strike, e: shownIdx[0] ?? 0 }, x, y);
  };
  const leaveKeys = () => {
    setKeyRow(null);
    setHovered(null);
    setCard(null);
    onPointer?.(null, 0, 0);
  };
  const onKeys = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey || !rows.length) return;
    const i = keyRow == null ? -1 : rows.findIndex(r => Math.abs(r.strike - keyRow) < 1e-9);
    let next: Row | undefined;
    if (e.key === 'ArrowDown') next = rows[Math.min(rows.length - 1, i + 1)];
    else if (e.key === 'ArrowUp') next = rows[Math.max(0, i - 1)];
    else if (e.key === 'Home') next = rows[0];
    else if (e.key === 'End') next = rows[rows.length - 1];
    else if ((e.key === 'Enter' || e.key === ' ') && keyRow != null) {
      e.preventDefault();
      const row = scrollRef.current?.querySelector<HTMLElement>(`[data-matrix-row="${keyRow}"]`);
      const b = row?.getBoundingClientRect();
      const td = row?.firstElementChild?.getBoundingClientRect();
      if (b) setKeptAt({ strike: keyRow, dx: (td?.width ?? 80) + 8, dy: b.height / 2 });
      onSelectStrike?.(keyRow);
      return;
    } else return;
    e.preventDefault();
    if (next) walkTo(next.strike);
  };

  /* the box opens with price in the middle of it, once per name */
  const spotRef = useRef<HTMLTableRowElement | null>(null);
  /* THE COLUMNS HOLD STILL (2026-10-12, the replay — Noah: "the only thing changing should be the color and
     numbers not the literal node shape or size"): an auto table hands every column a share of the width by what
     its cells say, so a figure growing from "$464.8M" to "-$1.1B" nudged every column half a pixel a step. The
     table is laid out FIXED: the strike column at the width of its widest possible row (measured off the reserve
     in its head), the legs sharing the rest equally. */
  const [strikeColW, setStrikeColW] = useState(0);
  const [reserve, setReserve] = useState<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    if (!reserve) return;
    const read = () => {
      const w = Math.ceil(reserve.offsetWidth) + 12; // pl-2 + pr-1
      setStrikeColW(prev => (prev === w ? prev : w));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(reserve);
    return () => ro.disconnect();
  }, [reserve]);
  const centredFor = useRef<string | null>(null);
  useEffect(() => {
    if (centredFor.current === surface.ticker) return;
    centredFor.current = surface.ticker;
    const row = spotRef.current;
    const box = row?.closest('[data-matrix-scroll]') as HTMLElement | null;
    if (!row || !box) return;
    box.scrollTop = Math.max(0, row.offsetTop - box.clientHeight / 2);
  }, [surface.ticker, rows.length]);

  const renderRow = (r: Row) => {
    const on = keptStrike === r.strike;
    const lit = hoverStrike === r.strike || hovered === r.strike;
    const walked = keyRow != null && Math.abs(keyRow - r.strike) < 1e-9;
    const tag = tagFor(r.strike);
    const you = marks?.get(r.strike);
    return (
      <tr
        key={r.strike}
        id={rowId(r.strike)}
        aria-label={`${fmtStrike(r.strike)}${tag ? ` · ${tag.word}` : ''}${you ? ' · you own' : ''} · net ${GREEK_LABEL[lead]} ${fmtUsd(r.legs[lead].net)}`}
        onPointerEnter={ev => {
          if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
          leaveTimer.current = 0;
          setHovered(r.strike);
          setCard(c => (c && c.strike === r.strike ? c : { strike: r.strike, x: ev.clientX, y: ev.clientY }));
          onPointer?.({ strike: r.strike, e: shownIdx[0] ?? 0 }, ev.clientX, ev.clientY);
        }}
        onPointerLeave={ev => {
          onPointer?.(null, ev.clientX, ev.clientY);
          if (leaveTimer.current) window.clearTimeout(leaveTimer.current);
          leaveTimer.current = window.setTimeout(() => {
            leaveTimer.current = 0;
            setHovered(h => (h === r.strike ? null : h));
            setCard(c => (c && c.strike === r.strike ? null : c));
          }, 70);
        }}
        onClick={ev => {
          const b = ev.currentTarget.getBoundingClientRect();
          setKeptAt({ strike: r.strike, dx: ev.clientX - b.left, dy: ev.clientY - b.top });
          onSelectStrike?.(r.strike);
        }}
        className={`relative border-b border-borderSubtle/30 transition-colors ${onSelectStrike ? 'cursor-pointer' : ''} ${on ? 'bg-ink/[0.05]' : lit ? 'bg-ink/[0.04]' : ''} ${pinned && !on ? 'opacity-60' : ''}`}
        style={{ height: ROW_H, ...(on ? { boxShadow: `inset 2px 0 0 0 ${SILVER}` } : walked ? { boxShadow: 'inset 0 0 0 2px rgb(var(--silver) / var(--ring-a))' } : {}) }}
        data-matrix-row={r.strike}
        data-kept={on || undefined}
        data-walked={walked || undefined}
        title={you}
      >
        {/* THE STRIKE AT THE FAR LEFT, ITS TAGS AFTER IT, THE COLUMN NO WIDER THAN ITS WIDEST ROW (Noah, 2026-10-12:
            "the strikes should be furthest left" and no empty band — the table sizes the column to its content, the
            cells take the rest) */}
        <td className="pl-2 pr-1 py-1 bg-inset border-r border-borderSubtle/40 font-mono text-[11px] font-semibold tnum text-textSecondary whitespace-nowrap">
          <span className={on || lit ? 'text-textPrimary' : ''}>{fmtStrike(r.strike)}</span>
          {tag && (
            <span className={TAG} style={{ color: tag.ink }} data-matrix-role={tag.word}>
              {tag.word}
            </span>
          )}
          {you && <span className={`${TAG} text-silver`}>you own</span>}
        </td>
        {shownGreeks.map((g, gi) => LEGS.map(leg => <Cell key={`${g}-${leg}`} value={r.legs[g][leg]} leg={leg} cap={caps[g][leg]} mode={mode} paper={paper} gi={gi} />))}
      </tr>
    );
  };

  return (
    <div
      ref={scrollRef}
      className="overflow-auto h-full min-h-0"
      tabIndex={0}
      role="group"
      aria-label="The book by strike — the arrow keys walk the strikes, Enter keeps one"
      aria-activedescendant={keyRow != null ? rowId(keyRow) : undefined}
      onFocus={e => {
        if (e.target !== e.currentTarget || keyRow != null || !e.currentTarget.matches(':focus-visible')) return;
        const start = keptStrike ?? above[above.length - 1] ?? rows[0]?.strike;
        if (start != null) walkTo(start);
      }}
      onBlur={e => {
        if (e.target === e.currentTarget) leaveKeys();
      }}
      onKeyDown={onKeys}
      data-matrix-scroll
      data-exposure-matrix={surface.ticker}
      data-matrix-palette={palette}
    >
      <table className="w-full border-collapse" style={{ minWidth: (strikeColW || 84) + shownGreeks.length * LEGS.length * 76, tableLayout: strikeColW ? 'fixed' : 'auto' }}>
        {strikeColW > 0 && (
          <colgroup>
            <col style={{ width: strikeColW }} />
            {shownGreeks.map(g => LEGS.map(leg => <col key={`${g}-${leg}`} />))}
          </colgroup>
        )}
        <thead className="sticky top-0 z-10 bg-panel">
          <tr>
            <th className={`${head} px-2 pt-2 pb-1 text-left text-textSecondary border-b border-borderSubtle`}>
              {/* THE COLUMN'S WIDTH IS RESERVED (2026-10-12, the replay): the widest row this table can print, set
                  invisibly, so a wall's words moving from row to row never move the column or the cells beside it */}
              <span ref={setReserve} aria-hidden className="invisible block h-0 w-max overflow-hidden whitespace-nowrap normal-case tracking-normal text-[11px] font-semibold tnum">
                {rows.map(r => fmtStrike(r.strike)).reduce((a, b) => (b.length > a.length ? b : a), '')}
                <span className={TAG}>call wall</span>
                <span className={TAG}>you own</span>
              </span>
              Strike
            </th>
            {shownGreeks.map((g, gi) => (
              <th
                key={g}
                colSpan={LEGS.length}
                className={`${head} px-2 pt-2 pb-1 text-center border-b border-l ${paper ? 'border-borderSubtle' : 'border-borderMuted'} ${groupWash(gi, paper)} ${g === lead && shownGreeks.length > 1 ? 'text-silver' : 'text-textPrimary'}`}
                data-matrix-group={g}
                data-lead={g === lead || undefined}
                /* the silver head is the greek the pointer card reads — said, not left to be guessed (the audit's L8) */
                title={g === lead && shownGreeks.length > 1 ? 'The greek the card reads' : undefined}
              >
                {/* ONE LEG, ONE HEAD (the audit's M4, 2026-10-13): with the net alone on the table the leg's name rides the
                    greek's head — "GEX · net · 1% move" — and the row that said "NET" five times is gone; it comes back
                    with the legs if they ever return */}
                {GREEK_LABEL[g]} <span className="text-textSecondary font-medium normal-case tracking-normal">· {LEGS.length === 1 ? `${LEGS[0]} · ` : ''}{GREEK_UNIT[g]}</span>
              </th>
            ))}
          </tr>
          {LEGS.length > 1 && (
            <tr>
              <th className="border-b border-borderSubtle" />
              {shownGreeks.map((g, gi) =>
                LEGS.map(leg => (
                  <th key={`${g}-${leg}`} className={`${head} px-2 py-1 text-right text-textSecondary border-b border-borderSubtle ${groupSkin(gi, leg, paper)}`}>
                    {leg}
                  </th>
                ))
              )}
            </tr>
          )}
        </thead>
        <tbody>
          {rowsAbove.map(renderRow)}
          <tr ref={spotRef} data-matrix-spot>
            {/* the rule under the net columns alone, the strike column's cell empty — the pill at the middle of the
                nodes (Noah, 2026-10-12) */}
            <td aria-hidden />
            <td colSpan={cols - 1} className="px-2 py-1">
              <SpotRule ticker={surface.ticker} price={liveSpot} centre />
            </td>
          </tr>
          {rowsBelow.map(renderRow)}
        </tbody>
      </table>
      {cardRow && card && <Fragment key="card">{rowCard(cardRow, card)}</Fragment>}
      {keptRow && keptPos && <Fragment key="kept">{rowCard(keptRow, keptPos, true)}</Fragment>}
    </div>
  );
};

export default ExposureMatrix;
