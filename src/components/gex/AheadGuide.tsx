/*
==================================================
  SLAYER TERMINAL - HOW TO READ THE DAY AHEAD
  (components/gex/AheadGuide.tsx)

  The two guides for the Ahead page, in the house
  pattern (a focus-and-blur card over the surface;
  plain words; figures drawn in the surface's own
  grammar; "Today, in words" from the figures on
  screen). One for the corridor and its flow lane,
  one for the odds. Every figure keeps its text
  inside its own box — the ledger's guide taught
  that.
==================================================
*/

import type { ReactNode } from 'react';
import { CALL_WALL, PUT_WALL, FLIP, SUPREME } from './paletteInk';
import { fmtDollars, fmtPrice, fmtStrike, hhmm, type AheadClock, type CloseOdds, type Corridor, type Schedule } from '../../data/ahead';
import type { ExposureLevels } from '../../types/gex';

const SILVER = 'rgb(var(--silver))'; /* the silver token — deep steel on the light terminal (2026-09-12) */
const MONO = 'ui-monospace, Menlo, monospace';
const SANS = 'ui-sans-serif, system-ui, sans-serif';

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="px-5 py-4 border-b border-borderSubtle/60 last:border-b-0">
    <h4 className="text-[13px] font-semibold text-textPrimary">{title}</h4>
    <div className="mt-2 text-[12px] leading-relaxed text-textSecondary">{children}</div>
  </section>
);

const Figure = ({ children, label }: { children: ReactNode; label: string }) => (
  <figure data-theme="dark" className="mt-3 rounded-md border border-borderSubtle/60 bg-panel p-2">
    <svg viewBox="0 0 420 150" width="100%" role="img" aria-label={label} data-guide-figure>
      {children}
    </svg>
  </figure>
);

/* ---- the range ------------------------------------------------------------------- */

/** The timetable (2026-09-30): a row a half hour, the bar how far price can get by then, stopped at a wall; the floor, the lid and price as three lines down the rows; what dealers trade beside each */
const TimetableFigure = () => {
  const laneL = 62;
  const laneR = 296;
  const px = (f: number) => laneL + f * (laneR - laneL);
  const floor = 0.18;
  const lid = 0.74;
  const spot = 0.58;
  const rows = [
    { by: '13:30', a: 0.44, b: 0.72, flow: 0.3 },
    { by: '14:00', a: 0.36, b: 0.74, flow: 0.36 },
    { by: '14:30', a: 0.29, b: 0.74, flow: 0.44 },
    { by: '15:00', a: 0.23, b: 0.74, flow: 0.58 },
    { by: '15:30', a: 0.18, b: 0.74, flow: 0.74 },
    { by: 'The close', a: 0.18, b: 0.74, flow: 1 },
  ];
  const top = 34;
  const rh = 17;
  const bottom = top + rows.length * rh;
  return (
    <Figure label="A row for every half hour: the bar is how far price can get by then and stops at a wall; the red line is the floor, the green line the lid, the dotted line price now; the bars at the right are the stock dealers must sell in that half hour">
      <text x={px(floor) - 4} y={14} textAnchor="end" fontSize={8} fontWeight={600} fill={PUT_WALL} fontFamily={MONO}>
        109 floor
      </text>
      <text x={px(lid) + 4} y={14} fontSize={8} fontWeight={600} fill={CALL_WALL} fontFamily={MONO}>
        111 lid
      </text>
      <text x={px(spot)} y={27} textAnchor="middle" fontSize={8} fontWeight={600} fill="#ededed" fontFamily={MONO}>
        110.40
      </text>
      <text x={318} y={27} fontSize={6.5} fill="#8a909c" fontFamily={SANS} letterSpacing={0.8}>
        DEALERS MUST SELL
      </text>
      <line x1={px(floor)} x2={px(floor)} y1={top - 2} y2={bottom} stroke={PUT_WALL} strokeOpacity={0.6} />
      <line x1={px(lid)} x2={px(lid)} y1={top - 2} y2={bottom} stroke={CALL_WALL} strokeOpacity={0.6} />
      <line x1={px(spot)} x2={px(spot)} y1={top - 2} y2={bottom} stroke="#ededed" strokeOpacity={0.6} strokeDasharray="1 3" />
      {rows.map((r, i) => {
        const y = top + i * rh;
        const last = i === rows.length - 1;
        return (
          <g key={r.by}>
            <text x={8} y={y + 11} fontSize={8} fontWeight={600} fill={last ? SILVER : '#ededed'} fontFamily={MONO}>
              {r.by}
            </text>
            <rect x={px(r.a)} y={y + 4} width={px(r.b) - px(r.a)} height={8} rx={4} fill={SILVER} fillOpacity={last ? 0.9 : 0.32} />
            <rect x={318} y={y + 6} width={r.flow * 56} height={4} rx={2} fill={PUT_WALL} fillOpacity={0.8} />
          </g>
        );
      })}
      <text x={8} y={bottom + 10} fontSize={7.5} fill="#8a909c" fontFamily={SANS}>
        the bar reaches the lid first, the floor at 15:30
      </text>
    </Figure>
  );
};

