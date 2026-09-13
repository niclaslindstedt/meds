# The schedule and the stats

Everything the Calendar paints and every number History shows is derived at
read time from two maps — the medications and the day logs. Nothing about
adherence is stored, so mending a day from three weeks ago instantly fixes
every downstream figure. The derivation lives in `src/app/schedule.ts` and
`src/app/stats.ts`, both pure and clock-free: `today` is always a parameter.

## What a day owes

A medication carries the times of day it is taken (`times`, one dose per
slot), the weekdays it is taken on (`weekdays`, or null for every day),
whether it is on a schedule at all (`asNeeded`), and the span of days its
schedule covers: from `startDate` — the day it was added — to `endDate`,
which is null while the med is current and set to the day before it was
stopped otherwise.

`dueDoses(data, day)` expands that into the day's checklist: one dose per
active med per slot, sorted by time then name. The four boundary rules do the
quiet work:

- **A day before a med started owes none of its doses.** Adding a medication
  today does not turn last month red.
- **A day after a med stopped owes none either.** Stopping ends the schedule
  without rewriting the history the med earned while it ran.
- **A day off the weekday mask owes none either.** A med taken every day
  except Tuesday and Thursday owes nothing on a Tuesday — which is a day with
  nothing due, not a day you missed.
- **A day owes an as-needed med nothing unless a course covers it.** The days
  nobody reached for the painkiller are silence, not misses.

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

### Taken when needed

`asNeeded` says a medication has no schedule to be behind on. It comes in two
shapes, and they are two different answers to "what puts this on Today":

- **No times at all** (`times: []`) — a painkiller. It is never due, on any
  day. Each tap is filed under the minute it happened, so its dose keys carry
  a wall-clock time rather than a slot, and the doses it logs count towards
  "doses taken" without ever creating something to have missed. Logging one
  sticks it to that day and no further: a headache is not a schedule.
- **Times, taken in stretches** — a mucolytic at 08:00, 12:00 and 18:00 for
  the week a cold lasts. Those stretches are its `courses`, and a day its
  courses cover owes all of its times, exactly like a scheduled medication's.
  That is the point of starting one: the times land on Today the moment you
  say you are taking it and stay there every day until you say you are done,
  because the course does nothing unless it is kept up — and two of three
  logged reads as two of three rather than as a clean day.

`asNeededDue(med, day)` answers the second bullet, with one exception: the day
a course _begins_, it begins partway through. A course started at ten in the
morning owes the midday and the evening dose and not the eight o'clock one —
that slot passed before the medication was on the list at all, and nobody can
be behind on a dose they had not yet decided to take. So the first day's slots
run from `course.fromTime`; every day after it owes them whole.

One slot always survives that cut: a course started _after_ the day's last
slot owes that last one. Reaching for a medication at nine in the evening when
its last dose was at six is what taking a dose and then going to log it looks
like, so the row is there to tick rather than the day quietly owing nothing.

A course is `{ from, fromTime, to }`, with `to` null while it is still running
and `fromTime` the minute of `from` it started at (null for an imported course
with no such claim to make, whose first day is then owed whole).
`startCourse` opens one from a given day and minute (a no-op on a medication
already running, so a double tap cannot open two), and `endCourse` closes the
running one **yesterday** — the same choice stopping a medication makes, and for the
same reason: its remaining doses leave today's checklist the moment you say
you are done, and an unfinished today must not turn into a missed day at
midnight. A course ended on the day it began leaves no span at all. Both are
pure: the moment is a parameter, like `today`.

A _list_ of courses rather than one span, because stopping must not rewrite
history: a cold in March and another in November are two courses, and re-using
one start date for the second would quietly un-score the first.

`asNeededOn(data, day)` is the other half — every as-needed medication whose
span covers a day, with the course covering that day (or null) and, for a
medication with no times, the doses already logged. The quick-log sheet shows
all of them, because that is where an as-needed medication is deliberately
reached for; Today and the Calendar's day card show only the entries that
already have a dose logged, so Today stays the list of what the day actually
asks of you.

A medication being as-needed carries no weekday mask: which days you need it
is not a fact about the week, so `weekdays` is forced to null (in the form and
again in `migrations.ts`) and one schedule keeps one representation.

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
  asNeeded: false, // true = owes nothing except over a course (below)
  courses: [], // e.g. [{ from: "2026-03-05", fromTime: "10:00", to: null }]
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
