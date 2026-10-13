import { useSyncExternalStore } from 'react';
import type { LedgerPalette } from '../components/gex/ColoursSwitch';

/*
==================================================
  SLAYER TERMINAL - THE MAP'S COLOURS (data/ledgerPalette.ts)

  Which ramp the matrix and the calendar are painted in — thermal, or the
  house's ember and glacier. A preference, not a read, so it lives in
  Settings › Appearance and is remembered on this machine (idea 10,
  2026-10-13: the band's colours card was 150px of every row for a choice
  made once).
==================================================
*/

const KEY = 'slayer_ledger_palette';
const read = (): LedgerPalette => {
  try {
    return localStorage.getItem(KEY) === 'house' ? 'house' : 'thermal';
  } catch {
    return 'thermal';
  }
};
let current: LedgerPalette = read();
const subs = new Set<() => void>();

export const setLedgerPalette = (p: LedgerPalette): void => {
  current = p;
  try {
    localStorage.setItem(KEY, p);
  } catch {
    /* storage off */
  }
  subs.forEach(f => f());
};

export const useLedgerPalette = (): LedgerPalette =>
  useSyncExternalStore(
    f => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => current,
    () => current
  );
