import { useSyncExternalStore } from 'react';

/*
==================================================
  SLAYER TERMINAL - ONE MINUTE UNDER THE POINTER (data/dayHover.ts)

  The day box draws the tape and the book's net gamma on one clock (idea 1,
  2026-10-13). The minute under the pointer on either plot is marked on
  both — this is the one minute, set by whichever plot has the pointer,
  read by the other.
==================================================
*/

export type DayHover = { min: number; from: 'tape' | 'through' } | null;

let current: DayHover = null;
const subs = new Set<() => void>();

export const setDayHover = (next: DayHover): void => {
  if ((current?.min ?? null) === (next?.min ?? null) && (current?.from ?? null) === (next?.from ?? null)) return;
  current = next;
  subs.forEach(f => f());
};

export const useDayHover = (): DayHover =>
  useSyncExternalStore(
    f => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => current,
    () => current
  );
