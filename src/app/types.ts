// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The app's data model: the medications you take, and one log per day of the
// doses you actually took. Everything the calendar, the history and the stats
// draw is derived from these two maps at read time — nothing about adherence
// is stored, so correcting a day re-derives every downstream number (see
// `stats.ts`).
//
// A medication is deliberately few facts: a name, an optional dose ("20 mg",
// free text — the app never does arithmetic on it), the times of day it is
// taken, the weekdays it is taken on, and whether it is taken to a schedule
// at all. The focus of the whole app is cutting the seconds spent logging,
// and every further field would be a question asked at every dose for
// nothing. There is still no stock counter, no prescriber and no notes.
//
// The weekday mask is the one schedule fact beyond the slots, and it is here
// because it moves numbers every screen shows. A med taken every day *except*
// Tuesday and Thursday used to leave two red days a week on the calendar and
// two holes a week in the adherence figure, because a day you were never
// meant to take it and a day you forgot were the same day to the derivation.
// With the mask a Tuesday owes nothing — and a day with nothing due says
// nothing (see `stats.ts`), which is the truthful reading. It costs nothing
// at add time either: "every day" is the default, and the day pills only
// appear if you turn it off.
//
// `asNeeded` is here for the same reason and pays for itself the same way.
// Paracetamol has no schedule to be behind on; a mucolytic taken at eight,
// twelve and six is on a schedule only on the days you are taking it at all.
// Given only the fields above, both had to be entered as daily medications —
// and then every day nobody needed them was a *missed* day: red on the
// calendar, a hole in the adherence figure, a broken streak, a row in the
// missed list. Exactly the pathology the weekday mask was added to fix, in a
// shape no mask can express, because which days you need it is not a fact
// about the week.
//
// So an as-needed medication sits out of the way — on the Meds tab and behind
// the quick-log `+`, not on Today — until you reach for it, and the two ways
// of reaching for it are the two shapes it comes in:
//
//   - **No times of its own** (a painkiller). You log a dose, and that dose
//     *is* the whole record. It sticks to the day it was taken on and is gone
//     tomorrow, because a headache is not a schedule.
//   - **Times, taken in stretches** (a mucolytic at 8, 12 and 18 for the week
//     a cold lasts). You start it when the cold starts, and from then on its
//     times are on Today every day — which is the point, since the course
//     does nothing unless it is kept up — until you say you are done with it.
//     Those stretches are `courses`, and they are what a day consults.
//
// Either way the days nobody needed it owe nothing, and the four numbers move
// to the truth.
//
// `maxPerDay` is the one fact that is not part of any schedule, and it is
// here for the medication with no times at all — the only kind whose doses
// are unbounded, because each tap invents its own slot. "No more than three
// in a day" is a number its owner was given and then had to hold in their
// head all afternoon, while the app sat on the one record that answers it.
// So it is recorded once and counted against the day's taps, and the count
// ("2 of 3 today") is read at the moment it is asked: the tap. It moves no
// number on Today, the Calendar or History, and deliberately so — a dose you
// were never scheduled to take cannot be missed, and a cap is not a schedule.
//
// `maxRun` is the other half of the same sentence — "no more than three in a
// day, and not for more than a week" — and it is the same kind of fact: a
// ceiling its owner was given, for the same medication, read at the same
// moment. Held in the unit it was said in (`maxRunUnit`, days or weeks),
// because "two weeks" is what a person was told and "14 days" is only the
// arithmetic. What it counts is the *stretch* you are on: the run of
// consecutive days ending today that a dose was logged on (see `runDays` in
// `schedule.ts`). Nothing new is stored for it — the taps already say which
// days you took it on — and a day skipped entirely ends a stretch and starts
// the next, which is both the plain reading of "not more than seven days in
// a row" and the forgiving one.
//
// Both are ceilings the app repeats back, never ones it enforces: reaching
// one withdraws the one-tap offer and leaves a deliberate one, because a log
// that refuses to record a dose that was actually swallowed is a log that
// lies, and the truth of the record outranks the ceiling. What the app must
// never do is decide the numbers — they belong to the prescriber, and these
// fields only remember them.
//
// A day's log is keyed by *dose* — `medId@HH:MM` — so "taken" is a claim about
// one medication at one slot, and a day with two slots half done is exactly
// half done rather than ambiguously "logged".
//
// It holds a second claim about a dose, and only one further one: that it was
// deliberately **skipped**. Until it did, an absent dose had to mean two
// things at once — the evening you forgot, and the evening you decided
// against — and the derivation could only read the first, so a considered
// decision scored as a lapse: red on the calendar, a hole in the adherence
// figure, a broken streak, a row in the missed list. That is the same
// pathology the weekday mask and the as-needed flag were added to fix, in the
// one shape neither can express, because "not this evening" is a fact about
// that evening and nothing else.
//
// So it passes the bar those two passed, and in the same four places: a
// skipped dose leaves the day's arithmetic, and the day mark, the share, the
// streak and the missed list all move to the truth. It leaves it rather than
// counting as taken — a skip is not credit, it is the day no longer asking —
// which is exactly how a masked-off Tuesday is already treated. A day whose
// every dose was set aside owes nothing, and a day with nothing due says
// nothing (see `stats.ts`).
//
// It costs nothing at log time either, which is the other half of that bar:
// the row is already on the screen and already under a thumb, so the decision
// is a long press on it (a right-click, on a pointer that has one) rather
// than a question anybody is asked.
//
// Taken and skipped are the same claim's two answers, so the two maps are
// disjoint: one wins the dose and the other drops it (see `setDoseTaken` and
// `setDoseSkipped`). And only a dose a day actually *owes* can be set aside —
// there is nothing to decline about a painkiller nobody scheduled.

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";

