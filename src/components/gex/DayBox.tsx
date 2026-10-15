import type { ReactNode } from 'react';
import FoldDoor from './FoldDoor';
import { useBoxFold } from '../../data/boxFold';

/*
==================================================
  SLAYER TERMINAL - THE DAY (components/gex/DayBox.tsx)

  The tape and the book's net gamma on one clock (idea 1, 2026-10-13):
  both ran 09:30 to 16:00, 340px tall, 350px apart, and the reader hovered
  twice to read one minute. One head, the two plots under it with the same
  left edge and the same right lane, the minute under the pointer marked
  on both (data/dayHover.ts). Folds to its head, remembered.
==================================================
*/

const DayBox = ({ scope, children }: { scope?: ReactNode; children: ReactNode }) => {
  const [open, toggle] = useBoxFold('day');
  /* min-h-0: the box is handed the row's height (MapDesk bookH) and must shrink its plots to it — without it the plots
     kept their flex basis and the box ran 80px into the clock card at 1440×900 (2026-10-14) */
  return (
    <section className="relative flex-1 flex flex-col min-w-0 min-h-0" data-day-box data-day-open={open || undefined}>
      {/* the name alone (2026-10-14): what the box is, is in its guide and its parts' own titles */}
      <div className="px-5 pt-3 pb-1">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-[16px] font-semibold leading-tight text-textPrimary">The day</h3>
          {scope}
          <FoldDoor open={open} onToggle={toggle} what="the day" testId="day" />
        </div>
      </div>
      {open && children}
    </section>
  );
};

export default DayBox;
