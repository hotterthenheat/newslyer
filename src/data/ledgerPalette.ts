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
/* THE HOUSE RAMP BY DEFAULT (2026-10-13, the heatmap comparison: thermal's zero is a pale yellow, the brightest thing on
   a dark page, so every quiet and $0 cell glowed; the house ramp's zero is the panel's own dark grey and its two poles
   are colour-blind safe). Thermal stays one click away in Settings, and a thermal choice made there is kept. */
const read = (): LedgerPalette => {
  try {
    return localStorage.getItem(KEY) === 'thermal' ? 'thermal' : 'house';
  } catch {
    return 'house';
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
