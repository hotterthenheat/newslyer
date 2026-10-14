/*
==================================================
  SLAYER TERMINAL - WHERE THE MAP'S BOXES STAND
  (pages/pinpoint/boxOrder.ts)

  The four boxes of the Map — the book, the day,
  the clock, the report — in two rows, in the order
  the reader put them (the owner, 2026-10-14: "it
  makes no sense not to be able to move the day
  and the book"). A box is dragged by its grip
  (ui/BoxGrip.tsx) onto another: onto the box
  beside it the two swap sides; onto a box of the
  other row the rows swap. Kept on this machine.
==================================================
*/

import { useSyncExternalStore } from 'react';

export type MapBox = 'book' | 'day' | 'clock' | 'report';
export interface BoxOrder {
  /** the pair that stands together: the book and the day */
  top: [MapBox, MapBox];
  /** the other pair: the clock and the report */
  bottom: [MapBox, MapBox];
  /** which pair stands first */
  rows: 'book-first' | 'clock-first';
}

const KEY = 'slayer_map_boxes';
const DEFAULT: BoxOrder = { top: ['book', 'day'], bottom: ['clock', 'report'], rows: 'book-first' };

const isPair = (v: unknown, a: MapBox, b: MapBox): v is [MapBox, MapBox] => Array.isArray(v) && v.length === 2 && ((v[0] === a && v[1] === b) || (v[0] === b && v[1] === a));

const read = (): BoxOrder => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as Partial<BoxOrder>;
    return {
      top: isPair(p.top, 'book', 'day') ? p.top : DEFAULT.top,
      bottom: isPair(p.bottom, 'clock', 'report') ? p.bottom : DEFAULT.bottom,
      rows: p.rows === 'clock-first' ? 'clock-first' : 'book-first',
    };
  } catch {
    return DEFAULT;
  }
};

let order: BoxOrder = typeof window === 'undefined' ? DEFAULT : read();
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const write = (next: BoxOrder) => {
  order = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage off — the order lives for the session */
  }
  listeners.forEach(fn => fn());
};

export const useBoxOrder = (): BoxOrder => useSyncExternalStore(subscribe, () => order, () => DEFAULT);
export const readBoxOrder = (): BoxOrder => order;

const rowOf = (b: MapBox, o: BoxOrder): 'top' | 'bottom' => (o.top.includes(b) ? 'top' : 'bottom');

/** A box dropped onto another: beside it, the two swap sides; across the rows, the rows swap */
export function moveBox(from: MapBox, onto: MapBox): void {
  if (from === onto) return;
  const o = order;
  if (rowOf(from, o) === rowOf(onto, o)) {
    const row = rowOf(from, o);
    const pair: [MapBox, MapBox] = [o[row][1], o[row][0]];
    write({ ...o, [row]: pair });
  } else write({ ...o, rows: o.rows === 'book-first' ? 'clock-first' : 'book-first' });
}

/** The box beside this one in its row — what a click on the grip swaps it with */
export function besideOf(box: MapBox): MapBox {
  const o = order;
  const row = o[rowOf(box, o)];
  return row[0] === box ? row[1] : row[0];
}

export const resetBoxOrder = (): void => write(DEFAULT);

/** Where each box stands, as CSS `order` values the Map's flex column reads: the first pair 0–1, the second 10–11 */
export function boxOrders(o: BoxOrder): Record<MapBox, number> {
  const topBase = o.rows === 'book-first' ? 0 : 10;
  const bottomBase = o.rows === 'book-first' ? 10 : 0;
  return {
    [o.top[0]]: topBase,
    [o.top[1]]: topBase + 1,
    [o.bottom[0]]: bottomBase,
    [o.bottom[1]]: bottomBase + 1,
  } as Record<MapBox, number>;
}
