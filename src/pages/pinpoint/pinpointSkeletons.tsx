/*
==================================================
  SLAYER TERMINAL - PINPOINT'S SKELETONS BY PAGE
  (pages/pinpoint/pinpointSkeletons.tsx)

  What stands in for a Pinpoint page while its code
  travels (App's lazy routes) or its first read
  walks in. Noah, 2026-09-08: "the loading skeleton
  doesn't seem to take the shape of its container…
  a generic loading skeleton and that's a design
  flaw" — the shell showed ONE page skeleton for
  every route. Now every page stands in as its own
  boxes, drawn to the landed geometry measured at
  1500×1100 (scripts dump, 2026-09-08): the same
  paddings, the same heads, the same rows.

  STATIC CHROME RENDERS AS ITSELF: the shell row's
  page name and words come from the registry, so
  the row wraps exactly where the real one wraps
  (a one-line stand-in sat 22px short on Building).
  Only what data decides shimmers.

  Imports nothing heavy — no page, no simulator — so
  the shell can render these before any chunk lands.
==================================================
*/

import { Fragment } from 'react';
import { Skeleton } from '../../components/ui/Skeleton';
import { readLedgerView } from '../../components/gex/ledgerView';
import { Block, Box, Facts, Line, ScopeChipMark, SubLine, TitleRow, Trigger } from '../../components/ui/skeletonKit';
import { BuildingPageSkeleton } from '../../components/gex/buildingSkeletons';
import { WallPageSkeleton } from '../../components/gex/wallSkeletons';
import { TargetsPageSkeleton } from '../../components/gex/targetsSkeletons';
import { ComparePageSkeleton } from '../../components/gex/compareSkeletons';
import { GEX_SUBPAGES } from './subnav';

/* ---- the shell row ------------------------------------------------------------- */

/** The shell's head — the page's real icon, name and words on the left; on the
    right the four facts as label-over-value blocks the width of the real ones
    (Dealers · Flip · Flip crossed today · To the close) and the Ruler card. */
export const PinpointShellSkeleton = ({ pathname }: { pathname: string }) => {
  const page = GEX_SUBPAGES.find(p => pathname.startsWith(p.path)) ?? GEX_SUBPAGES[0];
  const PageIcon = page.icon;
  return (
    <header className="flex items-start gap-6 flex-wrap pb-3 border-b border-borderSubtle" aria-hidden data-skeleton="pinpoint-shell">
      <div className="min-w-0 flex-1">
        <div className="h-6 flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-borderSubtle text-textSecondary shrink-0">
            <PageIcon className="w-3.5 h-3.5" />
          </span>
          <span className="text-[15px] font-semibold leading-tight text-textPrimary">{page.label}</span>
        </div>
        <p className="mt-0.5 text-[11px] text-textMuted whitespace-nowrap truncate">{page.subtitle}</p>
      </div>
      <div className="flex items-center gap-6">
        <Facts widths={[112, 150, 58, 68]} />
        <Trigger w={86} />
      </div>
    </header>
  );
};

/* ---- the Map ------------------------------------------------------------------- */

/* THE MAP OPENS ON THE EXPOSURE MATRIX (Noah, 2026-09-28, with the August picture): its first box stands in as that table —
   the band (the chip, Expiry, Strikes, the replay door), the two head rows (a greek over three legs), one row per strike
   with a figure and its thin bar in every cell, the spot rule in the middle. Twenty strikes each side, 27px rows. */
/* THE CALENDAR'S SHAPE (2026-10-12): no read line above the grid any more (the pointer card took its words); seven
   date columns — the band's default window — the strike at the far left, the spot rule under the nodes alone with
   its pill in the middle, a 28px row of its own */
