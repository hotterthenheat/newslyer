/*
==================================================
  SLAYER TERMINAL - FALLING INTO PLACE
  (components/ui/Settle.ts)

  The boxes of a page settle as it opens: a short
  drop with one soft bounce, each box a beat after
  the last (2026-10-14, the owner: "a little bounce
  motion where everything falls into place, make it
  smooth"). The motion is CSS (index.css .settle —
  transform and opacity on the compositor, nothing
  left on the box once it has run); this hook only
  says WHEN: under the launch gate a box waits
  unseen and settles the moment the gate lifts, so
  the page the gate reveals is the page falling
  into place; opened from inside the terminal it
  settles on mount.
==================================================
*/

import type { CSSProperties } from 'react';
import { useGateUp } from '../layout/LaunchTransition';

export interface SettleProps {
  className: string;
  style: CSSProperties;
  'data-settle': number;
}

/** One call a page: the class and the beat for each of its boxes — spread `settle(order)` onto the box's element,
    `order` its place in the fall, 0 first; the box's own classes and style go beside it */
export const useSettle = (): ((order: number) => SettleProps) => {
  const gateUp = useGateUp();
  const className = gateUp ? 'settle-wait' : 'settle';
  return order => ({ className, style: { '--settle-i': order } as CSSProperties, 'data-settle': order });
};
