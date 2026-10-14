/*
==================================================
  SLAYER TERMINAL - A BOX'S GRIP (ui/BoxGrip.tsx)

  The handle a box is moved by (the Map's boxes,
  pages/pinpoint/boxOrder.ts): drag it onto another
  box, or click it to swap the box with the one
  beside it — the keyboard's way to the same move.
  Flat, muted, in the head beside the box's name;
  not on a phone, where the boxes stand in one
  column and a jump row walks them.
==================================================
*/

import { GripVertical } from 'lucide-react';
import type { DragEvent } from 'react';

/** The drag's own type, so a box only ever lands on a box */
export const BOX_DRAG_TYPE = 'text/x-slayer-box';

interface Props {
  /** the box this grip moves */
  box: string;
  /** its name in words — "the day" */
  label: string;
  /** a click: swap with the box beside it */
  onSwap: () => void;
}

const BoxGrip = ({ box, label, onSwap }: Props) => {
  const onDragStart = (e: DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.setData(BOX_DRAG_TYPE, box);
    e.dataTransfer.effectAllowed = 'move';
    document.documentElement.setAttribute('data-box-dragging', box);
  };
  const onDragEnd = () => document.documentElement.removeAttribute('data-box-dragging');
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSwap}
      title={`Move ${label}: drag it onto the box beside it to swap sides, onto the other row to swap rows · click to swap sides`}
      aria-label={`Move ${label}`}
      className="hit max-sm:hidden shrink-0 inline-flex items-center justify-center w-5 h-5 -ml-1.5 rounded text-textMuted hover:text-textPrimary hover:bg-ink/[0.06] cursor-grab active:cursor-grabbing select-none touch-none transition-colors"
      data-box-grip={box}
    >
      <GripVertical className="w-3.5 h-3.5" />
    </button>
  );
};

export default BoxGrip;