/** One stretch an as-needed medication is being taken over: the day it was
 *  started, the minute of that day it was started at, and the last day it was
 *  due — null while it is still running, so its times stay on Today until
 *  someone says otherwise.
 *
 *  `fromTime` exists because a course begins partway through its first day. A
 *  mucolytic at 08:00, 12:00 and 18:00 that you reach for at ten in the
 *  morning owes the midday and the evening dose and not the morning one you
 *  slept through before it was ever on the list — so that day's slots run
 *  from this minute (see `asNeededDue`). Zero-padded "HH:MM" like every other
 *  slot, or null for a course that has no such claim to make: an imported one,
 *  or one whose stored minute could not be read. */
export type Course = {
  from: DayKey;
  fromTime: string | null;
  to: DayKey | null;
};

/** How a `maxRun` was said: "for a week" and "for seven days" are the same
 *  ceiling, and the app keeps whichever one its owner used. */
export type RunUnit = "days" | "weeks";

/** One medication on the schedule. */
export type Medication = {
  /** Stable random id — the half of a dose key that survives a rename. */
  id: string;
  name: string;
  /** Free text ("20 mg", "2 tablets"), or "" when none was given. Display
   *  only — the app never parses it. */
  dose: string;
  /** The times of day a dose is due, as zero-padded "HH:MM", sorted. Times
   *  rather than counts because the Today screen groups doses by slot —
   *  "morning meds" is a list you clear in one glance.
   *
   *  At least one for a scheduled medication. Empty only when `asNeeded`, for
   *  the med that has no times of its own at all: a painkiller is taken when
   *  it is taken, and each tap is filed under the minute it happened (see
   *  `asNeededOn` in `schedule.ts`). */
  times: string[];
  /** Whether this medication is taken *when needed* rather than to a
   *  schedule. An as-needed medication is never behind: no day owes its doses
   *  until one of them is logged, so the calendar, the adherence share, the
   *  streak and the missed list all pass over the days nobody needed it.
   *
   *  It still keeps its `times` when it has them — a medication taken at
   *  08:00, 12:00 and 18:00 for the week a cold lasts is an as-needed
   *  medication with three slots, and the days it owes them are the days its
   *  `courses` cover. False for every pre-v3 document, which is what those
   *  medications already meant. */
  asNeeded: boolean;
  /** The stretches this medication is actually being taken over, oldest
   *  first. Only an as-needed medication *with* times has any: a painkiller
   *  has no stretch to be on, and a scheduled medication's stretch is its own
   *  start/end span.
   *
   *  A list rather than one open span, because the point of stopping is that
   *  the history stays: a cold in March and another in November are two
   *  courses, and re-using one `startDate` for the second would quietly
   *  un-score the first. */
  courses: Course[];
  /** The most doses of this medication the person taking it means to take in
   *  one day, or null when no such number was given — which is what every
   *  medication carries unless someone typed one, and what every pre-v4
   *  document reads as.
   *
   *  Only an as-needed medication with *no* times of its own can hold one
   *  (see `normalizeMaxPerDay`): every other kind already states how many
   *  doses a day owes by listing them, and a second number saying the same
   *  thing is a number that can disagree with itself.
   *
   *  Recorded, not enforced — the app counts the day's taps against it and
   *  says where they stand. It is the user's own ceiling, not the app's
   *  opinion. */
  maxPerDay: number | null;
  /** The longest stretch of days in a row this medication is meant to be
   *  taken over, in the unit it was given in (`maxRunUnit`) — or null when no
   *  such number was given, which is what every pre-v5 document carries.
   *
   *  Carried by exactly the medications that can carry `maxPerDay`, and for
   *  the same reason (see `normalizeMaxRun`): a medication with times of its
   *  own is either on a schedule or on a course, and both of those already
   *  say when they end.
   *
   *  Counted against the run of consecutive days a dose was logged on, so it
   *  needs nothing stored and resets itself the first day you do without.
   *  Recorded, not enforced. */
  maxRun: number | null;
  /** The unit `maxRun` was given in. Forced to "days" whenever `maxRun` is
   *  null, so one answer keeps one representation and two devices holding the
   *  same medication serialize to the same bytes. */
  maxRunUnit: RunUnit;
  /** The weekdays doses are due on, in `Date.getDay()` numbering (0 = Sunday),
   *  sorted and deduplicated — or null for every day, which is what an
   *  unmasked medication and every pre-v2 document carry. Never an empty
   *  array and never all seven: both of those are "every day", and one
   *  schedule gets one representation (see `normalizeWeekdays`). */
  weekdays: number[] | null;
  /** The first day doses are due. Set to the day the med was added, so the
   *  history never scores days from before the schedule existed. */
  startDate: DayKey;
  /** The last day doses were due, or null while the med is current. Stopping a
   *  med sets this instead of deleting it, so the history it earned stays. */
  endDate: DayKey | null;
  /** ISO timestamp of the last edit — the tiebreak when two devices edited the
   *  same medication between syncs. */
  updatedAt: string;
};

