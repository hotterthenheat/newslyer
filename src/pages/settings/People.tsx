/*
==================================================
  SLAYER TERMINAL - PEOPLE (pages/settings/People.tsx)

  The admin room (Noah, 2026-10-10: "start with the
  admin people room"), a section of Settings that
  only an owner sees. Top to bottom, the shape he
  said build to:

    THE HEAD      one line — how many accounts, how
                  many on a plan, how many banned —
                  and the search box
    THE CARDS     Plan · Status · Role · Sort, the
                  house's dropdown cards
    THE TABLE     the house grid in a window: the
                  person, email, plan, role, status,
                  joined, last seen, the ways in
    A ROW'S CARD  press a row and the person's card
                  opens over the room (ui/Modal): the
                  facts, the three doors — plan, role,
                  ban — and one line of reason before
                  anything saves; their own history
                  under it
    THE LOG       a second box: the last hundred
                  changes across everyone, written by
                  the database itself

  The words and the doors are data/admin.ts's; the
  rules are the database's (owners only, the last
  owner stays, nobody bans themselves) and the page
  only repeats what it said. Without the account
  service the room shows a sample, so it can be
  looked at and the checks still run.
==================================================
*/

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ColDef, ICellRendererParams, RowClickedEvent } from 'ag-grid-community';
import { AgGridProvider, AgGridReact } from 'ag-grid-react';
import { Mail, Search } from 'lucide-react';
import { GRID_MODULES, GRID_THEME } from '../../components/ui/houseGrid';
import DropdownSelect, { type DropdownOption } from '../../components/ui/DropdownSelect';
import Fact from '../../components/ui/Fact';
import Modal from '../../components/ui/Modal';
import { MorphingInfinity } from '../../components/ui/Working';
import { AppleMark, GoogleMark } from '../../brand/providerMarks';
import { ACCOUNTS_ON } from '../../data/supabase';
import { useAccount, type AccountPlan, type Role } from '../../data/account';
import { planOf, STATUS_WORD as PLAN_STATUS_WORD } from '../../data/billing';
import { adminUpdate, ago, loadLog, loadPeople, statusOf, STATUS_WORD, type AdminPatch, type LogRow, type Person, type PersonStatus } from '../../data/admin';
import { Door, Said, Section, Tag } from './pieces';

/* ---- the words ------------------------------------------------------------------------------------------------------ */

const PLAN_WORD: Record<AccountPlan, string> = { none: 'No plan', book: planOf('book').name, tape: planOf('tape').name, desk: planOf('desk').name, seat: planOf('seat').name };
const STATUS_INK: Record<PersonStatus, string> = { active: 'text-textSecondary', new: 'text-silver', unconfirmed: 'text-textMuted', banned: 'text-warn' };

type PlanPick = 'all' | AccountPlan;
type StatusPick = 'all' | PersonStatus;
type RolePick = 'all' | Role;
type SortPick = 'newest' | 'name' | 'seen';
type BanPick = 'keep' | 'lift' | '7d' | '30d' | '90d' | '365d' | 'forever';

const PLAN_PICKS: DropdownOption<PlanPick>[] = [
  { value: 'all', label: 'Every plan', quiet: true },
  { value: 'none', label: 'No plan', hint: 'Signed up, paying nothing' },
  { value: 'book', label: PLAN_WORD.book, hint: 'The book' },
  { value: 'tape', label: PLAN_WORD.tape, hint: 'The book, the tape, the record' },
  { value: 'desk', label: PLAN_WORD.desk, hint: 'Everything' },
  { value: 'seat', label: PLAN_WORD.seat, hint: 'Paid once, for good' },
];
const STATUS_PICKS: DropdownOption<StatusPick>[] = [
  { value: 'all', label: 'Every status', quiet: true },
  { value: 'active', label: 'Active', hint: 'Confirmed, not banned' },
  { value: 'new', label: 'New today', hint: 'Signed up in the last day' },
  { value: 'unconfirmed', label: 'Unconfirmed', hint: 'The address has not been confirmed' },
  { value: 'banned', label: 'Banned', hint: 'Shut out until a date' },
];
const ROLE_PICKS: DropdownOption<RolePick>[] = [
  { value: 'all', label: 'Every role', quiet: true },
  { value: 'owner', label: 'Owner', hint: 'Runs the terminal — sees this room' },
  { value: 'member', label: 'Member', hint: 'A trader' },
];
const SORT_PICKS: DropdownOption<SortPick>[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'name', label: 'By name' },
  { value: 'seen', label: 'Last seen' },
];
const PLAN_SET: DropdownOption<AccountPlan>[] = PLAN_PICKS.filter((o): o is DropdownOption<AccountPlan> => o.value !== 'all');
const ROLE_SET: DropdownOption<Role>[] = ROLE_PICKS.filter((o): o is DropdownOption<Role> => o.value !== 'all');
const BAN_PICKS: DropdownOption<BanPick>[] = [
  { value: 'keep', label: 'As it is', quiet: true },
  { value: 'lift', label: 'Not banned', hint: 'Lifts a ban' },
  { value: '7d', label: 'A week' },
  { value: '30d', label: 'A month' },
  { value: '90d', label: 'Three months' },
  { value: '365d', label: 'A year' },
  { value: 'forever', label: 'For good', hint: 'A hundred years, which is the same thing' },
];
const banUntil = (pick: BanPick): string | null | undefined => {
  if (pick === 'keep') return undefined;
  if (pick === 'lift') return null;
  const days = pick === 'forever' ? 36500 : Number(pick.replace('d', ''));
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
};

