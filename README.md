# Nird Meds

> A local-first medication tracking PWA — enter your meds and when to take them, then log each dose with one tap. No account, no server.

[![ci](https://github.com/niclaslindstedt/meds/actions/workflows/ci.yml/badge.svg)](https://github.com/niclaslindstedt/meds/actions/workflows/ci.yml)
[![seo](https://github.com/niclaslindstedt/meds/actions/workflows/seo.yml/badge.svg)](https://github.com/niclaslindstedt/meds/actions/workflows/seo.yml)
[![pages](https://github.com/niclaslindstedt/meds/actions/workflows/pages.yml/badge.svg)](https://github.com/niclaslindstedt/meds/actions/workflows/pages.yml)
[![license](https://img.shields.io/badge/license-PolyForm--Noncommercial--1.0.0-blue.svg)](LICENSE)

## What

**Nird Meds** is a medication tracker that runs entirely in your browser, built
for the fifteen seconds a day you actually give it. You enter each medication
once — a name, an optional dose, and the times of day it is taken; the name
autocompletes from a bundled catalog of common medications, and a recognised
name offers its usual strengths as one-tap chips. From then on the app opens on
**Today**: the day's doses as a checklist grouped by time of day, cleared one
tap per dose. On a fresh install with nothing to list, it opens on the add form
instead — the one screen that is useful before there is a schedule.

Everything else is derived from those taps at read time. The **Calendar**
paints each day behind its number — filled when every dose landed, hollow while
a day is part done, a warning tint on days that owed doses and got none — and
reopens any past day's checklist so a forgotten evening can be logged after the
fact. **History** turns the log into numbers: adherence over the last 7 and 30
days, your current streak, a one-column-per-day chart that makes the gaps
visible, per-medication adherence, and the recent missed doses by name. Today
in progress never counts against you, and days from before a medication
existed count as silence rather than as failures.

The focus is simplicity over features on purpose. A medication is a name, a
dose, its time slots and its days — no stock counter, no prescriber field, no
notification engine — because the cost of every added question is paid at
every dose, and the app's whole job is to make "did I take it?" a glance and
"I just did" one tap.

It is built on [`@niclaslindstedt/oss-framework`](https://github.com/niclaslindstedt/oss-framework),
the shared React/Preact surface behind the sibling
[notes](https://github.com/niclaslindstedt/notes),
[contacts](https://github.com/niclaslindstedt/contacts) and
[cycle](https://github.com/niclaslindstedt/period) apps — same storage
adapters, same theme engine, same PWA update lifecycle.

## Why

What you take is health data, and most apps in this category are an account
wrapped around a server you cannot inspect.

This one has no account and no server. Your medications and your log live in
your browser's localStorage. If you want them on more than one device, you
connect **your own** Dropbox or Google Drive and the app keeps a copy there —
in a folder you can open, in a JSON file you can read. Nothing else leaves the
device: no analytics, no telemetry, no third-party requests at runtime. Even
the medication autocomplete is a bundled list searched locally, never a lookup
service — what you type into a medication field is exactly the byte that must
not reach a server.

## Prerequisites

- Node.js ≥ 22 (CI pins 24 — see `.nvmrc`), npm ≥ 10
- A GitHub personal access token with `read:packages` in `~/.npmrc` — the
  `@niclaslindstedt/oss-framework` dependency resolves from GitHub Packages

## Install

```sh
npm config set //npm.pkg.github.com/:_authToken <your-token>
git clone https://github.com/niclaslindstedt/meds.git
cd meds
npm install
```

Or just open the hosted app at
[meds.niclaslindstedt.se](https://meds.niclaslindstedt.se/) and install it
from your browser's "Add to Home Screen" / install prompt — it is a PWA and
works fully offline.

## Quick start

```sh
npm run dev
```

Open the printed URL. The app boots on the add form: type a medication's name
(it autocompletes), tap a dose chip if one fits, adjust the time if it isn't a
morning med, leave **Every day** on unless you skip some, and press **Save
medication**. You land on **Today** with the dose listed — tap the row and it
is logged. Add the rest of your meds from the **Meds** tab; from then on,
opening the app is Today's checklist, and the **+** in the top right logs a
dose from wherever you happen to be.

To try the production build the way it deploys:

```sh
npm run build && npm run preview
```

## Usage

Four tabs, on a bottom bar — swipe left or right to move between them, and the
screen slides in from the side it lives on. The one exception is the month
grid, which takes the swipe for itself and pages the month:

| Tab          | What it does                                                                                                                                                                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Today**    | The day's doses as a checklist grouped by time of day. The whole row is the tap target; the header counts you through the day and flips to "All done" when the last dose is ticked.                                                                   |
| **Calendar** | A month at a glance: filled days where every dose landed, hollow part-done days, a warning tint on missed days. Tap any day to open its checklist below the grid — this is where a forgotten dose is logged after the fact. Pages by swipe or arrows. |
| **History**  | Adherence over the last 7 and 30 days, the current streak, a per-day chart that makes gaps visible, per-medication adherence bars, and the recent missed doses by name and slot.                                                                      |
| **Meds**     | The medication list. Add a new one, edit in place, **stop** a med you are done with (the history stays, and it can be resumed), or delete one entered by mistake.                                                                                     |

…and two buttons on the top bar, for the two things you do and then leave:

| Button | What it does                                                                                                                                                                                                      |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **+**  | Log a dose, from any screen: a sheet of today's doses with the likeliest first and what you already took greyed at the bottom. Its footer leads to the add form when a new medication is what you actually meant. |
| **⚙**  | Settings: theme, week start, cloud sync, backup / restore / delete, and the build's version.                                                                                                                      |

## Configuration

The app needs no configuration to run. Two build-time variables switch cloud
sync on; both are public OAuth client identifiers (the flows are PKCE, so there
is no secret to protect), and leaving either unset simply hides that provider:

| Variable                  | Effect                                                         |
| ------------------------- | -------------------------------------------------------------- |
| `VITE_DROPBOX_APP_KEY`    | Enables the Dropbox backend.                                   |
| `VITE_GOOGLE_CLIENT_ID`   | Enables the Google Drive backend.                              |
| `VITE_DROPBOX_APP_FOLDER` | Folder name the document is filed under (default `nird-meds`). |
| `VITE_GDRIVE_APP_FOLDER`  | Folder name in My Drive (default `nird-meds`).                 |
| `VITE_BASE`               | Deploy base path (default `/`).                                |

See [`docs/configuration.md`](docs/configuration.md) for the details.

## Examples

Log a day and read the numbers that come out of it — the derivation is pure,
so it runs anywhere, no DOM required:

```ts
import { doseKey, emptyDoc } from "./src/app/types.ts";
import { dayProgress } from "./src/app/schedule.ts";
import { adherenceLastDays, streaks } from "./src/app/stats.ts";

const doc = emptyDoc();
doc.medications["m1"] = {
  id: "m1",
  name: "Levaxin",
  dose: "50 µg",
  times: ["08:00"],
  startDate: "2026-03-01",
  endDate: null,
  updatedAt: "2026-03-01T08:00:00.000Z",
};
for (const date of ["2026-03-01", "2026-03-02", "2026-03-03"]) {
  doc.days[date] = {
    date,
    taken: { [doseKey("m1", "08:00")]: `${date}T08:05:00.000Z` },
    updatedAt: `${date}T08:05:00.000Z`,
  };
}

dayProgress(doc, "2026-03-02"); // → { due: 1, taken: 1, status: "full" }
adherenceLastDays(doc, "2026-03-04", 3); // → { taken: 3, due: 3, share: 1 }
streaks(doc, "2026-03-04"); // → { current: 3, longest: 3 }
```

Every number is a function of the document and `today`, which is always passed
in — nothing here reads the clock. That is also why an unfinished today never
drags a number down: the windows simply end at yesterday.

## Troubleshooting

| Symptom                                     | Fix                                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `npm install` fails with `401 Unauthorized` | The framework comes from GitHub Packages — see Prerequisites.                                                                 |
| A day is marked missed that shouldn't be    | Open it from **Calendar** and tick the doses — the history recomputes instantly. A day before the med was added owes nothing. |
| Today lists a med you no longer take        | **Meds** → the pencil → **Stop this medication**. The schedule ends, the history stays.                                       |
| Cloud sync shows "Reconnect needed"         | The provider's session lapsed. Tap the sync glyph → Reconnect.                                                                |

More in [`docs/troubleshooting.md`](docs/troubleshooting.md).

## Documentation

- [Getting started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Architecture](docs/architecture.md)
- [The schedule and the stats](docs/schedule.md) — what is due, what counts, and when
- [Sync](docs/sync.md)
- [Troubleshooting](docs/troubleshooting.md)
- [`AGENTS.md`](AGENTS.md) — conventions for humans and coding agents

## Contributing

Bugs and feature requests go to
[Issues](https://github.com/niclaslindstedt/meds/issues); open-ended
questions to [Discussions](https://github.com/niclaslindstedt/meds/discussions).
See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow, and
[`SECURITY.md`](SECURITY.md) for private vulnerability reporting.

## License

[PolyForm Noncommercial 1.0.0](LICENSE) © Niclas Lindstedt.

---

**This app is not a medical device.** It is a logbook of what you told it you
took. It does not check doses or interactions, its medication catalog is a
typing aid rather than a formulary, and changes to what you take belong with
your prescriber.
