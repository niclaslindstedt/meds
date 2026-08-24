# Getting started

## Run it

The app is a static site — there is nothing to provision, no database, no
account.

```sh
npm install     # needs a GitHub Packages token, see below
npm run dev
```

Open the printed URL. Everything you log is written to your browser's
localStorage under the `meds:doc` key and nothing else happens: no request
leaves the page until you connect a cloud backend yourself.

### The GitHub Packages token

`@niclaslindstedt/oss-framework` is published to GitHub Packages, which
requires authentication even to read a public package. Create a personal
access token with the `read:packages` scope and tell npm about it once:

```sh
npm config set //npm.pkg.github.com/:_authToken <your-token>
```

CI does the same thing with the workflow's own `GITHUB_TOKEN`, and Claude Code
web sessions do it from `.claude/hooks/session-start.sh`.

## Add your first medication

With no medications yet, the app opens on the add form. (Once there is a
schedule to show, it opens on **Today** instead — the form is always a tap
away on the **+** in the top right.)

1. Type the **name**. It autocompletes from a bundled catalog of common
   medications — tap a suggestion and the name fills in. An unlisted name is
   typed by hand and works exactly the same; nothing is validated against the
   catalog, and nothing you type leaves the device.
2. Optionally add the **dose**. A recognised name shows its common strengths
   as chips under the field — one tap fills it. The dose is free text: the
   app never does arithmetic on it, it is the line printed under the name on
   the checklist.
3. Set **when to take it**. One slot per dose, defaulting to a morning slot —
   a med taken morning and evening gets two slots via **Add a time**.
4. Press **Save medication**. You land on **Today** with the dose listed.

## Log a dose

Tap the row. That is the whole flow — the row fills in, the header counts up,
and when the last dose is ticked the header says **All done for today**.
Tapping a ticked row again unticks it.

A forgotten day is mended from **Calendar**: tap the day, and its checklist
opens below the grid with the same rows Today shows.

## Read the history

**History** fills in as the log does: adherence over the last 7 and 30 days,
your current streak, a chart with one column per day (the notches are the
missed days), per-medication adherence, and the recent missed doses by name.
Two rules keep the numbers honest — an unfinished today never counts against
you, and days from before a medication existed count as silence, not as
failures. See [`schedule.md`](schedule.md).

## Install it as an app

The production build is an installable PWA that works fully offline:

```sh
npm run build && npm run preview
```

Open the printed URL and use the browser's install prompt (or Safari's
Share → Add to Home Screen on iOS). The hosted app at
[meds.niclaslindstedt.se](https://meds.niclaslindstedt.se/) installs the same
way. Updates download in the background and apply when you accept the
in-app prompt — never mid-use.
