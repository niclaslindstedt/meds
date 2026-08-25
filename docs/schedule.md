# The schedule and the stats

Everything the Calendar paints and every number History shows is derived at
read time from two maps — the medications and the day logs. Nothing about
adherence is stored, so mending a day from three weeks ago instantly fixes
every downstream figure. The derivation lives in `src/app/schedule.ts` and
`src/app/stats.ts`, both pure and clock-free: `today` is always a parameter.

## What a day owes

A medication carries the times of day it is taken (`times`, one dose per
slot), the weekdays it is taken on (`weekdays`, or null for every day), and
the span of days its schedule covers: from `startDate` — the day it was added
— to `endDate`, which is null while the med is current and set to the day
before it was stopped otherwise.

`dueDoses(data, day)` expands that into the day's checklist: one dose per
active med per slot, sorted by time then name. The three boundary rules do
the quiet work:

- **A day before a med started owes none of its doses.** Adding a medication
  today does not turn last month red.
- **A day after a med stopped owes none either.** Stopping ends the schedule
  without rewriting the history the med earned while it ran.
- **A day off the weekday mask owes none either.** A med taken every day
  except Tuesday and Thursday owes nothing on a Tuesday — which is a day with
  nothing due, not a day you missed.

### The weekday mask

`weekdays` is a sorted list of `Date.getDay()` numbers (0 = Sunday), or null
for every day. Null is the only way to say "every day": both an empty
selection and all seven days normalise back to it (`normalizeWeekdays`), so
one schedule has one representation and two devices holding it serialize to
the same bytes. Every document written before schema v2 has no `weekdays`
field at all, which reads as null — the schedule those documents already
described.

The mask earns its place through _a day with nothing due says nothing_
(below). Without it, a med you take five days a week left two red days a week
on the calendar and two holes a week in the adherence figure: a day you were
never meant to take it and a day you forgot were the same day to the
derivation. With it, the off day is silence — no gap in a streak, no zero in
the chart, and nothing in the missed list.

A dose is identified by `medId@HH:MM`, and a day's log maps those keys to the
timestamps they were ticked at. Editing a slot from 08:00 to 09:00 therefore
orphans old taps at 08:00 — those days now owe the new slot — which is the
honest reading: the schedule changed, and the record says what actually
happened under the old one.

## How a day is judged

`dayProgress(data, day)` counts taken against due and answers in one word:
`none` (nothing was due), `full`, `partial`, or `missed` (due and nothing
taken). The counts never consult the clock — whether an unfinished day is
"missed" or merely "still open" is the caller's call, and the Calendar makes
it with `today` in hand: today and future days wear the hollow "still open"
mark whenever anything remains, and only finished days can be painted missed.

## The two rules every number applies

**Today never counts against you.** Adherence windows end at yesterday; the
current streak takes today's credit only once today is complete and gives it
grace until then; the missed-dose list never names today. An unfinished day
is a day in progress, not a failure — and the app must never scold someone at
8 am for the evening dose they haven't reached yet.

**A day with nothing due says nothing.** No due doses means `share: null`,
not 100% and not 0%: the day has no claim to make. Such days are gaps in the
adherence chart rather than zeroes, and in a streak walk they are stepped
over without counting — a weekend before your first medication existed is not
two days of perfect adherence, and it does not break a streak either.

## The numbers History shows

| Figure           | Source              | Definition                                                                    |
| ---------------- | ------------------- | ----------------------------------------------------------------------------- |
| Last 7 / 30 days | `adherenceLastDays` | Doses taken over doses due across the last N _finished_ days.                 |
| Current streak   | `streaks`           | Consecutive full days ending at yesterday — or today, once today is complete. |
| Doses taken      | `totalTaken`        | Every tap ever logged.                                                        |
| The daily chart  | `dailyShares`       | One point per finished day: taken/due, null where nothing was due.            |
| By medication    | `medAdherence`      | The same window, scored against only the days that med was scheduled.         |
| Missed doses     | `missedDoses`       | Every due-but-unlogged dose in the last two weeks, newest first.              |

The percentage formatting has its own honesty rule (`adherencePercent` in
`format.ts`): floored to a whole percent, `100%` printed only for a genuinely
perfect share, and `<1%` rather than `0%` for a small-but-real one.

## Worked example

```ts
import { doseKey, emptyDoc } from "../src/app/types.ts";
import { dayProgress, dueDoses } from "../src/app/schedule.ts";
import { adherenceLastDays, streaks } from "../src/app/stats.ts";

const doc = emptyDoc();
doc.medications["m1"] = {
  id: "m1",
  name: "Metformin",
  dose: "500 mg",
  times: ["08:00", "20:00"],
  weekdays: null, // every day; e.g. [1, 3, 5] for Mon/Wed/Fri
  startDate: "2026-03-02",
  endDate: null,
  updatedAt: "2026-03-02T08:00:00.000Z",
};
doc.days["2026-03-02"] = {
  date: "2026-03-02",
  taken: { [doseKey("m1", "08:00")]: "2026-03-02T08:04:00.000Z" },
  updatedAt: "2026-03-02T08:04:00.000Z",
};

dueDoses(doc, "2026-03-01"); // → []            before the schedule
dayProgress(doc, "2026-03-02"); // → { due: 2, taken: 1, status: "partial" }
adherenceLastDays(doc, "2026-03-03", 7); // → { taken: 1, due: 2, share: 0.5 }
streaks(doc, "2026-03-03"); // → { current: 0, longest: 0 }
```

The March 1st the window covers contributes nothing — the med did not exist —
and the half-done March 2nd is what breaks the streak, not the empty days
before it.
