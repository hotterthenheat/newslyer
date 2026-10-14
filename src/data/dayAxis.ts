/*
==================================================
  SLAYER TERMINAL - THE DAY'S CLOCK (data/dayAxis.ts)

  Where the day box's two charts — the tape and the book through the
  day — start their clock. The session runs 09:30 to 16:00; a book whose
  first bar came later (the house book opened mid-afternoon, a page that
  had no history to backfill) drew three or four empty hours on the
  left of both charts (the dead-space scan, 2026-10-13: 60% of a
  2,700px chart empty before 13:16). The clock starts on the first bar's own
  minute (a quarter-hour floor still left a fifth of a short session's
  charts empty), so the two charts still share one axis, and on the
  open itself whenever the data reaches it.
==================================================
*/

import { nyMinutes } from '../core/nyTime';
import { CLOSE_MIN, OPEN_MIN } from './ahead';

/** The axis' first minute (New York minutes since midnight) for a session whose first bar is at `firstTime` (seconds) */
export function dayAxisFrom(firstTime: number | null | undefined): number {
  if (firstTime == null || !Number.isFinite(firstTime) || firstTime <= 0) return OPEN_MIN;
  const first = nyMinutes(firstTime * 1000);
  /* near the open, the whole session; a first bar in the last minutes is still where the day starts (the audit's H4: a
     first bar after 15:30 threw the axis back to 09:30, 93% of both charts empty) */
  if (first <= OPEN_MIN + 30 || first >= CLOSE_MIN - 1) return OPEN_MIN;
  return Math.max(OPEN_MIN, first);
}

/** The marks under the axis: its start, the whole hours after it (the even ones on a narrow plot), the close — none
    near enough to the start or the close for their labels to print over each other */
export function dayHours(from: number, narrow: boolean): number[] {
  const gap = narrow ? 90 : 20;
  const out = [from];
  for (let t = Math.ceil(from / 60) * 60; t < CLOSE_MIN; t += 60) {
    if (t - from < gap || CLOSE_MIN - t < gap) continue;
    if (narrow && (t / 60) % 2 !== 0) continue;
    out.push(t);
  }
  out.push(CLOSE_MIN);
  return out;
}