export const CorridorGuide = ({ corridor, schedule, levels, clock }: { corridor: Corridor; schedule: Schedule; levels: ExposureLevels; clock: AheadClock }) => (
  <div data-corridor-guide>
    <Section title="A row for every half hour">
      <p>Read it down, like a schedule. Each row is a half hour between now and the close, and its bar is how far price can get by the end of it: one expected move for the minutes gone, taken from what today's options cost. The bars grow as the day goes on, and the last row is the answer for the close.</p>
      <TimetableFigure />
    </Section>
    <Section title="The three lines">
      <p>The floor and the lid are where price is likely to stay. When a wall sits inside the expected move's reach it becomes the edge, the put wall the floor and the call wall the lid, and a bar stops when it gets there. The row where a bar first touches a line is when that edge comes into reach. The dotted line is price now. A faint dashed line is the flip: moves run on one side of it and slow on the other.</p>
    </Section>
    <Section title="What dealers must trade">
      <p>Dealers hold stock against today's options. As those options lose their delta through the day, that stock has to go, whatever the news. The bar beside each row is the stock they must sell (red) or buy (green) in that half hour to stay hedged. Forced selling is a headwind for a rally; forced buying is a cushion under a dip.</p>
    </Section>
    <Section title="If vol moves">
      <p>Their hedges also re-price when implied vol moves with price unchanged. The If vol card sets a move, and the line under the table says what stock it makes dealers buy or sell across every expiry, and where the walls go under it.</p>
    </Section>
    <Section title="Today">
      <p>{corridor.sentence}</p>
      <p className="mt-1">{schedule.sentence}</p>
      <p className="mt-1 text-textMuted">
        Expected move ±{fmtPrice(corridor.sigma)} {clock.inSession ? 'to the close' : 'for a session'} · call wall {fmtStrike(levels.callWall)} · put wall {fmtStrike(levels.putWall)} · flip {fmtStrike(levels.flip)}
        {schedule.biggest ? ` · biggest half hour ${hhmm(schedule.biggest.from)}–${hhmm(schedule.biggest.to)}, ${fmtDollars(schedule.biggest.flow)}` : ''}
      </p>
    </Section>
  </div>
);

/* ---- where it closes ---------------------------------------------------------------- */