const CalendarGrid = () => (
  <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 grid" style={{ gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))', gridTemplateRows: '22px 22px repeat(20, minmax(18px, 1fr)) 28px repeat(20, minmax(18px, 1fr))' }}>
        <div className="row-span-2 px-2 flex items-end pb-1 border-b border-borderSubtle">
          <Line w={36} h={9} />
        </div>
        <div className="col-span-7 px-2 flex items-center justify-center border-l border-borderSubtle">
          <Line w={90} h={9} />
        </div>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={`h-${i}`} className={`px-2 flex items-center justify-end border-b border-borderSubtle ${i === 0 ? 'border-l' : ''}`}>
            <Line w={64} h={9} />
          </div>
        ))}
        {/* The real window: twenty strikes each side of spot (the ledger's floor), 18px rows */}
        {Array.from({ length: 41 }, (_, r) =>
          r === 20 ? (
            [
              <div key="spot-strike" />,
              <div key="spot" className="col-span-7 px-1.5 flex items-center gap-1.5">
                <span className="h-px flex-grow bg-gradient-to-r from-ink/[0.04] via-ink/[0.14] to-ink/[0.18]" />
                <Line w={24} h={9} />
                <Block w={48} h={15} className="rounded-[3px]" />
                <span className="w-6 shrink-0" />
                <span className="h-px flex-grow bg-gradient-to-l from-ink/[0.04] via-ink/[0.14] to-ink/[0.18]" />
              </div>,
            ]
          ) : (
            [
              <div key={`s-${r}`} className="pl-2 flex items-center">
                <Line w={30} h={11} />
              </div>,
              ...Array.from({ length: 7 }, (_, c) => (
                <div key={`c-${r}-${c}`} className={`min-w-0 px-[3px] py-[2px] ${c === 0 ? 'border-l border-borderSubtle/60' : ''}`}>
                  <Skeleton className="h-full w-full rounded-full" style={{ opacity: 0.45 + 0.55 * (1 - Math.abs(r - 20) / 20) }} />
                </div>
              )),
            ]
          )
        )}
      </div>
  </div>
);
export const CalendarInner = () => (
  <div className="h-full min-h-0 flex flex-col" aria-hidden data-skeleton="calendar-box" data-skeleton-view={readLedgerView('map')}>
    <div className="shrink-0 flex flex-wrap items-center gap-x-2 gap-y-1.5 px-3 py-1.5 border-b border-borderSubtle">
      <ScopeChipMark />
      <Trigger w={103} />
      <Trigger w={170} />
      <Trigger w={158} />
      <Trigger w={101} />
      <Trigger w={140} />
      <Block w={232} h={32} className="ml-auto rounded-md" />
      <Block w={85} h={24} className="rounded-md" />
      <Block w={28} h={28} className="rounded" />
    </div>
    {readLedgerView('map') === 'calendar' ? (
      <CalendarGrid />
    ) : (
    /* THE MATRIX'S SHAPE (2026-10-12): the net alone — one column a greek, the figure at the right and its bar the
       whole lane; the spot rule under the net columns alone, the strike column's cell of that row empty */
    <div className="flex-1 min-h-0 overflow-hidden">
      <div className="grid" style={{ gridTemplateColumns: '120px repeat(5, minmax(0, 1fr))' }}>
        <div className="row-span-2 px-2 flex items-end pb-1.5 border-b border-borderSubtle">
          <Line w={36} h={9} />
        </div>
        {[0, 1, 2, 3, 4].map(g => (
          <div key={`g-${g}`} className="px-2 pt-2 pb-1 flex items-center justify-center border-l border-borderSubtle">
            <Line w={78} h={9} />
          </div>
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <div key={`l-${i}`} className="px-2 py-1 flex items-center justify-end border-b border-borderSubtle border-l">
            <Line w={24} h={8} />
          </div>
        ))}
        {Array.from({ length: 41 }, (_, r) =>
          r === 20 ? (
            [
              <div key="spot-strike" className="h-[26px]" />,
              <div key="spot" className="col-span-5 px-2 h-[26px] flex items-center gap-1.5">
                <span className="h-px flex-grow bg-gradient-to-r from-ink/[0.04] via-ink/[0.14] to-ink/[0.18]" />
                <Line w={24} h={9} />
                <Block w={48} h={15} className="rounded-[3px]" />
                <span className="w-6 shrink-0" />
                <span className="h-px flex-grow bg-gradient-to-l from-ink/[0.04] via-ink/[0.14] to-ink/[0.18]" />
              </div>,
            ]
          ) : (
            [
              <div key={`s-${r}`} className="pl-2 h-[27px] flex items-center border-b border-borderSubtle/30 border-r border-borderSubtle/40 bg-inset">
                <Line w={30} h={10} />
              </div>,
              ...Array.from({ length: 5 }, (_, c) => (
                <div key={`c-${r}-${c}`} className="pl-3 pr-3 h-[27px] flex flex-col items-end justify-center gap-1 border-b border-borderSubtle/30 border-l border-borderSubtle/50">
                  <Line w={44} h={9} />
                  <Skeleton className="h-[3px] rounded-full w-full" style={{ opacity: 0.6 }} />
                </div>
              )),
            ]
          )
        )}
      </div>
    </div>
    )}
  </div>
);
export const CalendarBoxSkeleton = ({ className = 'h-[870px]' }: { className?: string }) => (
  <div className={`border border-borderSubtle rounded-md overflow-hidden flex flex-col ${className}`}>
    <CalendarInner />
  </div>
);

