/*
==================================================
  SLAYER TERMINAL - PINPOINT, ON ITS OWN PAGE
  (pages/landing/products/PinpointPage.tsx)

  The product page for the book (Noah, 2026-10-02:
  "now do the same for pinpoint"). Seven pages in
  the terminal, one page here: the Map (the matrix,
  the calendar, the trader's clock, how the levels
  held), Ahead (the range, where it closes),
  Building (what's being built, where the walls are
  heading), At the wall, Targets (and where they
  sit), the Board, Compare (head to head, one ruler,
  since the open, the pair). ONE recording — the
  tour's own film of the Map. Every picture is the
  real page (scripts/make-product-shots.mjs,
  `pinpoint`).

  THE WORDS ARE PINPOINT'S OWN RULE (2026-09-05:
  not a buzzword on it): the options words a
  reader must know stay — gamma, the walls, the
  flip, the supreme, open interest — and every
  figure says what it is made of. Never a sigma;
  never a grade of ours.
==================================================
*/

import { useGround } from '../ground';
import { Eyebrow } from '../pieces';
import TerminalWindow from '../TerminalWindow';
import ProductPage, { Aside, Head, Pair, Picture, Room } from './ProductPage';

const SHOTS = '/landing/products/pinpoint';

/** the recording's three lines — what the Map's film shows */
const MAP_FILM: { word: string; says: string }[] = [
  { word: 'The rows', says: 'Run the pointer down the strikes and each row lights with its card: the calls, the puts and the net at that strike, and what it is doing to price.' },
  { word: 'The view', says: 'Turn the box from the matrix to the calendar and back. Same book, same strikes — one view by Greek, the other by expiry.' },
  { word: 'The cells', says: 'Every cell is a figure you can check: dollars of hedging per 1% move, in the chain’s own units at the live price.' },
];

