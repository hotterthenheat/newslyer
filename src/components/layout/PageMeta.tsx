/*
==================================================
  SLAYER TERMINAL - EVERY PAGE'S TITLE AND DESCRIPTION
  (components/layout/PageMeta.tsx)

  Until 2026-09-19 the whole site had ONE title and
  one description — index.html's — so forty pages sat
  in a browser's tabs, its history and a search result
  under the same name. Mounted once, beside the routes,
  this gives each page its own:

    the tab       "Map · Pinpoint · Slayer Terminal" —
                  the page first, because a tab shows
                  its first dozen letters
    the search    a sentence about THAT page

  WHERE THE WORDS COME FROM. A section's pages already
  carry a plain-English subtitle under their heading
  (pinpoint · trace · record subnav.ts) — that IS the
  description, read from the same list, so the page and
  its description cannot disagree. The top-level pages
  are written here, under the house rules: plain
  English, no buzzwords, and the brand never calls
  itself an options terminal (it is market-wide).

  A link preview (X, iMessage, Slack) does not run the
  app — it reads index.html, whose tags are the
  landing's. This component keeps the Open Graph pair
  in step anyway, for the readers that do.

  An address the app does not know gets the site's own
  name and no page name — the 404 page will take that.

  A PAGE WITH WORDS OF ITS OWN (2026-09-26 — Noah, of a
  tab reading "SMUAF0FPB3X · Backtest": "what does that
  say"): an id in an address is never a title. A page
  built round one thing — a backtest session, a trade in
  the journal — says that thing's name here (`SayPage`),
  and the tab reads "SPY from Jun 29 · Backtest". Until it
  does, the parent page's own name stands; only a segment
  that looks like a ticker (NVDA, BRK.B) under a page
  built round a name (a stock's, an earnings page) is
  read as one — /practice/backtest/abc123 read as a
  ticker, "ABC123" (the audit's R5, 2026-10-09).

  ONE ADDRESS, HOWEVER IT IS TYPED (2026-10-09, the
  audit's R3): the router opens /About and /STATUS/ as
  /about and /status, so the lookup reads the address in
  lower case without its trailing slash. And every page
  says its own address to a reader that asks (og:url and
  the canonical link), on the site's own domain.
==================================================
*/

import { useEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { GEX_SUBPAGES } from '../../pages/pinpoint/subnav';
import { TRACE_SUBPAGES } from '../../pages/trace/subnav';
import { RECORD_SUBPAGES } from '../../pages/record/subnav';
import { PRACTICE_SUBPAGES } from '../../pages/practice/subnav';
import { COMPANY } from '../../data/company';

const SITE = 'Slayer Terminal';
const LANDING = {
  title: `${SITE} — Trade what you can see`,
  description: 'Most of what moves a price is public, just scattered. Slayer gathers it into one terminal: the prints, the positions, the levels, the filings.',
};

interface Meta {
  title: string;
  description: string;
}

const page = (name: string, description: string, section?: string): Meta => ({ title: `${[name, section].filter(Boolean).join(' · ')} · ${SITE}`, description });

/* the pages that stand alone */
const TOP: Record<string, Meta> = {
  '/pulse': page('Pulse', 'Your own desk of live panels: the chart, the hedging at every strike and the book across the calendar, arranged your way and kept as you left it.'),
  '/pulse/board': page('Four charts', 'Four names at once, each with its own timeframe and overlays.', 'Pulse'),
  '/terrain': page('Terrain', 'Charts and nothing in the way: one to four side by side on one set of controls, with drawing tools, your own scripts and the book beside the chart.'),
  '/compass': page('Compass', 'Contracts that fit the levels right now. Each one carries a live state: active while the structure holds, watch while it forms, fading when it breaks.'),
  '/compass/tracker': page('Tracker', 'The setups you kept, followed to the close.', 'Compass'),
  '/weigher': page('Weigher', 'Weigh any contract before you take it: the chart, the chain and your watchlist on one desk, and what a position would return at every price.'),
  '/community': page('Community', 'The traders’ room. Coming soon.'),
  '/glossary': page('Glossary', 'Every word the terminal uses — what it means, and whether it is observed, calculated or modeled.'),
  /* the site's own pages (the revamp line): the products' pages, the start page, the sign-in, the checkout, the legal pages */
  '/products/pulse': page('Pulse', 'The live desk: tiles — the chart, the book, key levels, the wire — that you add, drag and size, on a desk that saves as you go.', 'Products'),
  '/products/practice': page('Practice', 'Three rooms on one feed: paper trading on today’s prices, a backtest that replays a past day a minute at a time, and the journal every closed trade lands in.', 'Products'),
  '/products/paper': page('Paper Trade','The live desk with nothing at stake: a practice account or a prop firm’s evaluation, options off the chain and futures long or short, on today’s prices.', 'Products'),
  '/products/backtest': page('Backtest', 'A past session replayed a minute at a time and traded with pretend money — options off the chain as it stood, or futures — with your own rules and a report at the end.', 'Products'),
  '/products/journal': page('Journal', 'Every closed trade on its day, with the period’s figures beside the month, and a page of its own for each trade: the chart, the shape of it, your tags and your words.', 'Products'),
  '/products/terrain': page('Terrain', 'The chart page: one to four charts side by side on one set of controls, the dealer book beside any of them as a strike rail, the key levels on the candles with one switch, drawing tools, your own Pine scripts, and replay a bar at a time.', 'Products'),
  '/products/compass': page('Compass', 'The contracts that fit today’s levels, 0DTE to long-dated: a board of cards with their state and the move each needs, a page for every setup with the chart, the case and the contracts around it, and a Tracker that keeps the ones you follow.', 'Products'),
  '/products/weigher': page('Weigher', 'One desk for the contracts you care about: the chart, the chain with the book at every strike, your positions and your watchlist, and a card that says what a contract returns at every price and every date.', 'Products'),
  '/products/trace': page('Trace', 'The options tape and every way to read it: the live prints with the dark pool beside them, which way each name’s money leans, what was built overnight, the quarter hour it happened in, the spreads, two names side by side.', 'Products'),
  '/products/pinpoint': page('Pinpoint', 'Where dealer hedging sits and what it does to price: the book by strike and expiry, the range to the close, what today added, whether a wall holds, the strikes in the order they matter, every name on one board, two names side by side.', 'Products'),
  '/products/dossier': page('Dossier', 'What is on the record for any name: the news wire with the numbers behind each headline, the earnings calendar, insiders, Congress, and a screen that scores every name.', 'Products'),
  '/start': page('Start', 'Every page of the terminal, one picture and one line each: pick where to begin.'),
  '/signin': page('Sign in', 'Sign in to Slayer Terminal, or create your account.'),
  '/checkout': page('Checkout', 'On your way to Stripe’s checkout for the plan you chose.'),
  '/terms': page('Terms of Service', 'The agreement between you and Slayer Terminal for the site and the terminal, each section said in plain words first.'),
  '/privacy': page('Privacy Policy', 'What Slayer Terminal keeps about you, where it lives, what it is for, and how to take it with you or have it deleted.'),
};
/* the legal documents and the settings' sections that exist — any other is a page that is not there (App.tsx) */
const NOT_FOUND: Meta = { title: `Page not found · ${SITE}`, description: LANDING.description };

/** A name read off a handle ("zak" → "Zak"), as the invite page reads it (pages/outside/Invite.tsx inviterOf): only a
    plain one, of 24 letters at most */
const handleName = (handle: string): string | null => {
  const clean = handle.replace(/[^a-z0-9._]/gi, '');
  return clean && clean === handle && clean.length <= 24 && /[a-z]/i.test(clean) ? clean.charAt(0).toUpperCase() + clean.slice(1) : null;
};

/* each is the line the section itself wears under its heading (pages/settings/Settings.tsx) */
const SETTINGS: Record<string, string> = {
  account: 'Who you are to the terminal: your picture, your name and how you sign in.',
  billing: 'Your plan and the card behind it. The card lives with Stripe, never here.',
  data: 'What is yours on this machine (the board, the marks, the alerts, the desks, these settings) and where the feed stands.',
  people: 'Who has an account, on which plan, and what an owner changed — the owners\u2019 room.',
  appearance: 'The terminal drawn in each theme: dark, light, or whatever your machine is set to.',
  desk: 'What every desk reads by: the ruler, the name and timeframe it opens on, and the clock.',
  sounds: 'The four sounds: an alert, a confirmation, signing in, the open and the close. Each on its own switch.',
  keyboard: 'Every key the terminal answers to, by where it works.',
  about: 'The terminal and its version.',
};
const SETTINGS_NAME: Record<string, string> = { account: 'Account', billing: 'Billing', data: 'Data', people: 'People', appearance: 'Appearance', desk: 'The desk', sounds: 'Sounds', keyboard: 'Keyboard', about: 'About' };

const SECTIONS: { base: string; name: string; pages: { path: string; label: string; subtitle: string }[] }[] = [
  { base: '/pinpoint', name: 'Pinpoint', pages: GEX_SUBPAGES },
  { base: '/trace', name: 'Trace', pages: TRACE_SUBPAGES },
  { base: '/dossier', name: 'Dossier', pages: RECORD_SUBPAGES },
  { base: '/practice', name: 'Practice', pages: PRACTICE_SUBPAGES },
];

/* a NAME's own page says what is on it about that name — the list page's subtitle is about every name */
const NAME_PAGE: Record<string, (name: string) => string> = {
  '/dossier/stocks': n => `The dossier on ${n}, on one page: its chart, how it screens, its news, its earnings and its filings.`,
  '/dossier/earnings': n => `${n}’s earnings: the next print, the move priced for it, and what the name has typically done.`,
};

/** A subtitle is written for under a heading ("a & b — c"); as a description it reads as a sentence */
const sentence = (s: string): string => {
  const t = s.replace(/\s&\s/g, ' and ').replace(/\s—\s/g, ': ').trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
};

/* ---- the words a page says of itself (the head note) ---- */
let said: string | null = null;
const saidListeners = new Set<() => void>();
export const sayPage = (words: string | null) => {
  if (words === said) return;
  said = words;
  saidListeners.forEach(fn => fn());
};
const useSaid = () =>
  useSyncExternalStore(
    fn => {
      saidListeners.add(fn);
      return () => saidListeners.delete(fn);
    },
    () => said,
    () => said
  );
/** Mounted by a page built round one thing: the tab carries its name while the page is up */
export const SayPage = ({ words }: { words: string | null | undefined }) => {
  useEffect(() => {
    sayPage(words ?? null);
    return () => sayPage(null);
  }, [words]);
  return null;
};
/** A part of an address as typed — a broken escape ("%E0") read as it stands, not thrown */
const decoded = (part: string): string => {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
};
/** A segment of an address that is a NAME (a ticker), not an id */
const TICKER = /^[A-Za-z^][A-Za-z0-9.^-]{0,5}$/;

export function metaFor(pathname: string, own: string | null = null, search = ''): Meta {
  /* the address as the router reads it: no trailing slash, any case (a ticker's part keeps its own, below) */
  const exact = pathname.replace(/\/+$/, '') || '/';
  const path = exact.toLowerCase();
  if (path === '/') return LANDING;
  if (TOP[path]) return TOP[path];

  /* an invite and its welcome name who sent them */

  if (path === '/settings' || path.startsWith('/settings/')) {
    const s = path.split('/')[2] ?? 'account';
    return SETTINGS[s] ? page(SETTINGS_NAME[s], SETTINGS[s], 'Settings') : NOT_FOUND;
  }
  /* a setup's own page: /compass/NVDA-480-C-weekly-… — the name is the address's first part */
  if (path.startsWith('/compass/')) {
    const name = decoded(path.split('/')[2] ?? '').split('-')[0].toUpperCase();
    return page(name ? `${name} setup` : 'Setup', 'One setup on its own page: why it was chosen, the levels it leans on, and its live state.', 'Compass');
  }
  for (const sec of SECTIONS) {
    if (path !== sec.base && !path.startsWith(`${sec.base}/`)) continue;
    const at = sec.pages.find(p => p.path === path);
    if (at) return page(at.label, sentence(at.subtitle), sec.name);
    /* a page under one of the section's pages: a NAME's own (/record/stocks/NVDA — the segment is the name), or a thing
       with an id (/practice/backtest/smuaf0fpb3x, /practice/journal/<account>/<trade>) that says its own words, or none */
    const parent = sec.pages.find(p => path.startsWith(`${p.path}/`));
    if (parent) {
      if (own) return page(own, sentence(parent.subtitle), parent.label);
      const seg = decoded(exact.slice(parent.path.length + 1).split('/')[0]);
      if (!NAME_PAGE[parent.path] || !TICKER.test(seg)) return page(parent.label, sentence(parent.subtitle), sec.name);
      const name = seg.toUpperCase();
      const about = NAME_PAGE[parent.path]?.(name) ?? sentence(parent.subtitle);
      return page(`${name} · ${parent.label}`, about, sec.name);
    }
    return page(sec.name, sentence(sec.pages[0].subtitle));
  }
  return { title: SITE, description: LANDING.description };
}

const setMeta = (selector: string, content: string) => {
  document.head.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
};

/** The page's own address on the site's domain — what og:url and the canonical link say (the audit's F3: og:url stayed
    the front page's on every page, and there was no canonical) */
export const addressOf = (pathname: string): string => {
  const exact = pathname.replace(/\/+$/, '') || '/';
  const lower = exact.toLowerCase();
  /* a page's own address in lower case (/About is /about); a name or a key in it keeps its own case (/dossier/stocks/NVDA,
     /i/zak-7Q2M) — only the section is lowered */
  const fixed = TOP[lower] || SECTIONS.some(sec => sec.base === lower || sec.pages.some(p => p.path === lower)) || lower.startsWith('/settings') ? lower : exact.replace(/^\/[^/]+/, m => m.toLowerCase());
  return `https://${COMPANY.site}${fixed}`;
};
const setCanonical = (href: string) => {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
};

const PageMeta = () => {
  const { pathname, search } = useLocation();
  const own = useSaid();
  useEffect(() => {
    /* a pop-out names its own window (pages/popout/PopOutFrame.tsx) */
    if (pathname.startsWith('/out/')) return;
    const m = metaFor(pathname, own, search);
    document.title = m.title;
    setMeta('meta[name="description"]', m.description);
    setMeta('meta[property="og:title"]', m.title);
    setMeta('meta[property="og:description"]', m.description);
    setMeta('meta[name="twitter:title"]', m.title);
    setMeta('meta[name="twitter:description"]', m.description);
    const href = addressOf(pathname);
    setMeta('meta[property="og:url"]', href);
    setCanonical(href);
  }, [pathname, own, search]);
  return null;
};

export default PageMeta;
