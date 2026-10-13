/*
==================================================
  SLAYER TERMINAL - HOW TO READ THE WALL
  (components/gex/WallGuide.tsx)

  The guide for the At the wall page, in the house
  pattern: a focus-and-blur card, each figure the
  surface drawn small, one or two sentences each,
  "Today" from the numbers on screen.
==================================================
*/

import type { ReactNode } from 'react';
import { CALL_WALL, THERMAL_WARM } from './paletteInk';
import { fmtDollars, fmtStrike, type AheadClock } from '../../data/ahead';
import type { WallBoard } from '../../data/wall';

const SILVER = 'rgb(var(--silver))'; /* the silver token — deep steel on the light terminal (2026-09-12) */
/** The surface's inks: breaks is the calendar's warm side, a shelf's weight its cool side */
const WARM = THERMAL_WARM;
const MONO = 'ui-monospace, Menlo, monospace';
const SANS = 'ui-sans-serif, system-ui, sans-serif';

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="px-5 py-4 border-b border-borderSubtle/60 last:border-b-0">
    <h4 className="text-[13px] font-semibold text-textPrimary">{title}</h4>
    <div className="mt-2 text-[12px] leading-relaxed text-textSecondary">{children}</div>
  </section>
);

const Figure = ({ children, label, h = 110 }: { children: ReactNode; label: string; h?: number }) => (
  <figure data-theme="dark" className="mt-3 rounded-md border border-borderSubtle/60 bg-panel p-2">
    <svg viewBox={`0 0 420 ${h}`} width="100%" role="img" aria-label={label} data-guide-figure>
      {children}
    </svg>
  </figure>
);

/* The two zones, small: today's price as a line, a dot where it tested the wall, and ahead of now a box each way from the wall */
const ZonesFigure = () => {
  const wallY = 46;
  const nowX = 236;
  const pts = '10,84 34,74 58,66 82,50 100,47 118,60 142,66 166,58 186,48 204,58 220,66 236,70';
  return (
    <Figure label="Today's price as a line with two dots where it tested the wall; ahead of now, a warm box above the wall for a break and a silver box below it for a hold" h={118}>
      <rect x={nowX} y={10} width={174} height={wallY - 10} rx={4} fill={WARM} fillOpacity={0.14} stroke={WARM} strokeOpacity={0.45} />
      <rect x={nowX} y={wallY} width={174} height={38} rx={4} fill={SILVER} fillOpacity={0.1} stroke={SILVER} strokeOpacity={0.4} />
      <text x={nowX + 10} y={25} fontSize={9.5} fontWeight={700} fill={WARM} fontFamily={SANS}>
        Breaks · 6 in 10
      </text>
      <text x={nowX + 10} y={37} fontSize={7.5} fill="#a3a3a3" fontFamily={SANS}>
        runs to 487
      </text>
      <text x={nowX + 10} y={62} fontSize={9.5} fontWeight={700} fill={SILVER} fontFamily={SANS}>
        Holds · 4 in 10
      </text>
      <text x={nowX + 10} y={74} fontSize={7.5} fill="#a3a3a3" fontFamily={SANS}>
        back toward 483.50
      </text>
      <line x1={100} x2={410} y1={wallY} y2={wallY} stroke={CALL_WALL} strokeWidth={1.5} />
      <line x1={nowX} x2={nowX} y1={6} y2={96} stroke="#ffffff" strokeOpacity={0.3} strokeDasharray="2 3" />
      <polyline points={pts} fill="none" stroke="#ededed" strokeWidth={1.25} strokeLinejoin="round" />
      <circle cx={100} cy={47} r={3.5} fill={SILVER} stroke="#0a0a0a" strokeWidth={1.5} />
      <circle cx={186} cy={48} r={3.5} fill={SILVER} stroke="#0a0a0a" strokeWidth={1.5} />
      <circle cx={nowX} cy={70} r={3} fill="#ededed" stroke="#0a0a0a" strokeWidth={1.5} />
      <text x={nowX} y={108} textAnchor="middle" fontSize={7.5} fill="#8a909c" fontFamily={MONO}>
        now
      </text>
      <text x={100} y={108} textAnchor="middle" fontSize={7.5} fill="#8a909c" fontFamily={SANS}>
        tested, held
      </text>
    </Figure>
  );
};

/* The reasons, small: a bar a reason from the middle line, warm to the left for a break, silver to the right for a hold */
const TugFigure = () => {
  const rows = [
    { name: 'A one-point vol drop', push: -0.85 },
    { name: 'Expires at 4:00', push: -0.5 },
    { name: 'Built or drained', push: -0.18 },
    { name: 'Tested today', push: 0.3 },
    { name: 'The market’s speed', push: 0.45 },
  ];
  const mid = 250;
  const half = 150;
  return (
    <Figure label="A bar for each reason from a middle line: warm to the left when it pushes toward a break, silver to the right when it pushes toward a hold, the strongest break first" h={104}>
      <text x={mid - 6} y={11} textAnchor="end" fontSize={6.5} fill={WARM} fontFamily={SANS} letterSpacing={0.8}>
        ← TOWARD A BREAK
      </text>
      <text x={mid + 6} y={11} fontSize={6.5} fill={SILVER} fontFamily={SANS} letterSpacing={0.8}>
        TOWARD A HOLD →
      </text>
      <line x1={mid} x2={mid} y1={16} y2={100} stroke="#ffffff" strokeOpacity={0.25} />
      {rows.map((r, i) => {
        const y = 22 + i * 16;
        const w = Math.abs(r.push) * half;
        return (
          <g key={r.name}>
            <text x={8} y={y + 6} fontSize={8} fill="#ededed" fontFamily={SANS}>
              {r.name}
            </text>
            <rect x={r.push < 0 ? mid - w : mid} y={y} width={w} height={6} rx={3} fill={r.push < 0 ? WARM : SILVER} />
          </g>
        );
      })}
    </Figure>
  );
};