const PinpointPage = () => (
  <ProductPage
    name="Pinpoint"
    glyph="pinpoint"
    group="The book"
    head={['The dealer book, strike by strike.', 'Where the hedging sits and what it does to price.']}
    intro={
      <>
        Every option a dealer sells, they hedge with stock, and that hedging is a force on price: it holds price at some strikes and pushes it away from others. Pinpoint reads that book for a name. The Map shows it by strike
        and by expiry. Ahead says where price is likely to stay until the close and where it is likely to finish. Building says what today added. At the wall says whether a wall holds when price gets there. Targets puts the
        strikes in the order they matter today, the Board does it across every name, and Compare puts two names side by side. All of it in plain words, with the dollars behind every figure.
      </>
    }
    path="/pinpoint/map"
    plan="It is in every plan."
  >
    {/* ── THE MAP ── */}
    <Room eyebrow="The Map" first="The book by strike and expiry." second="Shown as a matrix or as a calendar." pictures={<Pair items={[
      { src: `${SHOTS}/map-matrix`, ratio: '1800 / 1178', name: 'The matrix', says: 'Every strike as a row; the Greeks as columns — GEX, DEX, VEX, vanna and charm, each as calls, puts and the net. The colour is the size of the hedging, the band marks the walls, and the row at spot is the one the day turns on.' },
      { src: `${SHOTS}/map-calendar`, ratio: '1800 / 1178', name: 'The calendar', says: 'The same strikes, with the expiries as columns: how much of the hedging at each strike expires today, this week, next month. Pick a Greek, a window of expiries and how many strikes each side.' },
    ]} />}>
      <p>
        The Map opens on the matrix: every strike around spot, with the dealers’ hedging at each one broken out by Greek and by side. Hover a row and its card says what that strike is doing — a call wall caps a rally, a put wall
        cushions a drop, the flip is where hedging changes from damping moves to amplifying them, the supreme is the single heaviest strike. Turn the box to the calendar and the same strikes are laid out by expiry, so you can see
        what comes off the book at today’s close and what stays.
      </p>
    </Room>

    {/* ── THE ONE RECORDING ── */}
    <MapFilm />

    <Room eyebrow="Still the Map" first="The day on a clock." second="With how each level has held so far." pictures={<Pair items={[
      { src: `${SHOTS}/map-clock`, ratio: '1800 / 262', name: 'The trader’s clock', says: 'The session as a strip of half hours, with what dealers must buy or sell of stock in each one to stay hedged as the day’s options lose their delta — and what that does to price: a headwind on a rally, a tailwind under a drop.' },
      { src: `${SHOTS}/map-report`, ratio: '1800 / 683', name: 'How the levels held today', says: 'Each level — the call wall, the put wall, the flip, the supreme — with the times price tested it today, whether it held or broke, how far price got through it, and what that says about the level now.' },
    ]} />}>
      <p>Under the matrix, two boxes read the same book against the clock: what the hedging will force in each half hour that is left, and how the levels have actually behaved so far today.</p>
    </Room>

    {/* ── AHEAD ── */}
    <Room eyebrow="Ahead" first="The range to the close." second="And where the day is likely to finish." pictures={<Pair items={[
      { src: `${SHOTS}/ahead-range`, ratio: '1800 / 457', name: 'The range', says: 'The half hours left in the session, each with the range price is likely to hold in it, bent by the walls on either side. The half hours already gone show what price actually traded between.' },
      { src: `${SHOTS}/ahead-close`, ratio: '1800 / 852', name: 'Where it closes', says: 'The odds for the 4:00 print as a shape on the price axis: the bands it most often lands inside, the strike it pins to, and the odds it closes above or below the levels that matter. It moves with the clock.' },
    ]} />}>
      <p>
        The Map says where the hedging sits now. Ahead says what that means for the rest of the day: the range price is likely to stay inside, half hour by half hour, and where the close is likely to land. Both come from the
        same book — the walls narrow the range, the expiring options pull the close toward the strikes with the most open interest.
      </p>
    </Room>

    {/* ── BUILDING ── */}
    <Room eyebrow="Building" first="What today added to the book." second="A wall shows here a day early." pictures={<Pair items={[
      { src: `${SHOTS}/building`, ratio: '1800 / 1117', name: 'What’s being built', says: 'Every strike: the hedging there now, what today added or took off in calls and in puts, the day’s shape as a small line, and a word for it — building, draining, steady — with what that means for price.' },
      { src: `${SHOTS}/building-heading`, ratio: '1800 / 521', name: 'Where the walls are heading', says: 'The four levels where they opened, where they are now, and where they will be by the close at today’s pace — with the strike growing fastest on each side.' },
    ]} />}>
      <p>
        Open interest is yesterday’s; the hedging that matters tomorrow is being put on today. Building reads today’s flow at every strike, so you can see a wall forming before it is the wall, and a wall draining before it
        breaks.
      </p>
    </Room>

    {/* ── AT THE WALL ── */}
    <Aside eyebrow="At the wall" first="Whether the wall holds." second="And what happens either way." picture={<Picture src={`${SHOTS}/wall`} alt="At the wall: today's price with two zones on it, the odds the wall is reached by the close as ten pips, the reasons as a tug of war, and every wall as a stack" ratio="1800 / 1048" />}>
      <p>
        One box for the question every level raises. The odds price gets to the nearest wall by the close, as ten pips — seven in ten, say. Today’s price with two zones on it: where the wall holds and sends price back, and
        where it breaks. The reasons for each pulled against each other: how heavy the hedging is, how much of it expires today, how many times the level has been tested, the market’s speed. Then every wall as a stack, with
        price between them; press one and the top of the box reads that wall instead.
      </p>
    </Aside>

    {/* ── TARGETS ── */}
    <Room eyebrow="Targets" first="Every strike in the order it matters." second="With where each one sits on price." pictures={<Pair items={[
      { src: `${SHOTS}/targets`, ratio: '1800 / 1032', name: 'Targets', says: 'The first three side by side, the rest as a list. Each strike with why it ranks — how likely price gets there times how much happens if it does — what it does to price, and two actions: flash it on the chart, set an alert on it.' },
      { src: `${SHOTS}/targets-axis`, ratio: '1800 / 431', name: 'Where they sit', says: 'The same strikes on the price axis, with the expected move as the ruler, so the distance to each one reads at a glance.' },
    ]} />}>
      <p>So what do I watch today, and in what order? Targets answers that with everything the other pages produce: the reach and the holds from At the wall, built or drained from Building, closes-here from Ahead, the roles from the Map.</p>
    </Room>

    {/* ── THE BOARD ── */}
    <Aside eyebrow="The Board" first="Every name on one page." second="The Map’s reads for every name you follow." flip picture={<Picture src={`${SHOTS}/board`} alt="The Board: every name as a row — which way dealers are hedging, the flip, the nearest wall, the supreme, what expires today, the session's line" ratio="1440 / 1000" />}>
      <p>
        The reads the Map makes for one name, made for all of them: which way dealers are hedging today, the flip, the nearest wall and how far it is, the supreme, how much of the book expires today, your positions on the name,
        and the session as a small line. Sort by any column, add or take away names, and press a row to make the Map that name.
      </p>
    </Aside>

    {/* ── COMPARE ── */}
    <Room eyebrow="Compare" first="Two names side by side." second="On one table and one ruler." pictures={<Pair items={[
      { src: `${SHOTS}/compare-head`, ratio: '1800 / 720', name: 'Head to head', says: 'The same ten reads for both names on one table: the flip, the walls, the supreme, what expires today, the expected move to the close, the lead in bold and the verdict last — what they say against each other.' },
      { src: `${SHOTS}/compare-ruler`, ratio: '1800 / 953', name: 'The two books on one ruler', says: 'Both books at their distance from their own spot, one growing left and the other right, with the walls as ticks and a spine of strikes — so a wall 1% away on one name sits beside a wall 1% away on the other.' },
      { src: `${SHOTS}/compare-open`, ratio: '1800 / 553', name: 'Since the open', says: 'Today’s session for both, as percent from each one’s own open, with the gap between them under it.' },
      { src: `${SHOTS}/compare-pair`, ratio: '1800 / 558', name: 'The pair', says: 'One share of the first name in shares of the second, day by day, with its usual range as a band: whether today sits inside it, and how far from its middle — said as a distance a person can picture, never a sigma.' },
    ]} />}>
      <p>Pick any two — a name and its index, two names in a sector, a stock and its competitor — and every read is made for both at once, in the same order, so the difference is the thing you see first.</p>
    </Room>
  </ProductPage>
);

/** THE RECORDING: the Map in use — the tour's own film, with three lines under it */
const MapFilm = () => {
  const { a } = useGround();
  return (
    <div data-product-film="pinpoint-map">
      <div className="max-w-[72ch]">
        <Eyebrow>In use</Eyebrow>
        <Head className="mt-5" first="The strikes, then the calendar." second="You read the strikes, then turn to the calendar." />
      </div>
      <TerminalWindow path="/pinpoint/map" theme={a} desk natural className="mt-8" />
      <ul className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-5 border-t border-borderSubtle">
        {MAP_FILM.map(l => (
          <li key={l.word} className="pt-4 max-w-[40ch]">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-textMuted">{l.word}</p>
            <p className="mt-2 text-[14.5px] leading-relaxed text-textSecondary">{l.says}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PinpointPage;