/** The rows (2026-09-13 evening): a row per strike, the bar the chance, the three likeliest numbered in silver — the bar's ink the rank alone — the role a tag beside the strike, the runs as washes, spot as the rule */
const RowsFigure = () => {
  const rows: { k: string; odds: number; plain: number; n: number | null; role: string | null; ink: string | null; run: 'half' | 'most' | null; pct: string; spotAfter?: boolean }[] = [
    { k: '501', odds: 0.66, plain: 0.72, n: null, role: null, ink: null, run: 'most', pct: '6.6%' },
    { k: '500', odds: 0.82, plain: 0.86, n: null, role: 'supreme', ink: SUPREME, run: 'half', pct: '8.2%' },
    { k: '499', odds: 0.9, plain: 0.96, n: 3, role: null, ink: null, run: 'half', pct: '8.3%' },
    { k: '498', odds: 1, plain: 1, n: 1, role: null, ink: null, run: 'half', pct: '9.3%', spotAfter: true },
    { k: '497', odds: 0.88, plain: 0.98, n: null, role: null, ink: null, run: 'half', pct: '8.2%' },
    { k: '495', odds: 0.84, plain: 0.62, n: 2, role: 'put wall', ink: PUT_WALL, run: 'half', pct: '8.4%' },
    { k: '494', odds: 0.6, plain: 0.52, n: null, role: null, ink: null, run: 'most', pct: '6.1%' },
  ];
  const barX = 100;
  const span = 240;
  let y = 10;
  return (
    <Figure label="A row per strike: the strike with its role tag, a bar as long as the chance the close lands there, the three likeliest numbered on silver bars, the odds at the right, the 50% and 80% runs shaded across the rows, spot as the rule between the strikes">
      {rows.map(r => {
        const ry = y;
        y += 15;
        const spotY = r.spotAfter ? ry + 15 : null;
        if (r.spotAfter) y += 10;
        return (
          <g key={r.k}>
            {r.run && <rect x={6} y={ry - 1} width={408} height={14} rx={2} fill={SILVER} fillOpacity={r.run === 'half' ? 0.08 : 0.035} />}
            <text x={14} y={ry + 9} fontSize={8.5} fontWeight={700} fill="#ededed" fontFamily={MONO}>
              {r.k}
            </text>
            {r.role && (
              <text x={40} y={ry + 9} fontSize={6.5} fontWeight={700} fill={r.ink ?? '#8a909c'} fontFamily={SANS} letterSpacing={0.6}>
                {r.role.toUpperCase()}
              </text>
            )}
            <rect x={barX} y={ry + 2} width={r.odds * span} height={8} rx={4} fill={r.n ? SILVER : '#ededed'} fillOpacity={r.n === 1 ? 1 : r.n ? 0.5 : 0.22} />
            <line x1={barX + r.plain * span} x2={barX + r.plain * span} y1={ry} y2={ry + 12} stroke="#ededed" strokeOpacity={0.5} />
            {r.n && (
              <>
                <rect x={barX + 3} y={ry + 1.5} width={14} height={9} rx={2} fill={SILVER} />
                <text x={barX + 10} y={ry + 8.5} textAnchor="middle" fontSize={6.5} fontWeight={700} fill="#0a0a0a" fontFamily={MONO}>
                  #{r.n}
                </text>
              </>
            )}
            <text x={406} y={ry + 9} textAnchor="end" fontSize={8.5} fontWeight={600} fill="#ededed" fontFamily={MONO}>
              {r.pct}
            </text>
            {spotY != null && (
              <g>
                <line x1={14} x2={406} y1={spotY + 4} y2={spotY + 4} stroke="#ededed" strokeOpacity={0.3} />
                <text x={56} y={spotY + 7} textAnchor="end" fontSize={6.5} fill="#8a909c" fontFamily={MONO} letterSpacing={0.8}>
                  SPY
                </text>
                <rect x={60} y={spotY - 1} width={36} height={10} rx={2} fill="#ededed" />
                <text x={78} y={spotY + 6.5} textAnchor="middle" fontSize={6.5} fontWeight={700} fill="#0a0a0a" fontFamily={MONO}>
                  497.33
                </text>
              </g>
            )}
          </g>
        );
      })}
      <text x={210} y={143} textAnchor="middle" fontSize={9} fill="#8a909c" fontFamily={SANS}>
        a row per strike, its bar the chance · silver says the rank, the tag the role
      </text>
    </Figure>
  );
};

