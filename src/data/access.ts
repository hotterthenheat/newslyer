/*
  SLAYER TERMINAL - THE GATES (data/access.ts)

  Noah (2026-10-10): "lets do the plan gates." Every room on the rail belongs to a plan, the same split the pricing
  cards show — Book: Pulse, Terrain, Pinpoint; Tape adds Trace and Dossier (and Scripts inside Terrain); Desk adds
  Compass, the Weigher, Practice and Community. Start and Settings belong to no plan.

  A room opens to a plan at or above its own that STANDS — active, or in a trial. A failed payment locks the rooms the
  moment Stripe reports it (Noah: "i would like all data to cease if failed, i dont want a retry of a week"); Stripe
  keeps retrying the card in the background, and the rooms open again the moment a retry clears. Owners walk
  everywhere. Signed out, or signed in with no plan, every room is locked — there is no try-it-first.

  With no Stripe key in the environment there are no gates at all, so the photographer, the checks and a machine
  without the keys keep working.
*/

import { useMemo, useSyncExternalStore } from 'react';
import { useAccount, type AccountProfile, type AccountState } from './account';
import { BILLING_ON, type PlanKey } from './billing';

/* the photographer, the link check and the phone sweep drive a dev server signed out — an automated browser in
   development walks through (navigator.webdriver is what Playwright sets); a build for people never reads this */
export const GATES_ON: boolean = BILLING_ON && !(import.meta.env.DEV && typeof navigator !== 'undefined' && navigator.webdriver);

export const PLAN_RANK: Record<PlanKey, number> = { book: 1, tape: 2, desk: 3, seat: 4 };

/** the plan a room belongs to, by the longest path it starts with */
const ROOM_PLAN: [string, PlanKey][] = [
  ['/pulse', 'book'],
  ['/terrain', 'book'],
  ['/pinpoint', 'book'],
  ['/trace', 'tape'],
  ['/dossier', 'tape'],
  ['/compass', 'desk'],
  ['/weigher', 'desk'],
  ['/practice', 'desk'],
  ['/community', 'desk'],
];
export const planFor = (pathname: string): PlanKey | null => {
  let best: [string, PlanKey] | null = null;
  for (const r of ROOM_PLAN) {
    if (pathname !== r[0] && !pathname.startsWith(`${r[0]}/`)) continue;
    if (!best || r[0].length > best[0].length) best = r;
  }
  return best?.[1] ?? null;
};

/* SEEING THE TERMINAL AS A MEMBER (Noah, 2026-10-10, an owner on a Book he had just bought: "everything is open to me…
   i would like to see what a user who only spends 80 sees"): an owner may look through a plan's eyes — none, Book, Tape
   or Desk — for this browser session; nothing on the row changes, only what the gates let this screen open. Settings ›
   Billing holds the switch; a wall says when it is on. */
export type ViewAs = 'self' | 'none' | PlanKey;
const VIEW_KEY = 'slayer_view_as';
const readView = (): ViewAs => {
  try {
    const v = sessionStorage.getItem(VIEW_KEY);
    return v === 'none' || v === 'book' || v === 'tape' || v === 'desk' ? v : 'self';
  } catch {
    return 'self';
  }
};
let viewAs: ViewAs = typeof window !== 'undefined' ? readView() : 'self';
const viewListeners = new Set<() => void>();
export const getViewAs = (): ViewAs => viewAs;
export function setViewAs(v: ViewAs): void {
  viewAs = v;
  try {
    if (v === 'self') sessionStorage.removeItem(VIEW_KEY);
    else sessionStorage.setItem(VIEW_KEY, v);
  } catch {
    /* storage off — the view lives for the page */
  }
  viewListeners.forEach(fn => fn());
}
const subscribeView = (fn: () => void) => {
  viewListeners.add(fn);
  return () => {
    viewListeners.delete(fn);
  };
};
export const useViewAs = (): ViewAs => useSyncExternalStore(subscribeView, getViewAs, getViewAs);

/** the plan a profile HOLDS — one that stands (active or in trial); an owner holds everything, unless looking through
    a plan's eyes; none → null */
export const planHeld = (p: AccountProfile | null, view: ViewAs = 'self'): PlanKey | null => {
  if (!p) return null;
  if (p.role === 'owner') return view === 'self' ? 'seat' : view === 'none' ? null : view;
  if (p.plan === 'none') return null;
  return p.planStatus === 'active' || p.planStatus === 'trialing' ? p.plan : null;
};

/** does a plan held open a room that needs another — no plan needed opens to everyone */
export const opens = (held: PlanKey | null, needed: PlanKey | null): boolean => !needed || (!!held && PLAN_RANK[held] >= PLAN_RANK[needed]);

export interface Access {
  /** gates exist on this build */
  on: boolean;
  status: AccountState['status'];
  /** the plan held, standing — 'seat' for an owner, null for none */
  held: PlanKey | null;
  owner: boolean;
  /** an owner looking through a plan's eyes — 'self' otherwise */
  viewing: ViewAs;
  /** a room's path, or a plan by name: does the person get in? */
  can: (pathOrPlan: string) => boolean;
}

export function useAccess(): Access {
  const a = useAccount();
  const view = useViewAs();
  const role = a.profile?.role ?? null;
  const viewing: ViewAs = role === 'owner' ? view : 'self';
  const held: PlanKey | null = GATES_ON ? planHeld(a.profile, viewing) : 'seat';
  return useMemo(
    () => ({
      on: GATES_ON,
      status: a.status,
      held,
      owner: role === 'owner',
      viewing,
      can: (x: string) => !GATES_ON || opens(held, x.startsWith('/') ? planFor(x) : (x as PlanKey)),
    }),
    [a.status, held, role, viewing]
  );
}
