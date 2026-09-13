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

### The daily maximum

`maxPerDay` is the most doses of a medication its owner means to take in one
day — the number a prescriber or a packet gave them, recorded once instead of
carried in their head all afternoon. Null (no number given) unless someone
typed one, which is what every medication and every pre-v4 document carries.

Only the **no times at all** shape can hold one. Every other kind already
states how many doses a day owes by listing its times — a schedule's slots, a
course's slots — so a second number beside them could only disagree with them;
`normalizeMaxPerDay(max, med)` drops it for those, along with anything that is
not a whole number of at least one, and clamps at `MAX_PER_DAY_LIMIT` (24) so
a mistyped 300 cannot turn a chip into a paragraph.

`doseAllowance(med, taken)` is the arithmetic: `{ max, taken, left }`, with
`left` floored at zero so a day that went over reads `taken: 4, max: 3,
left: 0` rather than a negative remainder. `asNeededOn` carries it per entry
as `allowance` (null when the medication has no maximum), counting that day's
own taps — a maximum is a fact about one day, and the next day starts over.

### The longest stretch

`maxRun` is the other half of the same sentence — _"no more than three in a
day, and not for more than a week"_ — carried by exactly the medications that
can carry a daily maximum, and for the same reason: a medication with times of
its own is either on a schedule, which has its own `endDate`, or on a course,
which ends when you say you are done with it. Neither needs a second answer to
"how long for".

It is held in the unit it was given in (`maxRunUnit`, `"days"` or `"weeks"`),
because "two weeks" is what a person was told and "14 days" is only the
arithmetic; `maxRunDays(med)` does that arithmetic where the counting happens.
`normalizeMaxRun(run, unit, med)` applies the same rules `normalizeMaxPerDay`
does — whole numbers of at least one, clamped at `MAX_RUN_LIMIT` (99) — and
forces the unit back to `"days"` whenever there is no number, so one answer
keeps one representation.

What it counts is `runDays(data, med, day)`: the run of consecutive days,
ending at `day`, that a dose was logged on. Nothing new is stored for it — the
taps already say which days it was taken on — and two rules make it the plain
reading of _"not more than seven days in a row"_:

- **A day skipped entirely ends the stretch**, and the next dose starts a new
  one at day one. So there is no course to start and none to forget to end: a
  stretch resets itself the first day you do without.
- **The day being asked about counts, logged or not.** Start on Monday and it
  is day four on Thursday, whether or not Thursday's dose has been taken yet —
  the stretch is a span of days, and "how long have I been on this?" is asked
  before the tap as often as after it. It is the day after a gap, with the gap
  behind it, that starts over.

`runAllowance(med, days)` is the arithmetic — `{ maxDays, days, left }`, `left`
floored at zero — and `asNeededOn` carries it per entry as `run`, walked only
for a medication that has a stretch to count against.

Both are **ceilings, not schedules**, and two consequences follow. First, it
they move nothing: `dueDoses`, `dayProgress` and every figure in `stats.ts`
read exactly as they did before the numbers existed, because a dose that was
never scheduled cannot be missed. Second, they are repeated back, never
enforced — reaching either withdraws the one-tap offer in the "As needed"
panel and leaves a plainly labelled one ("Log one anyway"), because a log that
refuses to record a dose that was actually swallowed is a log that lies. The
app counts; it never decides the numbers.

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
  maxPerDay: null, // e.g. 3, for an as-needed med with no times; null = no limit
  maxRun: null, // e.g. 7 with maxRunUnit "days"; null = no limit
  maxRunUnit: "days", // "days" | "weeks"; forced to "days" when maxRun is null
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