/** The same bars at three times of day: they narrow and the wall's bar grows as the close nears */
const PullFigure = () => (
  <Figure label="The same odds at three times of day: the bars narrow around the wall and its own bar grows as the close nears">
    {[
      { x: 30, t: '10:00', pull: 0.3, label: 'light' },
      { x: 160, t: '13:00', pull: 0.6, label: 'building' },
      { x: 290, t: '15:30', pull: 0.92, label: 'strong' },
    ].map(p => {
      const ys = [34, 50, 66, 82, 98, 114];
      const base = [0.15, 0.45, 0.85, 1, 0.6, 0.2];
      const vals = base.map((v, i) => (i === 3 ? v * (0.7 + p.pull * 0.6) : v * (1 - p.pull * 0.45)));
      return (
        <g key={p.t}>
          <text x={p.x + 50} y={22} textAnchor="middle" fontSize={9} fill="#ededed" fontFamily={MONO}>
            {p.t}
          </text>
          <line x1={p.x} x2={p.x} y1={ys[0] - 8} y2={ys[ys.length - 1] + 8} stroke="#ffffff" strokeOpacity={0.15} />
          {ys.map((y, i) => (
            <rect key={y} x={p.x + 2} y={y - 5} width={vals[i] * 80} height={10} fill={SILVER} fillOpacity={i === 3 ? 0.9 : 0.26} />
          ))}
          <line x1={p.x} x2={p.x + 100} y1={ys[3]} y2={ys[3]} stroke={PUT_WALL} strokeOpacity={0.6} strokeDasharray="3 4" />
          <text x={p.x + 50} y={136} textAnchor="middle" fontSize={9} fill="#8a909c" fontFamily={SANS}>
            pull {p.label}
          </text>
        </g>
      );
    })}
  </Figure>
);

export const CloseGuide = ({ odds, spot, clock }: { odds: CloseOdds; spot: number; clock: AheadClock }) => (
  <div data-close-guide>
    <Section title="The rows">
      <p>Start with the expected move: the close is most likely near spot, less likely further out. Then the strikes pull it: the ones that hold price pull the close toward them, the ones that move price push it away. Each strike is a row — its bar the chance the 4:00 print lands there, the odds at the right. The three likeliest are numbered and their bars are silver: the bar's ink says the rank alone, and the role — call wall, put wall, supreme, pin — is the small tag beside the strike. The thin tick on every bar is what the expected move alone would give it. Hover a row and the read line says what the strikes did to it; click keeps it.</p>
      <RowsFigure />
    </Section>
    <Section title="The runs">
      <p>Two runs of strikes around the likeliest, shaded across the rows: there is a 50% chance the close lands inside the brighter run and an 80% chance inside the fainter one. Read them against the range above — the range is where price can go by the close, the runs are where on that scale it most often ends.</p>
    </Section>
    <Section title="The slices">
      <p>The last read under the rows answers what a trade asks: the chance the close lands above the call wall, between the walls, below the put wall and above the flip — and, for a wall on the far side of spot, the chance price touches it before the close, about twice the chance of ending beyond it. A strike you keep joins the line.</p>
    </Section>
    <Section title="The pull grows">
      <p>Early on the whole range is in play and the bars spread wide. As the minutes run out they narrow, and the heavy strikes take over.</p>
      <PullFigure />
    </Section>
    <Section title="Today">
      <p>{odds.sentence}</p>
      <p className="mt-1 text-textMuted">
        Spot {fmtPrice(spot)} · curve ±{fmtPrice(odds.sigma)} {clock.inSession ? 'for the time left' : 'for a session'} · pull {Math.round(odds.gravity * 100)}%
      </p>
    </Section>
  </div>
);