/* The figures that matter, lit: white mono for a number, the beam's silver for the hold odds */
const Num = ({ children, silver = false }: { children: ReactNode; silver?: boolean }) => (
  <span className="font-mono tnum font-semibold text-textPrimary" style={silver ? { color: SILVER } : undefined}>
    {children}
  </span>
);
const pct = (v: number) => `${Math.round(v * 100)}%`;

export const WallGuide = ({ board, clock }: { board: WallBoard; clock: AheadClock }) => {
  const w = board.focus;
  const who = w.role ? `the ${w.role} at` : '';
  const weakest = board.walls.find(x => x.strike === board.weakest);
  const strongest = board.walls.find(x => x.strike === board.strongest);
  const flow = (v: number) =>
    v !== 0 ? (
      <>
        , <Num>{fmtDollars(v)}</Num> of forced dealer {v > 0 ? 'buying' : 'selling'} on the way
      </>
    ) : null;
  return (
    <div data-wall-guide>
      <Section title="Two questions, not one">
        <p>First, does price get there {clock.inSession ? 'by the close' : 'next session'}: ten dots, and the count that are lit. Then, if it does, does the wall hold. Both are said as a count out of ten with the percent beside it.</p>
      </Section>
      <Section title="The two zones">
        <p>
          The line is today's price. Ahead of now are two boxes on the wall's own price: <span style={{ color: WARM }}>warm if it breaks</span>, reaching to where a break runs, and <span style={{ color: SILVER }}>silver if it holds</span>, reaching back to where a hold sends price. Each box is as tall as the distance price travels. A dot on the line is a test of the wall today, silver where it held and warm where it broke. The wall is drawn from its first test, or from now if it has not been tested.
        </p>
        <ZonesFigure />
      </Section>
      <Section title="Why">
        <p>Seven measured facts about the wall, each as a bar from a middle line: left when it pushes toward a break, right when it pushes toward a hold, the strongest break at the top. The fact itself is beside the bar. They add up to the odds; nothing else does. The clock's pull is charm and the vol drop's is vanna.</p>
        <TugFigure />
      </Section>
      <Section title="Every wall">
        <p>The stack under them is every wall on the strikes shown, the highest first, with price between. Two short bars each: the odds price gets there, and the odds it holds. Click a wall and the top of the box follows it.</p>
      </Section>
      <Section title="Where the odds come from">
        <p>
          The hedging at the wall, in dollars per 1% move, against the <Num>{fmtDollars(board.marketPer1Pct)}</Num> it takes to move this name 1% today; the tests, the build, the expiry, the speed and the prints on top. Model odds — real history will tune the constants.
        </p>
      </Section>
      <Section title="Today">
        {w.weight > 0 ? (
          <p>
            {who ? `${who[0].toUpperCase()}${who.slice(1)} ` : ''}
            <Num>{fmtStrike(w.strike)}</Num> is reached {clock.inSession ? 'by the close' : 'by the next close'} <Num>{pct(w.reach)}</Num> of the time and holds <Num silver>{pct(w.hold)}</Num> when it is.
            {w.breakPath.to != null ? (
              <>
                {' '}
                A break {w.side === 'call' ? 'above' : 'below'} runs to <Num>{fmtStrike(w.breakPath.to)}</Num>
                {w.breakPath.pocket ? ' with almost nothing in between' : ''}
                {flow(w.breakPath.flow)}.
              </>
            ) : (
              <> A break {w.side === 'call' ? 'above' : 'below'} has no shelf behind it on the strikes shown.</>
            )}
            {w.holdPath.to != null && (
              <>
                {' '}
                A hold sends price back toward <Num>{fmtStrike(w.holdPath.to)}</Num>
                {flow(w.holdPath.flow)}.
              </>
            )}
          </p>
        ) : (
          <p>
            <Num>{fmtStrike(w.strike)}</Num> is not a wall: the hedging there pushes moves along rather than back.
          </p>
        )}
        {weakest && strongest && weakest.strike !== strongest.strike && (
          <p className="mt-1 text-textMuted">
            The weakest wall in reach is <Num>{fmtStrike(weakest.strike)}</Num>
            {weakest.role ? `, the ${weakest.role}` : ''}, holding <Num silver>{pct(weakest.hold)}</Num>; the strongest is <Num>{fmtStrike(strongest.strike)}</Num>
            {strongest.role ? `, the ${strongest.role}` : ''} at <Num silver>{pct(strongest.hold)}</Num>.
          </p>
        )}
      </Section>
    </div>
  );
};

export default WallGuide;
