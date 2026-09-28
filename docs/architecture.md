# Architecture

A frontend-only, local-first PWA. There is no server: the app is static files
on GitHub Pages, and every byte of user data lives in the browser (plus, if
the user connects one, a single file in their own Dropbox — the same JSON
document, encrypted on the device first; see [sync.md](sync.md#encryption)).

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
  "version": 6,
  "medications": {
    "<id>": {
      "id": "<id>",
      "name": "Levaxin",
      "dose": "50 µg", // free text; "" when none
      "times": ["08:00"], // zero-padded HH:MM, sorted; ≥ 1 unless asNeeded
      "asNeeded": false, // true = nothing is due except over a course
      "courses": [], // as-needed stretches: [{ from, fromTime, to }]; to null = running
      "maxPerDay": null, // most doses in a day; only an as-needed med with no times
      "maxRun": null, // longest stretch of days in a row, in maxRunUnit; same meds
      "maxRunUnit": "days", // "days" | "weeks"; forced to "days" when maxRun is null
      "weekdays": null, // getDay() numbers (0 = Sun), sorted; null = every day
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
      // the same keys → when the dose was deliberately set aside; a dose in
      // here leaves the day's arithmetic and is never also in `taken`
      "skipped": { "<id>@20:00": "2026-03-02T20:30:00.000Z" },
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
├── output.ts                the semantic log helpers → the in-app log store
├── styles.css               Tailwind + framework tokens + the app shell rules
└── app/
    ├── types.ts             Medication / DayLog / AppData, doseKey, sorting
    ├── schedule.ts          what a day owes (pure, clock-free)
    ├── stats.ts             adherence, streaks, gaps (pure, clock-free)
    ├── catalog.ts           autocomplete search over the bundled catalog
    ├── data/medications.ts  the Swedish catalog data (own chunk, lazy-loaded)
    ├── data/medications-us.ts  the US catalog data (own chunk, for a US locale)
    ├── merge.ts             meds by last edit, day logs by union of marks
    ├── migrations.ts        parse / normalise / serialize
    ├── useDocStore.ts       the document store over a DocBackend seam
    ├── useSyncEngine.ts     debounced push / pull over the framework adapters,
    │                        held until the cloud copy's passphrase is set
    ├── SyncEncryption.tsx   the app's words for the framework's encryption kit
    ├── useAppSettings.ts    theme, week start, dev knobs (localStorage)
    ├── App.tsx              the shell: tabs, toasts, PWA update, sync modal
    ├── BottomNav.tsx        the four destinations + initialTab
    ├── TopBar.tsx           wordmark, sync glyph, + (quick log), ⚙ (settings)
    ├── QuickLogModal.tsx    the + sheet: today's doses, likeliest first
    ├── TodayScreen.tsx      the checklist (opens first)
    ├── AddScreen.tsx        the add form's screen (opens first when empty)
    ├── MedForm.tsx          the shared add/edit form (autocomplete, chips, days)
    ├── MedsScreen.tsx       the list: edit in place, stop / resume / delete
    ├── CalendarScreen.tsx   the month grid + the selected day's checklist
    ├── DoseList.tsx         a day's doses grouped by slot (Today + Calendar)
    ├── DoseRow.tsx          one dose as the control that logs (or skips) it
    ├── DayMark.tsx          day progress → mark + legend (one table)
    ├── HistoryScreen.tsx    tiles, the gap chart, per-med bars, missed list
    ├── HistoryChart.tsx     the chart, from the framework's primitives
    ├── SettingsScreen.tsx   one scrolling page of Sections
    ├── AboutScreen.tsx      behind Settings: the disclaimer and every source
    ├── references.ts        docs/references.json bound to this app (own chunk)
    ├── backup.ts            export / restore (same merge as sync)
    ├── look.ts              theme choice → framework appearance
    ├── log.ts               the in-app log buffer
    ├── pwa.ts               the per-base precache cache id
    ├── icons.tsx            the app mark and the domain glyphs
    ├── i18n/                createI18n over en.ts (every UI string)
    └── dev/                 the demo document (VITE_SEED=demo, and the Settings switch; own chunk)
```

## Navigation

Four destinations on a bottom bar — **Today, Calendar, History, Meds** — in a
fixed order a swipe moves along; the arriving screen slides in from the side
it lives on. Two actions on the top bar — the **+** and **Settings** —
because you do them and leave. There is deliberately no sidebar and no
drawer.

The **+** opens the **quick-log sheet** rather than a screen: a modal over
whatever you were looking at, listing today's doses with the likeliest first,
so logging a dose you just took costs neither a navigation nor the month you
had open on the Calendar. Adding a medication is a step further in — the
sheet's footer, or the Meds tab's button — because it happens a few times a
year where logging happens a few times a day. Settings is still a screen, and
pressing its button again returns to where you were. **About**, at the foot
of Settings, is one step further in and has a way back to it.

`initialTab` picks the first screen from the booted document: **Today** when
there are current medications, the **Add** form when there are none — the one
screen that is useful before a schedule exists.

## Where the figures come from

The app is a logbook, not a clinician, so it makes few claims — but the two
it makes are real. The History screen's adherence is a published measure:
the ABC taxonomy's _implementation_, the proportion of prescribed doses
taken, and stopping a medication is its _discontinuation_, which ends the
schedule and not the history. And the medication form's suggestions are
names and strengths from Läkemedelsverket's product records — or, on a US
device, from the National Library of Medicine's RxNorm. All are cited
where the code makes them, with a `[ref:<id>]` tag into
`docs/references.json` — the registry of every source:
authors or agency, title, DOI or URL, the kind of evidence, the verbatim
quotes the definition or data was taken from, what the app uses each for, and
which files cite it. `tests/references_test.ts` holds the tags and the
registry to each other both ways.

What the app decides for itself is said to be a decision, beside the code:
today never counting against you, a day with nothing due saying nothing, and
a skipped dose leaving the figure rather than counting as a lapse are this
app's rules about _which_ doses the published measure is taken over, not
the taxonomy's.

The registry is also what the user reads. The framework's `references`
module is its typed face — the shape, the evidence ranking, how an entry is
cited, the audit the test runs, and the card each entry is shown on — and
`src/app/references.ts` binds it to this app: the tabs as topics, the
summary language, and a loader that keeps the file in its own chunk. The
About screen, behind **Settings → About and sources**, lists every entry
from it, grouped by the tab it serves, with the quotes one tap down and a
link that is only followed when tapped. Nothing is copied by hand.

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