const fmtWhen = (iso: string | null): string => (iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
const fmtDay = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

/* ---- the pieces ----------------------------------------------------------------------------------------------------- */

/** The person's disc — their picture, or the first letter of their name on the chip ground */
const Disc = ({ p, size = 22 }: { p: Person; size?: number }) =>
  p.avatar ? (
    <img src={p.avatar} alt="" draggable={false} className="rounded-full object-cover shrink-0 select-none" style={{ width: size, height: size }} />
  ) : (
    <span className="rounded-full bg-chip border border-borderSubtle inline-flex items-center justify-center shrink-0 font-mono font-semibold text-textSecondary select-none" style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }} aria-hidden="true">
      {(p.name || p.email).trim().charAt(0).toUpperCase()}
    </span>
  );

/** The ways in, as their marks */
const Ways = ({ providers }: { providers: string[] }) => (
  <span className="inline-flex items-center gap-1.5" title={providers.length ? providers.join(' · ') : 'no way in yet'} data-people-ways={providers.join(',')}>
    {providers.includes('email') && <Mail className="w-3 h-3 text-textMuted" aria-label="email" />}
    {providers.includes('google') && <GoogleMark size={11} />}
    {providers.includes('apple') && <AppleMark size={11} className="text-textSecondary" />}
    {!providers.length && <span className="font-mono text-[11px] text-textMuted">—</span>}
  </span>
);

const StatusWord = ({ s }: { s: PersonStatus }) => (
  <span className={`font-mono text-[11px] uppercase tracking-wider ${STATUS_INK[s]}`} data-people-status={s}>
    {STATUS_WORD[s]}
  </span>
);

const PlanChip = ({ plan }: { plan: AccountPlan }) =>
  plan === 'none' ? (
    <span className="font-mono text-[11px] text-textMuted">—</span>
  ) : (
    <span className="inline-flex items-center h-[18px] px-1.5 rounded border border-borderSubtle font-mono text-[11px] uppercase tracking-wider text-textPrimary leading-normal">{PLAN_WORD[plan]}</span>
  );

/** A cell's content on the row's middle line: the grid centres bare text by its line-height, and a chip or a flex span
    would otherwise sit at the cell's top (the grid cell line-height trap) */
const Mid = ({ children }: { children: ReactNode }) => <span className="inline-flex items-center h-full leading-normal">{children}</span>;

