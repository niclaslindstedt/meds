# Agent guidance for meds

This file is the canonical source of truth for AI coding agents working in this
repo. `CLAUDE.md`, `.cursorrules`, `.windsurfrules`, `GEMINI.md`, and
`.github/copilot-instructions.md` are symlinks to this file.

## OSS Spec conformance

This repository adheres to [`OSS_SPEC.md`](OSS_SPEC.md), a prescriptive
specification for open source project layout, documentation, automation, and
governance. A copy of the spec lives at the repository root so contributors and
AI agents can consult it without leaving the repo; its version is recorded in
the YAML front matter at the top of the file.

Run `oss-spec validate .` (or the standalone
[`validate.sh`](https://github.com/niclaslindstedt/oss-spec/blob/main/scripts/validate.sh))
to verify conformance. When in doubt about a layout, naming, or workflow
decision, consult the relevant section of `OSS_SPEC.md` — it is the source of
truth for the conventions this repo follows.

## What this app is, and the two rules that follow from it

A medication log holds health data about a named person's body. The whole
design premise is that the data never leaves the device unless its owner
explicitly connects their own cloud account.

**Rule one: never add a network call that isn't the user's own cloud
backend.** No analytics, no error reporting service, no font CDN, no
"anonymous" telemetry, no third-party script, and no medication lookup API —
not behind a flag, not in dev only. What someone types into a medication field
is exactly the byte that must not reach a server, which is why the
autocomplete catalog is a bundled chunk (`src/app/data/medications.ts`)
searched locally rather than a service. If a change would send a byte of log
data, or a byte _about_ log data, anywhere the user did not choose, it is the
wrong change however useful the feature is. This is the constraint the README
and the privacy copy promise; it outranks convenience.

**Rule two: the app is a logbook, not a clinician.** It records what the user
told it and does arithmetic over that. Copy must not imply medical authority:
no dose checking, no interaction warnings, no "you should" — the catalog's
strengths are a typing aid, not a recommendation, and the disclaimer in
Settings exists for this reason and must not be quietly dropped.

## Build and test commands

```sh
make install       # npm install (needs GitHub Packages auth — see below)
make build         # production build (vite build)
make test          # full test suite (vitest)
make lint          # eslint + tsc --noEmit
make fmt           # prettier --write
make fmt-check     # verify formatting (CI)
make check-seo     # build + assert the structural SEO/PWA signals
make icons         # regenerate the PWA icons, favicon, and og image
```

The `@niclaslindstedt/oss-framework` dependency comes from the **GitHub
Packages** npm registry (see `.npmrc`). GitHub Packages requires auth even for
public packages, so local installs need a `read:packages` token in `~/.npmrc`
(`//npm.pkg.github.com/:_authToken=<token>`); CI authenticates with the
workflow's `GITHUB_TOKEN`.

### Dependency install in web sessions

Claude Code on the web runs `.claude/hooks/session-start.sh` on `SessionStart`
(wired up in `.claude/settings.json`), so **dependencies install automatically
in the background** — an agent shouldn't run `make install` by hand first. The
hook resolves a GitHub Packages token from the environment
(`NODE_AUTH_TOKEN` / `GITHUB_PAT` / `GH_TOKEN` / `GITHUB_TOKEN`, first wins),
writes it to `~/.npmrc`, and runs `npm install` — the committed project
`.npmrc` stays token-free. It runs in **async** mode, so `node_modules` may
still be populating for a moment after the session opens; if a `make` target
fails on a missing dependency, wait and retry. The hook is a no-op outside the
web environment (`CLAUDE_CODE_REMOTE`), so it never touches a local
developer's npm config.

## Commit and PR conventions

- All commits follow [Conventional Commits](https://www.conventionalcommits.org/).
- PRs are squash-merged; the **PR title** becomes the single commit on `main`,
  so it must follow conventional-commit format.
- Breaking changes use `<type>!:` or a `BREAKING CHANGE:` footer.

### Watching a PR after you open it

Don't babysit a PR with polling. **Do not** schedule `send_later`, cron jobs,
`ScheduleWakeup`, or timed self-check-ins to re-check CI or merge state — those
just burn turns. Open the PR, confirm the checks you can see are green, then
stop. CI failures and review comments are delivered to the session as webhook
events, so you'll be woken when there's actually something to act on.

## Architecture summary

This is a **frontend-only, local-first PWA** — there is no server. It is built
on [`oss-framework`](https://github.com/niclaslindstedt/oss-framework), the
same shared surface behind the sibling `notes`, `contacts` and `cycle` apps.

The framework owns the UI kit and the generic mechanics: modals, form
primitives, the theme engine, the calendar grid, the SVG chart primitives, the
storage adapters (localStorage / Dropbox / Google Drive), the i18n runtime,
logging, the toast store, and the PWA update state machine.

Since framework 3.1.0 it also owns the app _shell_ this app used to carry its
own copy of: the bottom bar (`BottomNav`) and the `stepDirection` its screen
transition reads, the tab-paging swipe (`useSwipeNav`), the paging month view
(`MonthCalendar`), the gridline arithmetic behind the History chart's axis
(`niceTicks`), and `DayKey` rendering (`formatDayKey` / `formatMonthLabel` /
`dayKeyToDate`). What stayed here is the vocabulary — which screens are
destinations, what they are called, what a day's mark means.

### The renderer is Preact

`preact` is the only renderer dependency — **never add `react` or `react-dom`
back.** `@preact/preset-vite` compiles JSX against `preact/jsx-runtime` and
aliases `react` / `react-dom` (and their `/jsx-runtime` + `/client` subpaths)
onto `preact/compat`; `tsconfig.json` `paths` and `package.json` `overrides`
mirror that for `tsc` and npm, so the framework — which is built against React
— resolves to Preact too. App code keeps importing hooks and types from
`"react"`, which is the supported compat path; only `src/main.tsx` uses
Preact's own `render`. Two differences bite in new code: use `e.currentTarget`
rather than `e.target` in event handlers, and spell string-valued attributes
like SVG's `focusable` as `"false"` rather than a JSX boolean.

### The app owns the domain ("store stays in the app")

- `src/app/types.ts` — the `Medication` / `DayLog` / `AppData` model. A
  medication is a name, an optional free-text dose, its time slots, the
  weekdays it is due on (`weekdays`, null for every day), and the span of days
  its schedule covers (`startDate` / `endDate`); a day's log is a map of
  `medId@HH:MM` dose keys to the timestamps they were ticked at.
- `src/app/schedule.ts` — the derivation: which doses a day owes
  (`dueDoses`), how far through them a log is (`dayProgress`), slot and
  weekday-mask validation, and the quick-log sheet's likelihood ordering
  (`quickLogOrder`, which takes the moment as a parameter). **Pure and
  clock-free.**
- `src/app/stats.ts` — adherence over a window, per-medication adherence,
  streaks, the daily-share series the chart draws, the missed-dose list. The
  two rules stated at the top of the file — today never counts against you,
  and a day with nothing due says nothing — are load-bearing; every function
  applies them. Also pure and clock-free.
- `src/app/catalog.ts` — search over the bundled medication catalog: prefix
  before substring, å/ä/ö significant, nothing fuzzy. Pure; the data is a
  parameter.
- `src/app/data/medications.ts` — the catalog itself: common Swedish-market
  medication names with their usual strengths, curated by hand (FASS has no
  public API and is not openly licensed; a fuller list can be generated from
  Läkemedelsverket's open LiiV/NPL data into this same trivial shape). Rides
  in its own chunk behind `import()`.
- `src/app/merge.ts` — the document merge both cloud sync and backup restore
  run through: medications by last edit, day logs by union of taps.
- `src/app/migrations.ts` — parse / normalise / serialize; the only module
  that trusts stored bytes.
- `src/app/useDocStore.ts` — the document store, over a `DocBackend` seam
  rather than `localStorage` directly (which is what demo data swaps). Its
  edits are the app's whole write vocabulary: save/remove a medication, tick
  or untick one dose of one day, replace the document.
- `src/app/useSyncEngine.ts` — the sync engine over the framework's storage
  adapters (debounced push, conflict / auth / throttle handling). Suspended
  wholesale while demo data has taken over storage.
- `src/app/dev/` — the developer "Demo data" switch: three months of invented
  history (`demoData.ts`, pure, seeded PRNG, every date an offset from
  `today`), the in-memory `DocBackend` that serves it (`demoBackend.ts`), and
  the never-persisted flag both `App` and Settings read (`useDemoData.ts`).
  Behind `import()`, so a production user never downloads it.
- `src/app/TodayScreen.tsx`, `CalendarScreen.tsx`, `HistoryScreen.tsx`,
  `MedsScreen.tsx`, `AddScreen.tsx`, `SettingsScreen.tsx` — the six screens.
  Four are bottom-nav tabs; Settings is reached from the top bar and Add from
  the quick-log sheet's footer or the Meds tab's button, because they are
  things you do and leave rather than places you are.
- `src/app/MedForm.tsx` — the medication form, shared by the Add screen and
  the Meds screen's inline editor, with the catalog autocomplete, the dose
  chips and the "every day"/day-pill weekday control.
- `src/app/DoseRow.tsx` — one dose as the control that logs it. The app's
  only logging control; all three places that log a dose render it.
- `src/app/DoseList.tsx` — a day's doses as a tappable checklist grouped by
  slot, shared by Today and the Calendar's selected-day card so logging feels
  identical in both places.
- `src/app/QuickLogModal.tsx` — the top bar's `+`: today's doses as one flat
  sheet, likeliest first, already-logged ones greyed at the bottom. The order
  is frozen per opening so nothing moves under a thumb mid-tap.
- `src/app/DayMark.tsx` — a day's progress as a mark, plus the legend built
  from the same table. The app's one visual grammar rule lives here: filled
  means it happened, hollow means still open, the danger tint is a day that
  owed doses and got none — and the missed-vs-open call belongs to the
  caller's clock (`toneFor` takes `today`), never to the counts alone.
- `src/app/HistoryChart.tsx` — the History screen's chart, built from the
  framework's chart _primitives_ (`bandScale`, `linePath`, `barPath`,
  `linearScale`), not from its finished chart components.
- `src/app/TopBar.tsx` — the top bar: the wordmark, the sync glyph, the `+`
  that opens the quick-log sheet, and the settings cog.
- `src/app/i18n/en.ts` — every user-facing string.
- `src/output.ts` — the §19.4 central output module (semantic log helpers
  over the in-app log store).
- `pwa-plugin.ts` — emits the service worker + version/precache manifests the
  framework's `usePwaUpdate` consumes.

Dependency direction: screens → stores → framework. Nothing imports from the
framework's internals — only its published subpaths.

### Derive, don't store

Nothing about adherence is persisted — not the day statuses, not the
percentages, not the streaks. The document holds medications and taps and only
those; everything else is recomputed on render from `schedule.ts` and
`stats.ts`. This is why ticking a forgotten dose from three weeks ago
immediately fixes every downstream number, and why there is no cache to
invalidate. **Adding a derived field to `AppData` is almost always the wrong
fix** — the right one is a function in `stats.ts`.

### A medication is four facts, and the bar for a fifth is high

Name, optional dose text, time slots, weekday mask. That is the whole
schedule, and each part is read by something: the name is the checklist row,
the dose is the line under it, the slots are what `dueDoses` expands into, and
the mask is which days it expands on. There is deliberately no stock count, no
prescriber field, no notes — every added field is a question asked at every
add (and often at every dose) to serve a case the calendar already handles by
showing the truth. Before adding a field, name the number on Today, Calendar
or History that would move because of it. If there isn't one, the answer is no
— however reasonable it sounds in isolation. An app earns the fifteen seconds
it is given by being answerable in one tap with a glass in the other hand.

The mask is what passing that bar looks like, and it is worth reading as the
worked example. Without it a med taken five days a week produced two _missed_
days a week — a day the schedule never asked about scoring identically to a
day someone forgot — so the numbers it moves are the calendar's day marks, the
adherence share, the streak and the missed list, all four in the direction of
the truth. It also costs nothing at add time: `weekdays: null` is every day,
it is what the form starts on, and it is what every pre-v2 document reads as.

The dose is free text on purpose: the app never does arithmetic on it, so
"500 mg", "2 tablets" and "en halv på morgonen" are all equally valid, and a
structured dose model would be a form asking questions the checklist never
reads.

### The two stats rules are invariants, not preferences

Every number History shows applies both: **today never counts against you**
(windows end at yesterday; a streak gets today's credit only once today is
complete; the missed list never names today) and **a day with nothing due
says nothing** (no due doses → `share: null`, a silent day in a streak walk,
a gap in the chart rather than a zero). A change that makes an unfinished
today read as a miss, or an empty pre-history week read as 100%, is a bug even
if the code is otherwise cleaner.

### Stopping is not deleting

`endDate` is how a medication leaves the schedule: the history it earned
stays, old days still score against the schedule that existed then, and the
med can be resumed. Deletion (`removeMedication`) also sweeps the med's taps
out of every day and is reserved for the entered-by-mistake case — the UI
routes to it through a confirm dialog that says exactly this. Keep that
asymmetry: any new "remove" affordance should reach for stop first.

### Keep the derivation clock-free

`schedule.ts`, `stats.ts` and `catalog.ts` never call `new Date()`. `today`
is a parameter, supplied by `App.tsx` (which refreshes it on focus, so
midnight passing while the app is open doesn't leave a stale day — for a
medication log the stale day would be yesterday's unfinished checklist
wearing today's date). Keep it that way: it is what lets the tests pin real
dates without fake timers.

## Where new code goes

| Change                            | Goes in                                                                                                                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A new fact about a medication     | Probably nowhere — see above. If it survives that: `src/app/types.ts` (model) + `schedule.ts` (if it changes what a day owes) + `MedForm.tsx` (control) + a `migrations.ts` step |
| A new derived number or stat      | `src/app/stats.ts`, with tests in `tests/stats_test.ts`                                                                                                                          |
| A change to what a day owes       | `src/app/schedule.ts`, with tests in `tests/schedule_test.ts`                                                                                                                    |
| A change to the Medication shape  | `types.ts` + `migrations.ts` (bump `DOC_VERSION`, append a step — never edit one) + every `Medication` literal in `tests/` and `dev/`                                            |
| A catalog entry or ranking change | `src/app/data/medications.ts` (data) or `src/app/catalog.ts` (ranking), with tests in `tests/catalog_test.ts`                                                                    |
| A new screen                      | `src/app/<Name>Screen.tsx` + a tab in `src/app/BottomNav.tsx`, or a button in `src/app/TopBar.tsx` if it is an action rather than a place                                        |
| A new way to arrange doses        | A component over `DoseRow.tsx` + an ordering in `schedule.ts` — never a second write path                                                                                        |
| A new setting                     | `src/app/useAppSettings.ts` (shape + fallbacks) + a `Section` in `SettingsScreen.tsx`                                                                                            |
| A new developer-only affordance   | `src/app/dev/`, revealed behind `settings.devMode` in `SettingsScreen.tsx` — never in the persisted settings if it must not survive a reload                                     |
| A change to what the demo shows   | `src/app/dev/demoData.ts` (offsets from `today`, never fixed dates), with tests in `tests/demoData_test.ts`                                                                      |
| A new storage backend             | The framework, not here — this app only wires adapters up in `useSyncEngine.ts`                                                                                                  |
| Any user-facing string            | `src/app/i18n/en.ts`, never inline in a component                                                                                                                                |
| A shared UI primitive             | The framework, if it is domain-free; `src/app/` only if it is medication-specific                                                                                                |

## Test conventions

Tests live in `tests/` with a `_test` suffix (OSS_SPEC §20.2) and run under
Vitest in the `node` environment — they cover the pure domain modules
(`schedule`, `stats`, `catalog`, `merge`, `migrations`), which is where the
app's real logic is. No DOM, no testing-library, no mocked clock.

Run one file with `npx vitest run tests/schedule_test.ts`.

A change to the derivation without a test that pins the new behaviour to real
dates is not finished. UI changes should keep the boot smoke path working:
`npm run build && npm run preview`, add a medication, tick its dose on Today,
and check that Calendar and History move with it.

## Changelog and feature docs

`CHANGELOG.md`'s released sections are **generated** — never hand-edit them.
Every user-visible change adds a fragment under `.changes/unreleased/`:

```
.changes/unreleased/$(date +%s)-short-slug.md
---
type: Added        # Added | Changed | Fixed | Removed | Security | Deprecated
title: Short bold title
breaking: true     # optional — forces a major release
---

One sentence a user will read in the changelog.
```

A fragment for a substantial feature links to its doc under `docs/features/`
with `[Learn more](feature:<slug>)`.

## Documentation sync points

| If you change…                    | Update…                                                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `schedule.ts` or `stats.ts`       | `docs/schedule.md`, `docs/features/history.md`, and the README's Examples block if the output shape moved      |
| The `Medication` / `DayLog` shape | `docs/architecture.md`'s data shape, `docs/features/medications.md`, and a `migrations.ts` step                |
| The catalog or its ranking        | `docs/features/medications.md` (the autocomplete section) and the provenance note in `data/medications.ts`     |
| The sync engine or the merge      | `docs/sync.md`                                                                                                 |
| A `VITE_*` variable               | `docs/configuration.md`, `src/vite-env.d.ts`, the README's Configuration table, and the workflows that pass it |
| A screen's behaviour              | The matching `docs/features/*.md` and the README's Usage table                                                 |
| The navigation (nav or top bar)   | `docs/architecture.md`'s tree and the README's Usage tables                                                    |
| Module layout                     | The "Where new code goes" table above and `docs/architecture.md`                                               |
| A make target or script           | `CONTRIBUTING.md`, the README's Quick start, and this file's command list                                      |

## Parity and cross-cutting rules

- **Every string goes through `t()`.** English is the only catalog today; the
  runtime is in place so adding a language is one `loaders` entry.
- **Two themes only** — one light, one dark, plus "follow the device". The
  framework ships a dozen palettes; this app deliberately exposes none of
  them. Don't reintroduce the picker.
- **The bottom nav is the navigation.** Four tabs, no sidebar, no drawer, and
  they are _destinations_ — a fixed left-to-right order a swipe moves along
  (the framework's `useSwipeNav`). Things you do and then leave belong on the
  top bar
  instead, which is where the quick-log `+` and Settings went. A new
  _destination_ has to earn a place in an order that means something; a new
  _action_ is a top-bar button, not a tab. The `+` opens a sheet rather than a
  screen for the same reason: logging a dose must not cost you the month you
  had open on the Calendar.
- **Logging is one code path.** Today, the Calendar's day card and the
  quick-log sheet all render `DoseRow` and all write through `setDoseTaken` —
  a second way to mark a dose taken is a merge hazard and a UX fork, not a
  feature. What may differ between them is the _arrangement_ (`DoseList`
  groups by slot; `quickLogOrder` ranks by likelihood), never the row or the
  write.
- **No dependency creep.** The framework, Preact, a font, and workbox-window.
  A new runtime dependency needs a reason that the framework can't serve.

## Website staleness

The app _is_ the website (OSS_SPEC §11.2 / §11.4) — `pages.yml` builds it and
deploys `dist/`. There is no separate marketing site to drift out of date, but
the SEO surface in `index.html` and `public/` does: when the app's description
changes, update `index.html`'s title/description/OG/JSON-LD, `public/llms.txt`,
and the manifest copy in `pwa-plugin.ts` together. `make check-seo` asserts the
structure, not the wording — it will not catch a stale sentence.

## Maintenance skills

Skills live under `.agent/skills/` (OSS_SPEC §21). Each has a `SKILL.md` with
its discovery process, its source→output mapping, and a `.last-updated` marker.

| Skill             | Runs when                                                     |
| ----------------- | ------------------------------------------------------------- |
| `maintenance`     | The registry and run order for every other skill — start here |
| `write-changeset` | Any user-visible change, before opening the PR                |
| `update-docs`     | `src/app/` changed in a way a `docs/` topic describes         |
| `update-readme`   | Commands, configuration, or the feature set changed           |
