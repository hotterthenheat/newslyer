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
  /* near the open, the whole session; otherwise the first bar is where the day starts — even after the close (the audit's
     H4: a first bar after 15:30 threw the axis back to 09:30, 93% of both charts empty) */
  if (first <= OPEN_MIN + 30) return OPEN_MIN;
  return Math.max(OPEN_MIN, first);
}

/** The axis' last minute: the close — or the last bar's, when the tape runs past it (the house book after hours; the
    paying-user audit, 2026-10-13: its 16:11–22:40 bars were drawn in the last 9% of a 09:30–16:00 axis).
    LIVE, THE SESSION SO FAR (the owner, 2026-10-14, as a retail user at 10:47: four fifths of both charts were blank
    future): while the session runs the axis ends half an hour past the newest bar, on the next half hour, and never
    under two hours of day — so the morning's charts are full of the morning, and the axis grows with the day to the
    close. A replay and a closed session keep the whole day. */
export function dayAxisTo(lastTime: number | null | undefined, live = false): number {
  if (lastTime == null || !Number.isFinite(lastTime) || lastTime <= 0) return CLOSE_MIN;
  const last = nyMinutes(lastTime * 1000);
  if (live && last < CLOSE_MIN) {
    const ahead = Math.max(last + 30, OPEN_MIN + 120);
    return Math.min(CLOSE_MIN, Math.ceil(ahead / 30) * 30);
  }
  return Math.max(CLOSE_MIN, last + 1);
}

/** The marks under the axis: its start, the whole hours after it (the even ones on a narrow plot), its end — none
    near enough to the start or the end for their labels to print over each other */
export function dayHours(from: number, narrow: boolean, to: number = CLOSE_MIN): number[] {
  const gap = narrow ? 90 : 20;
  const out = [from];
  for (let t = Math.ceil(from / 60) * 60; t < to; t += 60) {
    if (t - from < gap || to - t < gap) continue;
    if (narrow && (t / 60) % 2 !== 0) continue;
    out.push(t);
  }
  out.push(to);
  return out;
}
