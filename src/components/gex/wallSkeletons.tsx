/*
==================================================
  SLAYER TERMINAL - THE AT THE WALL PAGE'S SKELETON
  (components/gex/wallSkeletons.tsx)

  The one box standing in its own shape (redrawn
  2026-09-30 with the page): the head, the row of
  dots, the chart's block, the seven reasons beside
  it, the stack of walls with price between, the
  sentence. Imports nothing but Skeleton, so the
  shell can show it while the page's chunk is still
  travelling. The surface imports its geometry FROM
  here, so the two cannot drift.
==================================================
*/

import { Skeleton } from '../ui/Skeleton';
import { ScopeChipMark } from '../ui/skeletonKit';

/* ---- geometry shared with AtTheWall.tsx ------------------------------------------ */

/** The chart with the two zones */
export const WALL_CHART_H = 300;
/** One reason: its words over its bar */
export const WALL_REASON_H = 42;
export const WALL_REASONS = 7;
/** Wall · gets there · holds · if it breaks · if it holds · tested today */
export const WALL_STACK_COLUMNS = '150px minmax(160px,1fr) minmax(160px,1fr) minmax(0,0.9fr) minmax(0,0.9fr) 172px';
/** The stack's one row — fixed, so the box never moves as the figures do (Noah, 2026-09-13: "the bars should not be getting bigger") */
export const WALL_STACK_ROW_H = 36;
export const WALL_STACK_HEAD_H = 30;
export const WALL_SPOT_H = 24;

export const AtTheWallInner = ({ rows = 6 }: { rows?: number }) => (
  <section className="relative flex flex-col min-w-0" aria-hidden data-skeleton="wall-box">
    <div className="px-5 pt-4 pb-3 flex items-start gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3 h-6">
          <Skeleton className="h-[15px] w-[84px] rounded" />
          <ScopeChipMark />
          <Skeleton className="h-3 w-[78px] rounded" />
        </div>
        <Skeleton className="mt-1.5 h-[10px] w-[360px] max-w-full rounded" />
      </div>
      <Skeleton className="h-[9px] w-[190px] rounded mt-1.5 max-md:hidden" />
    </div>
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="px-5 pb-4 min-w-0">
        <div className="flex items-center gap-3 pb-3 h-[32px]">
          <Skeleton className="h-[10px] w-[190px] rounded" />
          <Skeleton className="h-[13px] w-[176px] rounded-full" />
          <Skeleton className="h-[12px] w-[70px] rounded" />
        </div>
        <Skeleton className="w-full rounded-md" style={{ height: WALL_CHART_H }} />
        <div className="pt-2 h-[23px] flex items-center gap-5">
          <Skeleton className="h-[9px] w-[100px] rounded" />
          <Skeleton className="h-[9px] w-[110px] rounded" />
          <Skeleton className="h-[9px] w-[220px] rounded" />
        </div>
      </div>
      <div className="px-5 pb-4 min-w-0 xl:border-l border-ink/[0.06] max-xl:border-t max-xl:pt-3">
        <Skeleton className="h-[10px] w-[250px] rounded mb-3" />
        <div className="grid grid-cols-2 pb-1 h-[15px]">
          <Skeleton className="h-[8px] w-[110px] rounded justify-self-end mr-2.5" />
          <Skeleton className="h-[8px] w-[100px] rounded ml-2.5" />
        </div>
        {Array.from({ length: WALL_REASONS }, (_, i) => (
          <div key={i} className="border-t border-ink/[0.06] flex flex-col justify-center" style={{ height: WALL_REASON_H }}>
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-[10px] rounded" style={{ width: 110 + ((i * 37) % 70) }} />
              <Skeleton className="h-[9px] rounded" style={{ width: 90 + ((i * 53) % 90) }} />
            </div>
            <Skeleton className="mt-2 h-[7px] rounded-full" style={{ width: `${18 + ((i * 29) % 30)}%`, marginLeft: i % 2 ? '50%' : `${50 - (18 + ((i * 29) % 30))}%` }} />
          </div>
        ))}
      </div>
    </div>
    <div className="border-t border-ink/[0.06] overflow-hidden">
      <div className="grid items-center gap-x-4 px-5" style={{ gridTemplateColumns: WALL_STACK_COLUMNS, height: WALL_STACK_HEAD_H }}>
        {[64, 70, 96, 70, 64, 78].map((w, i) => (
          <Skeleton key={i} className="h-[8px] rounded" style={{ width: w }} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>
          {i === Math.ceil(rows / 2) && (
            <div className="px-5 border-t border-ink/[0.06] flex items-center" style={{ height: WALL_SPOT_H }}>
              <Skeleton className="h-px w-full" />
            </div>
          )}
          <div className="grid items-center gap-x-4 px-5 border-t border-ink/[0.06]" style={{ gridTemplateColumns: WALL_STACK_COLUMNS, height: WALL_STACK_ROW_H }}>
            <Skeleton className="h-[13px] w-[92px] rounded" />
            <Skeleton className="h-[5px] w-full rounded-full" />
            <Skeleton className="h-[5px] w-full rounded-full" />
            <Skeleton className="h-[10px] w-[96px] rounded" />
            <Skeleton className="h-[10px] w-[120px] rounded" />
            <Skeleton className="h-[10px] w-[60px] rounded" />
          </div>
        </div>
      ))}
    </div>
    <div className="px-5 py-3.5 border-t border-ink/[0.06] min-h-[58px] flex flex-col justify-center gap-2">
      <Skeleton className="h-[11px] w-[88%] rounded" />
    </div>
  </section>
);

/* ---- the page ------------------------------------------------------------------- */

/* six walls stand in — the book's own count runs five to nine */
export const WallPageSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <div className="border border-borderSubtle rounded-md bg-panel" data-wall>
    <AtTheWallInner rows={rows} />
  </div>
);