/** One line of the log: when · who → whom · what, old to new · why */
const LogLine = ({ l, nameOf, dense = false }: { l: LogRow; nameOf: (id: string | null) => string; dense?: boolean }) => (
  <li className={`${dense ? 'py-1.5' : 'px-5 py-2.5 border-t border-borderSubtle/60'} flex items-baseline gap-3 min-w-0`} data-people-log={l.id}>
    <span className="font-mono text-[11px] tnum text-textMuted shrink-0 w-[72px]" title={fmtWhen(l.at)}>
      {ago(l.at)}
    </span>
    <span className="min-w-0 flex-1 text-[11px] leading-snug text-textSecondary">
      <span className="text-textPrimary">{nameOf(l.actor)}</span>
      {!dense && (
        <>
          {' set '}
          <span className="text-textPrimary">{nameOf(l.subject)}</span>
        </>
      )}
      {dense ? ' set ' : "'s "}
      <span className="font-mono text-[11px] uppercase tracking-wider">{l.field === 'banned_until' ? 'ban' : l.field}</span>
      {': '}
      <span className="font-mono tnum">{l.field === 'banned_until' ? (l.old ? `until ${fmtDay(l.old)}` : 'none') : (l.old ?? '—')}</span>
      {' → '}
      <span className="font-mono tnum text-textPrimary">{l.field === 'banned_until' ? (l.new ? `until ${fmtDay(l.new)}` : 'none') : (l.new ?? '—')}</span>
      {l.note && <span className="text-textMuted"> · {l.note}</span>}
    </span>
  </li>
);

/* ---- the person's card ---------------------------------------------------------------------------------------------- */

const PersonCard = ({ p, me, log, nameOf, onClose, onChanged }: { p: Person | null; me: string | null; log: LogRow[]; nameOf: (id: string | null) => string; onClose: () => void; onChanged: () => Promise<void> }) => {
  const [plan, setPlan] = useState<AccountPlan>('none');
  const [role, setRole] = useState<Role>('member');
  const [ban, setBan] = useState<BanPick>('keep');
  const [why, setWhy] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /* the doors open on the person as they stand */
  useEffect(() => {
    if (!p) return;
    setPlan(p.plan);
    setRole(p.role);
    setBan('keep');
    setWhy('');
    setProblem(null);
  }, [p]);
  if (!p) return <Modal open={false} onClose={onClose} ariaLabel="A person" header={null}>{null}</Modal>;
  const status = statusOf(p);
  const patch: AdminPatch = {};
  if (plan !== p.plan) patch.plan = plan;
  if (role !== p.role) patch.role = role;
  const until = banUntil(ban);
  if (until !== undefined) patch.banned_until = until;
  const changed = Object.keys(patch).length > 0;
  const self = me != null && p.id === me;
  const save = async () => {
    setProblem(null);
    if (!changed) return;
    if (!why.trim()) return setProblem('Say why, in a line.');
    if (self && patch.banned_until) return setProblem('You cannot ban yourself.');
    setSaving(true);
    const r = await adminUpdate(p.id, patch, why.trim());
    setSaving(false);
    if (!r.ok) return setProblem(r.why);
    await onChanged();
    onClose();
  };
  const header = (
    <span className="flex items-center gap-3 min-w-0">
      <Disc p={p} size={28} />
      <span className="min-w-0 flex flex-col">
        <span className="text-[13px] font-semibold text-textPrimary truncate">
          {p.name || p.email}
          {p.handle && <span className="ml-2 font-mono text-[11px] font-normal text-textMuted">@{p.handle}</span>}
        </span>
        <span className="font-mono text-[11px] text-textMuted truncate">{p.email}</span>
      </span>
      {self && <Tag tone="silver">you</Tag>}
    </span>
  );
  return (
    <Modal open={!!p} onClose={onClose} ariaLabel={`${p.name || p.email} — the account`} header={header} widthClass="max-w-[640px]">
      <div className="flex flex-col gap-5" data-people-card={p.id}>
        {/* THE FACTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
          <Fact label="Plan" value={p.plan === 'none' ? PLAN_WORD.none : `${PLAN_WORD[p.plan]} · ${PLAN_STATUS_WORD[p.planStatus]}${p.planPeriod ? ` · ${p.planPeriod === 'year' ? 'yearly' : 'monthly'}` : ''}`} />
          <Fact label={p.planStatus === 'canceled' ? 'Ends' : 'Renews'} value={p.planRenewsOn ? fmtDay(p.planRenewsOn) : '—'} />
          <Fact label="Role" value={p.role} valueCls={p.role === 'owner' ? 'text-silver' : 'text-textPrimary'} />
          <Fact label="Status" value={STATUS_WORD[status]} valueCls={STATUS_INK[status]} />
          <Fact label="Banned until" value={p.bannedUntil && status === 'banned' ? fmtDay(p.bannedUntil) : '—'} />
          <Fact label="Joined" value={fmtDay(p.createdAt)} />
          <Fact label="Last seen" value={ago(p.lastSignInAt)} />
          <Fact label="Address confirmed" value={p.emailConfirmedAt ? fmtDay(p.emailConfirmedAt) : 'not yet'} valueCls={p.emailConfirmedAt ? 'text-textPrimary' : 'text-textMuted'} />
          <Fact label="Ways in" value={<Ways providers={p.providers} />} />
        </div>

        {/* THE DOORS — plan, role, ban; then the one line of reason */}
        <div className="rounded-md border border-borderSubtle bg-ink/[0.02] p-3 flex flex-col gap-3" data-people-doors>
          <div className="flex items-center gap-2 flex-wrap">
            <DropdownSelect<AccountPlan> label="Plan" value={plan} options={PLAN_SET} onChange={setPlan} title="The plan this person is on" testId="people-plan" />
            <DropdownSelect<Role> label="Role" value={role} options={ROLE_SET} onChange={setRole} title="Owner or member" testId="people-role" />
            <DropdownSelect<BanPick> label="Ban" value={ban} options={BAN_PICKS} onChange={setBan} title="Shut out until when" testId="people-ban" />
          </div>
          <div className="flex items-center gap-2 max-sm:flex-col max-sm:items-stretch">
            <input
              value={why}
              onChange={e => {
                setWhy(e.target.value);
                if (problem) setProblem(null);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') void save();
              }}
              placeholder={changed ? 'Why — one line, kept in the log' : 'Change something above, then say why'}
              spellCheck={false}
              className="min-w-0 flex-1 h-7 rounded-md border border-borderSubtle bg-chip px-2 font-mono text-[11px] text-textPrimary outline-none focus:border-borderMuted placeholder:text-textMuted"
              data-people-why
            />
            <Door onClick={save} tone="silver" disabled={!changed || saving} title="Saves the change, with its reason, in the log" testId="people-save">
              {saving ? 'Saving' : 'Save'}
            </Door>
            <Door onClick={onClose} testId="people-cancel">
              Cancel
            </Door>
          </div>
          <Said problem={problem} note={changed ? null : 'Nothing changed yet.'} />
        </div>

        {/* THEIR OWN HISTORY */}
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-textSecondary">Their history</span>
          {log.length ? (
            <ul className="flex flex-col divide-y divide-borderSubtle/60">
              {log.map(l => (
                <LogLine key={l.id} l={l} nameOf={nameOf} dense />
              ))}
            </ul>
          ) : (
            <span className="text-[11px] text-textMuted">Nothing changed on this account yet.</span>
          )}
        </div>
      </div>
    </Modal>
  );
};