/** The Day: the trader's clock — head with three facts, the phases strip, the schedule band, the line */
export const DayInner = () => (
    <section className="relative flex flex-col min-w-0" aria-hidden data-skeleton="day-box">
      <div className="px-5 pt-4 pb-3 flex items-start gap-6 flex-wrap">
        <div className="min-w-0 flex-1">
          <TitleRow title={130} />
          <SubLine w={520} />
        </div>
        <Facts widths={[88, 104, 96]} />
      </div>
      <div className="px-5 pb-4">
        <div className="relative h-5 flex items-center gap-1">
          {[14, 13, 22, 16, 20, 15].map((w, i) => (
            <Block key={i} w={`${w}%`} h={20} className="rounded-sm" style={{ opacity: 0.5 + (i % 2) * 0.25 }} />
          ))}
        </div>
        <div className="relative h-[42px] mt-0 flex items-end gap-[3px]">
          {Array.from({ length: 13 }, (_, i) => (
            <Block key={i} w="100%" h={8 + ((i * 5) % 7) * 4 + (i > 9 ? 10 : 0)} className="rounded-t-sm" style={{ opacity: 0.6 }} />
          ))}
        </div>
        <div className="mt-2 h-5 flex items-center">
          <Line w="58%" h={11} />
        </div>
      </div>
    </section>
);
export const DayBoxSkeleton = () => (
  <Box>
    <DayInner />
  </Box>
);

/** How the levels held today: a head and five level rows of 85px */
export const ReportInner = () => (
    <section className="relative flex flex-col min-w-0" aria-hidden data-skeleton="report-box">
      <div className="px-5 pt-4 pb-3">
        <TitleRow title={190} />
        <SubLine w={340} />
      </div>
      <ul className="flex flex-col">
        {[130, 110, 96, 120, 90].map((w, i) => (
          <li key={i} className="border-t border-borderSubtle/50 h-[85px] px-5 flex flex-col justify-center gap-2">
            <div className="flex items-center gap-4">
              <Line w={w} h={12} />
              <Line w={70} />
              <Block w="22%" h={6} className="rounded-full" />
              <Line w={64} className="ml-auto" />
              <Line w={64} />
              <Line w={64} />
            </div>
            <Line w="52%" />
          </li>
        ))}
      </ul>
    </section>
);
export const ReportBoxSkeleton = () => (
  <Box className="overflow-hidden">
    <ReportInner />
  </Box>
);

/* The Map opens on the calendar since 2026-09-12 (the chart box is gone — Terrain and Pulse carry
   it); Your positions left for the Weigher's desk on 2026-09-14 */
export const MapPageSkeleton = () => (
  <>
    <CalendarBoxSkeleton />
    <DayBoxSkeleton />
    <ReportBoxSkeleton />
  </>
);

/* ---- Ahead --------------------------------------------------------------------- */

/** The range: the head with its one card, the timetable — the three names over the lane, a row a half hour with its bar and
    what dealers trade — and the one read line (redrawn 2026-09-30) */