/** One day's log: which due doses were taken, which were set aside, and
 *  when. */
export type DayLog = {
  date: DayKey;
  /** `doseKey` → ISO timestamp of the tap that logged it. */
  taken: Record<string, string>;
  /** `doseKey` → ISO timestamp of the moment it was set aside. A dose in here
   *  is one its owner decided against, and the day stops asking about it: it
   *  leaves the count both sides (see `countedDoses` in `schedule.ts`), so it
   *  neither earns credit nor reads as a lapse.
   *
   *  Never a key `taken` also holds — the two are one claim's two answers —
   *  and empty for every pre-v6 document, which had no way to say this. */
  skipped: Record<string, string>;
  /** ISO timestamp of the last edit to this day. */
  updatedAt: string;
};

/** The persisted document — the whole app state, one JSON blob. */
export type AppData = {
  /** Schema version; bumped by a migration step in `migrations.ts`. */
  version: number;
  medications: Record<string, Medication>;
  days: Record<DayKey, DayLog>;
};

/** The current document schema version. v1 is the first published shape; v2
 *  added the medication weekday mask; v3 as-needed medications — the flag and
 *  the courses together; v4 the daily maximum; v5 the longest stretch; v6 the
 *  day log's skipped doses. */
export const DOC_VERSION = 6;

/** The document a first run starts from. */
export function emptyDoc(): AppData {
  return { version: DOC_VERSION, medications: {}, days: {} };
}

/** The key one dose of one medication logs under. The time is part of the key
 *  so a morning dose and an evening dose of the same med are two claims. */
export function doseKey(medId: string, time: string): string {
  return `${medId}@${time}`;
}

/** A random id for a new medication. `crypto.randomUUID` where the platform
 *  has it (every browser this app targets), a timestamp-random fallback for
 *  the rest — collisions only matter within one person's med list. */
export function newMedicationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `med-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Every medication, current first, then by name — the order the Meds screen
 *  lists them in. Stopped meds sort after current ones so the working list is
 *  never below the archive. */
export function sortedMedications(data: AppData): Medication[] {
  return Object.values(data.medications).sort((a, b) => {
    const aStopped = a.endDate !== null ? 1 : 0;
    const bStopped = b.endDate !== null ? 1 : 0;
    if (aStopped !== bStopped) return aStopped - bStopped;
    return a.name.localeCompare(b.name);
  });
}

/** The medications still on the schedule today. */
export function activeMedications(data: AppData): Medication[] {
  return sortedMedications(data).filter((m) => m.endDate === null);
}

/** A day's log, or an empty one when nothing was logged that day. */
export function dayLog(data: AppData, day: DayKey): DayLog {
  return data.days[day] ?? { date: day, taken: {}, skipped: {}, updatedAt: "" };
}