/* ---- the table ------------------------------------------------------------------------------------------------------ */

type PeopleRow = Person & { status: PersonStatus };

const PEOPLE_THEME = GRID_THEME.withParams({ rowHeight: 36, headerHeight: 28, fontSize: 11, cellHorizontalPadding: 10 });
const COL: ColDef<PeopleRow> = { sortable: false, resizable: true, suppressMovable: true };
const ROW_H = 36;
const HEAD_H = 28;

const WhoCell = ({ data }: ICellRendererParams<PeopleRow>) =>
  data ? (
    <Mid>
      <span className="inline-flex items-center gap-2 min-w-0" data-people-who={data.id}>
        <Disc p={data} />
        <span className="truncate text-[11px] font-semibold text-textPrimary">{data.name || data.email}</span>
        {data.handle && <span className="truncate font-mono text-[11px] text-textMuted">@{data.handle}</span>}
      </span>
    </Mid>
  ) : null;

/* the widths add to less than the Settings column at 1440 (886px of grid), so no sideways scroll takes the last row's room */
const COLUMNS: ColDef<PeopleRow>[] = [
  { colId: 'who', headerName: 'Person', flex: 2.2, minWidth: 170, cellRenderer: WhoCell },
  { colId: 'email', headerName: 'Email', flex: 2, minWidth: 150, valueGetter: p => p.data?.email ?? '', cellClass: 'font-mono text-[11px] text-textSecondary' },
  { colId: 'plan', headerName: 'Plan', width: 80, cellRenderer: ({ data }: ICellRendererParams<PeopleRow>) => (data ? <Mid><PlanChip plan={data.plan} /></Mid> : null) },
  { colId: 'role', headerName: 'Role', width: 80, valueGetter: p => p.data?.role ?? '', cellClass: p => `font-mono text-[11px] uppercase tracking-wider ${p.data?.role === 'owner' ? 'text-silver' : 'text-textSecondary'}` },
  { colId: 'status', headerName: 'Status', width: 104, cellRenderer: ({ data }: ICellRendererParams<PeopleRow>) => (data ? <Mid><StatusWord s={data.status} /></Mid> : null) },
  { colId: 'joined', headerName: 'Joined', width: 84, valueGetter: p => ago(p.data?.createdAt ?? null), cellClass: 'font-mono text-[11px] tnum text-textSecondary' },
  { colId: 'seen', headerName: 'Last seen', width: 92, valueGetter: p => ago(p.data?.lastSignInAt ?? null), cellClass: 'font-mono text-[11px] tnum text-textSecondary' },
  { colId: 'ways', headerName: 'Ways in', width: 76, cellRenderer: ({ data }: ICellRendererParams<PeopleRow>) => (data ? <Mid><Ways providers={data.providers} /></Mid> : null) },
];