export const CorridorInner = () => (
    <section className="relative flex flex-col min-w-0" aria-hidden data-skeleton="corridor-box">
      {/* the head: the title, the chip, the door; one line under; the If vol card at the right */}
      <div className="px-5 pt-4 pb-2 flex items-start gap-6">
        <div className="min-w-0 flex-1">
          <TitleRow title={92} />
          <SubLine w={520} />
        </div>
        <Skeleton className="h-7 w-[150px] rounded-md" />
      </div>
      {/* the timetable (2026-09-30): the three names over the lane, then a row a half hour — its bar, and what dealers trade */}
      <div className="px-5 pb-1">
        <div className="grid grid-cols-[52px_minmax(0,1fr)_92px] sm:grid-cols-[72px_minmax(0,1fr)_minmax(140px,0.3fr)] gap-x-4 items-end h-[42px] pb-1.5">
          <Line w={18} h={8} />
          <div className="relative h-[30px]">
            <div className="absolute top-0 left-[12%]"><Line w={96} h={9} /></div>
            <div className="absolute top-0 right-[10%]"><Line w={90} h={9} /></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2"><Line w={46} h={10} /></div>
          </div>
          <Line w={104} h={8} />
        </div>
        {Array.from({ length: 13 }, (_, i) => (
          <div key={i} className="grid grid-cols-[52px_minmax(0,1fr)_92px] sm:grid-cols-[72px_minmax(0,1fr)_minmax(140px,0.3fr)] gap-x-4 items-center h-[28px]">
            <Line w={i === 12 ? 62 : 36} h={11} />
            <div className="relative h-full">
              <Skeleton className="absolute top-1/2 -translate-y-1/2 h-[12px] rounded-full" style={{ left: `${Math.max(19, 44 - i * 2.4)}%`, right: `${Math.max(19, 40 - i * 2.2)}%` }} />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-[6px] rounded-full" style={{ width: `${18 + i * 3}%` }} />
              <Line w={30} h={9} />
            </div>
          </div>
        ))}
      </div>
      {/* the one read line */}
      <div className="mx-5 mt-1 mb-4 pt-3 border-t border-ink/[0.06] min-h-[52px]">
        <Line w="78%" h={11} />
      </div>
    </section>
);
export const CorridorBoxSkeleton = () => (
  <Box>
    <CorridorInner />
  </Box>
);

/** Where it closes: the head with four facts, the rows (redrawn 2026-09-13 evening on the partner's rows) — a 16px
    header, 25 rows of 24 with a bell of bar lengths and the spot rule between them, the key line — the read line, the four reads */
export const CloseInner = () => (
  <section className="relative flex flex-col min-w-0" aria-hidden data-skeleton="close-box">
    <div className="px-5 pt-4 pb-2 flex items-start gap-6 flex-wrap">
      <div className="min-w-0 flex-1">
        <TitleRow title={118} />
        <SubLine w={560} />
      </div>
      <Facts widths={[80, 96, 96, 150]} />
    </div>
    <div className="px-5 pt-1 pb-2">
      <div className="h-[16px] grid grid-cols-[118px_minmax(0,1fr)_64px] gap-x-3 items-center">
        <Line w={40} h={8} />
        <Line w={170} h={8} />
        <Line w={28} h={8} className="justify-self-end" />
      </div>
      {/* the rows are the book's — 21 to 26 as the window rolls; 23 stands in */}
      {Array.from({ length: 23 }, (_, i) => {
        const share = Math.exp(-0.5 * ((i - 10.5) / 4) ** 2);
        return (
          <Fragment key={i}>
            {i === 11 && (
              <div className="h-[18px] flex items-center px-1">
                <Line w="100%" h={1} />
              </div>
            )}
            <div className="grid grid-cols-[118px_minmax(0,1fr)_64px] gap-x-3 items-center h-[24px] px-1">
              <Line w={28} h={11} />
              <Block w={`${Math.max(4, share * 100)}%`} h={12} className="rounded-full" style={{ opacity: i === 10 ? 0.9 : 0.35 }} />
              <Line w={30} h={11} className="justify-self-end" />
            </div>
          </Fragment>
        );
      })}
      <div className="mt-2 h-[14px] flex items-center gap-4">
        <Line w={70} h={8} />
        <Line w={70} h={8} />
        <Line w={110} h={8} />
      </div>
    </div>
    <div className="px-5 h-[18px] flex items-center">
      <Line w={320} h={9} />
    </div>
    {/* the four reads: most likely · the bands · the pull · the slices */}
    <div className="px-5 pb-4 pt-2 grid gap-x-4 gap-y-1.5" style={{ gridTemplateColumns: '84px minmax(0, 1fr)' }}>
      {[[52, '34%'], [46, '58%'], [40, '50%'], [48, '72%']].map(([l, w], i) => (
        <Fragment key={i}>
          <div className="h-[17px] flex items-center">
            <Line w={l as number} h={9} />
          </div>
          <div className="h-[17px] flex items-center">
            <Line w={w as string} h={11} />
          </div>
        </Fragment>
      ))}
    </div>
  </section>
);
export const CloseBoxSkeleton = () => (
  <Box>
    <CloseInner />
  </Box>
);

