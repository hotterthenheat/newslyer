/*
==================================================
  SLAYER TERMINAL - THE EXPORT DOOR (components/gex/ExportDoor.tsx)

  The book and its levels, taken away as files
  (data/exportBook.ts): one door on the Map's band,
  a short menu — the book as CSV, the levels as JSON.
  The Names door's own menu grammar.
==================================================
*/

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download } from 'lucide-react';
import { useAnchoredMenu } from '../ui/useAnchoredMenu';
import useFocusTrap from '../ui/useFocusTrap';
import { bookCsv, downloadText, levelsJson, stampForName } from '../../data/exportBook';
import { readLevelsScope } from '../../data/levelsScope';
import { sourceWords } from './BookProvenance';
import type { ExposureSurface, Greek } from '../../data/exposureSurface';

interface Props {
  surface: ExposureSurface;
  greeks: Greek[];
  expiries: number[];
  compact?: boolean;
}

const ExportDoor = ({ surface, greeks, expiries, compact = false }: Props) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { anchorRef, placed } = useAnchoredMenu<HTMLButtonElement>(open, 'bottom', 248, 'end');
  useFocusTrap(open, menuRef);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [open]);
  const stamp = stampForName();
  const take = (what: 'book' | 'levels') => {
    if (what === 'book') downloadText(`${surface.ticker}-book-${stamp}.csv`, bookCsv(surface, greeks, expiries), 'text/csv;charset=utf-8');
    else downloadText(`${surface.ticker}-levels-${stamp}.json`, levelsJson(surface, readLevelsScope(), sourceWords().short), 'application/json');
    setOpen(false);
  };
  const row = 'w-full text-left px-2.5 py-2 rounded-md hover:bg-ink/[0.06] transition-colors';
  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label="Export"
        title="Save the book as a file — the book as CSV, the levels as JSON"
        className={`inline-flex items-center gap-1.5 h-7 rounded-md border bg-chip transition-colors font-mono select-none ${compact ? 'w-7 justify-center' : 'px-2.5'} ${open ? 'border-silver/50' : 'border-borderSubtle hover:border-borderMuted'}`}
        data-ledger-export
      >
        <Download className="w-3 h-3 text-textMuted" />
        {!compact && <span className="text-[11px] text-textMuted">Export</span>}
      </button>
      {open &&
        placed &&
        createPortal(
          <div ref={menuRef} role="menu" aria-label="Export" style={{ position: 'fixed', ...placed.box }} className="z-[120] w-64 border border-borderMuted bg-panel/90 backdrop-blur-xl rounded-md shadow-2xl shadow-black/60 p-1.5 font-mono text-[11px] animate-slide-in" data-ledger-export-menu>
            <button type="button" role="menuitem" onClick={() => take('book')} className={row} data-export="book">
              <span className="block text-textPrimary">The book as CSV</span>
              <span className="block text-textMuted">
                {greeks.length} {greeks.length === 1 ? 'greek' : 'greeks'} · {expiries.length} {expiries.length === 1 ? 'date' : 'dates'} · {surface.strikes.length} strikes · put, call, net, open interest
              </span>
            </button>
            <button type="button" role="menuitem" onClick={() => take('levels')} className={row} data-export="levels">
              <span className="block text-textPrimary">The levels as JSON</span>
              <span className="block text-textMuted">call wall · flip · put wall · pin · supreme, with the moment and the source</span>
            </button>
          </div>,
          document.body
        )}
    </span>
  );
};

export default ExportDoor;
