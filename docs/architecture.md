# Architecture

A frontend-only, local-first PWA. There is no server: the app is static files
on GitHub Pages, and every byte of user data lives in the browser (plus, if
the user connects one, a single JSON file in their own Dropbox or Google
Drive).

## The stack

- **Preact** through `preact/compat` — the app and the framework both write
  React-flavoured code, and the alias map in `vite.config.ts` /
  `tsconfig.json` resolves all of it onto Preact. React itself never reaches
  the bundle.
- **[`@niclaslindstedt/oss-framework`](https://github.com/niclaslindstedt/oss-framework)**
  — the shared surface behind the sibling notes, contacts and cycle apps: the
  UI kit, the theme engine, the calendar grid, the chart primitives, the
  storage adapters, the i18n runtime, logging, toasts, and the PWA update
  state machine.
- **Tailwind v4** for styling, over the framework's theme tokens.
- **Vite** with a hand-rolled PWA plugin (`pwa-plugin.ts`) that emits the
  service worker, the web manifest, and the version/precache manifests the
  framework's update hook reads.

Dependency direction: screens → stores → framework. App code imports only the
framework's published subpaths, never its internals.

## The shape of the data

One JSON document, stored under `meds:doc` and synced verbatim when a cloud
backend is connected:

```jsonc
{
  "version": 1,
  "medications": {
    "<id>": {
      "id": "<id>",
      "name": "Levaxin",
      "dose": "50 µg", // free text; "" when none
      "times": ["08:00"], // zero-padded HH:MM, sorted, ≥ 1
      "startDate": "2026-03-01", // first day doses are due
      "endDate": null, // last day doses were due; null while current
      "updatedAt": "2026-03-01T08:00:00.000Z",
    },
  },
  "days": {
    "2026-03-02": {
      "date": "2026-03-02",
      // doseKey (`<medId>@<HH:MM>`) → ISO timestamp of the tap
      "taken": { "<id>@08:00": "2026-03-02T08:04:00.000Z" },
      "updatedAt": "2026-03-02T08:04:00.000Z",
    },
  },
}
```

Two invariants shape everything else:

- **Derive, don't store.** Nothing about adherence is persisted — day
  statuses, percentages and streaks are recomputed on render from
  `schedule.ts` / `stats.ts` (see [schedule.md](schedule.md)). There is no
  cache to invalidate and no way for a stored summary to disagree with the
  taps it summarises.
- **Every read crosses `migrations.ts`.** localStorage, the cloud copy, and
  imported backups all go through `parseDoc`/`normalizeDoc`, which validates
  shape, drops what it cannot read, and runs the version-step table. No other
  module trusts stored bytes.

## Module map

```
src/
├── main.tsx                 boot: fonts, styles, Preact render
├── output.ts                §19.4 semantic log helpers → the in-app log store
├── styles.css               Tailwind + framework tokens + the app shell rules
└── app/
    ├── types.ts             Medication / DayLog / AppData, doseKey, sorting
    ├── schedule.ts          what a day owes (pure, clock-free)
    ├── stats.ts             adherence, streaks, gaps (pure, clock-free)
    ├── catalog.ts           autocomplete search over the bundled catalog
    ├── data/medications.ts  the catalog data (own chunk, lazy-loaded)
    ├── merge.ts             meds by last edit, day logs by union of taps
    ├── migrations.ts        parse / normalise / serialize
    ├── useDocStore.ts       the document store over a DocBackend seam
    ├── useSyncEngine.ts     debounced push / pull over the framework adapters
    ├── useAppSettings.ts    theme, week start, dev knobs (localStorage)
    ├── useSwipeNav.ts       the tab-paging swipe
    ├── App.tsx              the shell: tabs, toasts, PWA update, sync modal
    ├── BottomNav.tsx        the four destinations + initialTab
    ├── TopBar.tsx           wordmark, sync glyph, + (add), ⚙ (settings)
    ├── TodayScreen.tsx      the checklist (opens first)
    ├── AddScreen.tsx        the + screen (opens first on an empty install)
    ├── MedForm.tsx          the shared add/edit form (autocomplete, chips)
    ├── MedsScreen.tsx       the list: edit in place, stop / resume / delete
    ├── CalendarScreen.tsx   the month grid + the selected day's checklist
    ├── DoseList.tsx         a day's doses as tappable rows (Today + Calendar)
    ├── DayMark.tsx          day progress → mark + legend (one table)
    ├── MonthCalendar.tsx    MonthGrid + month-stepping header + swipe
    ├── HistoryScreen.tsx    tiles, the gap chart, per-med bars, missed list
    ├── HistoryChart.tsx     the chart, from the framework's primitives
    ├── chartAxis.ts         nice gridline steps (pure arithmetic)
    ├── SettingsScreen.tsx   one scrolling page of Sections
    ├── backup.ts            export / restore (same merge as sync)
    ├── look.ts              theme choice → framework appearance
    ├── log.ts               the in-app log buffer
    ├── pwa.ts               the per-base precache cache id
    ├── icons.tsx            the app mark and the domain glyphs
    ├── i18n/                createI18n over en.ts (every UI string)
    └── dev/                 the demo-data takeover (own chunk)
```

## Navigation

Four destinations on a bottom bar — **Today, Calendar, History, Meds** — in a
fixed order a swipe moves along; the arriving screen slides in from the side
it lives on. Two actions on the top bar — **Add** and **Settings** — because
you visit them and leave; pressing their button again returns to where you
were. There is deliberately no sidebar and no drawer.

`initialTab` picks the first screen from the booted document: **Today** when
there are current medications, the **Add** form when there are none — the one
screen that is useful before a schedule exists.

## The service worker

`pwa-plugin.ts` emits a minimal "prompt to update" worker: it precaches the
build's assets one entry at a time (so the update toast can show progress),
parks in `waiting` rather than auto-skipping (a silent swap would discard an
in-progress edit), and applies on the toast's SKIP_WAITING message.
Navigations are network-first with the precached shell as the offline
fallback; hashed assets are cache-first. Each deploy channel (`/`,
`/preview/`) gets its own manifest identity and cache id so the installs
don't fight over a scope.

## Where the clock lives

`App.tsx` owns `today` and refreshes it on window focus — the only way the
answer changes while the app is open is midnight passing, and a medication
log that carries yesterday's unfinished checklist into today's date would be
wrong in the worst way. Everything below the shell takes `today` as a
parameter and never reads the clock; the one exception is the timestamp a tap
records, which is the fact being logged.