export const AheadPageSkeleton = () => (
  <>
    <CorridorBoxSkeleton />
    <CloseBoxSkeleton />
  </>
);

/* ---- Targets ------------------------------------------------------------------- */

/** The agenda and the axis, in their own file (components/gex/targetsSkeletons.tsx) */
export { TargetsPageSkeleton };

/* ---- Board --------------------------------------------------------------------- */

/** The board: its toolbar, the grid's head and its rows of 44 */
export const BoardPageSkeleton = ({ rows = 12 }: { rows?: number }) => (
  <div className="border border-borderSubtle rounded-md overflow-hidden flex flex-col" aria-hidden data-skeleton="board">
    <div className="shrink-0 flex items-center gap-3 flex-wrap px-2 py-1.5 bg-panel border-b border-borderSubtle/70 h-[38px]">
      <Line w={137} h={9} />
      <Line w={415} h={9} />
      <Block w={160} h={25} className="ml-auto rounded" />
      <Line w={164} h={9} />
    </div>
    {/* the grid, one block the way AG Grid mounts: a 30px head and rows of 44 */}
    <div style={{ height: 30 + rows * 44 + 1 }}>
      <div className="flex items-center gap-3 px-3 h-[30px] border-b border-borderSubtle/60">
        {[70, 90, 80, 90, 80, 80, 80, 80, 90, 100].map((w, i) => (
          <Line key={i} w={w} h={9} className={i > 0 ? 'ml-auto' : ''} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-3 px-3 h-[44px] border-b border-borderSubtle/40">
          <div className="flex items-center gap-2">
            <Block w={22} h={22} className="rounded-md" />
            <Line w={44} h={12} />
          </div>
          {[70, 70, 80, 70, 70, 80, 70, 90, 100].map((w, i) => (
            <Line key={i} w={w} h={11} className="ml-auto" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

/* ---- by path ------------------------------------------------------------------- */

/** The page under the shell row, by path */
export const PinpointPageSkeleton = ({ pathname }: { pathname: string }) => {
  if (pathname.startsWith('/pinpoint/building')) return <BuildingPageSkeleton />;
  if (pathname.startsWith('/pinpoint/wall')) return <WallPageSkeleton />;
  if (pathname.startsWith('/pinpoint/ahead')) return <AheadPageSkeleton />;
  if (pathname.startsWith('/pinpoint/targets')) return <TargetsPageSkeleton />;
  if (pathname.startsWith('/pinpoint/board')) return <BoardPageSkeleton />;
  if (pathname.startsWith('/pinpoint/compare')) return <ComparePageSkeleton />;
  return <MapPageSkeleton />;
};

/** The whole route standing: the shell row, then the page in its own frame */
export const PinpointRouteSkeleton = ({ pathname }: { pathname: string }) => (
  <>
    <PinpointShellSkeleton pathname={pathname} />
    <div className="flex flex-col gap-4 flex-grow min-h-[calc(100vh-174px)]" aria-busy="true" aria-label="Loading">
      <PinpointPageSkeleton pathname={pathname} />
    </div>
  </>
);