/* ---- the room ------------------------------------------------------------------------------------------------------- */

const PeopleBox = () => {
  const a = useAccount();
  const owner = !ACCOUNTS_ON || (a.status === 'in' && a.profile?.role === 'owner');
  const [people, setPeople] = useState<Person[] | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [q, setQ] = useState('');
  const [plan, setPlan] = useState<PlanPick>('all');
  const [status, setStatus] = useState<StatusPick>('all');
  const [role, setRole] = useState<RolePick>('all');
  const [sort, setSort] = useState<SortPick>('newest');
  const [picked, setPicked] = useState<Person | null>(null);

  const reload = useCallback(async () => {
    const r = await loadPeople();
    setPeople(r.people);
    setWhy(r.why);
    setLog(await loadLog(100));
  }, []);
  useEffect(() => {
    if (owner) void reload();
  }, [owner, reload]);

  const nameOf = useCallback(
    (id: string | null): string => {
      if (!id) return 'The dashboard';
      const p = people?.find(x => x.id === id);
      return p ? p.name || p.email : 'someone';
    },
    [people]
  );

  const rows: PeopleRow[] = useMemo(() => {
    const now = Date.now();
    const needle = q.trim().toLowerCase();
    const out = (people ?? [])
      .map(p => ({ ...p, status: statusOf(p, now) }))
      .filter(p => (plan === 'all' || p.plan === plan) && (status === 'all' || p.status === status) && (role === 'all' || p.role === role))
      .filter(p => !needle || p.name.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle) || (p.handle ?? '').toLowerCase().includes(needle));
    const by: Record<SortPick, (x: PeopleRow, y: PeopleRow) => number> = {
      newest: (x, y) => y.createdAt.localeCompare(x.createdAt),
      name: (x, y) => (x.name || x.email).localeCompare(y.name || y.email),
      seen: (x, y) => (y.lastSignInAt ?? '').localeCompare(x.lastSignInAt ?? ''),
    };
    return out.sort(by[sort]);
  }, [people, q, plan, status, role, sort]);

  const counts = useMemo(() => {
    const all = people ?? [];
    const now = Date.now();
    return { n: all.length, onPlan: all.filter(p => p.plan !== 'none').length, banned: all.filter(p => statusOf(p, now) === 'banned').length };
  }, [people]);

  const line = 'Every account — who they are, what they are on, and the log of every change';

  if (ACCOUNTS_ON && a.status === 'loading')
    return (
      <Section id="people" title="People" line={line} aside={<Tag>signing in…</Tag>}>
        <div className="px-5 py-6 flex items-center gap-2 text-[11px] text-textMuted border-t border-borderSubtle/60">
          <MorphingInfinity viewBox="4 4 16 16" className="w-3.5 h-3.5" /> Asking whether you are signed in
        </div>
      </Section>
    );
  if (!owner)
    return (
      <Section id="people" title="People" line="The owners' room — every account, and the log of every change" aside={<Tag>owners only</Tag>}>
        <div className="px-5 py-4 border-t border-borderSubtle/60 flex items-center justify-between gap-6 max-sm:flex-col max-sm:items-stretch max-sm:gap-3" data-people-closed>
          <div className="text-[11px] text-textMuted">This room opens to an owner. Your own account is on the Account page.</div>
          <Door to="/settings/account" tone="silver" testId="people-to-account">
            Account
          </Door>
        </div>
      </Section>
    );

  /* the header, up to thirteen rows, and a little slack — the whole last row stands clear of the grid's edge */
  const gridH = HEAD_H + Math.min(13, Math.max(3, rows.length)) * ROW_H + 6;
  return (
    <>
      <Section id="people" title="People" line={line} aside={<Tag tone="silver">{ACCOUNTS_ON ? 'owners only' : 'preview · sample accounts'}</Tag>}>
        {/* THE HEAD LINE, AND THE SEARCH */}
        <div className="px-5 py-3 border-t border-borderSubtle/60 flex items-center gap-x-4 gap-y-2 flex-wrap">
          <p className="text-[11px] text-textMuted whitespace-nowrap" data-people-line>
            {people == null ? 'Reading…' : `${counts.n} ${counts.n === 1 ? 'account' : 'accounts'} · ${counts.onPlan} on a plan · ${counts.banned} banned`}
          </p>
          <label className="ml-auto inline-flex items-center h-7 rounded-md border border-borderSubtle bg-chip focus-within:border-borderMuted transition-colors" style={{ width: 220 }}>
            <Search className="ml-2 w-3 h-3 text-textMuted shrink-0" aria-hidden="true" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Name, handle or email" spellCheck={false} className="min-w-0 flex-1 h-full bg-transparent px-2 font-mono text-[11px] text-textPrimary outline-none placeholder:text-textMuted" data-people-search />
          </label>
        </div>
        {/* THE CARDS */}
        <div className="px-5 pb-3 flex items-center gap-2 flex-wrap" data-people-cards>
          <DropdownSelect<PlanPick> label="Plan" value={plan} options={PLAN_PICKS} onChange={setPlan} title="On which plan" testId="people-pick-plan" />
          <DropdownSelect<StatusPick> label="Status" value={status} options={STATUS_PICKS} onChange={setStatus} title="In which state" testId="people-pick-status" />
          <DropdownSelect<RolePick> label="Role" value={role} options={ROLE_PICKS} onChange={setRole} title="Owners or members" testId="people-pick-role" />
          <DropdownSelect<SortPick> label="Sort" value={sort} options={SORT_PICKS} onChange={setSort} title="In what order" testId="people-pick-sort" />
        </div>
        {/* THE TABLE — the house grid in a window; a row pressed opens the person's card */}
        {why ? (
          <div className="px-5 py-4 border-t border-borderSubtle/60">
            <Said problem={why} note={null} />
          </div>
        ) : (
          <div className="slayer-board border-t border-borderSubtle/60" style={{ height: gridH }} data-people-grid={rows.length}>
            <AgGridProvider modules={GRID_MODULES}>
              <AgGridReact<PeopleRow>
                theme={PEOPLE_THEME}
                rowData={rows}
                columnDefs={COLUMNS}
                defaultColDef={COL}
                getRowId={p => p.data.id}
                onRowClicked={(e: RowClickedEvent<PeopleRow>) => e.data && setPicked(people?.find(p => p.id === e.data!.id) ?? null)}
                rowSelection={{ mode: 'singleRow', checkboxes: false, enableClickSelection: false }}
                suppressCellFocus
                animateRows={false}
                alwaysShowVerticalScroll
                overlayNoRowsTemplate={people == null ? '<span class="font-mono text-[11px]">Reading…</span>' : '<span class="font-mono text-[11px]">Nobody matches</span>'}
              />
            </AgGridProvider>
          </div>
        )}
      </Section>

      {/* THE LOG */}
      <Section id="people-log" title="The log" line="Every change to a plan, a role or a ban — who, whom, what, and why. Written by the database the moment a row changes">
        {log.length ? (
          <ul data-people-log-list>
            {log.map(l => (
              <LogLine key={l.id} l={l} nameOf={nameOf} />
            ))}
          </ul>
        ) : (
          <div className="px-5 py-4 border-t border-borderSubtle/60 text-[11px] text-textMuted">Nothing has changed yet.</div>
        )}
      </Section>

      <PersonCard p={picked} me={a.profile?.id ?? null} log={picked ? log.filter(l => l.subject === picked.id) : []} nameOf={nameOf} onClose={() => setPicked(null)} onChanged={reload} />
    </>
  );
};

export default PeopleBox;
