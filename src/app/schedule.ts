// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// What is due when. The document stores medications and taps; this module
// derives the schedule — which doses a given day owes, and how far through
// them the log says you are. Pure and total: same inputs, same output, no
// clock, no storage. The clock stays in the callers (`App.tsx` owns "today"),
// so every function here is trivially testable and two screens asking about
// the same day cannot disagree.

import {
  addDays,
  parseDayKey,
  type DayKey,
} from "@niclaslindstedt/oss-framework/calendar";

import {
  doseKey,
  sortedMedications,
  type AppData,
  type Course,
  type DayLog,
  type Medication,
  type RunUnit,
} from "./types.ts";

/** One dose a day owes: the medication, the slot, and the key the log files
 *  it under. `takenAt` is the tap that cleared it, or null while it stands. */
export type Dose = {
  med: Medication;
  time: string;
  key: string;
  takenAt: string | null;
};

/** The weekday a `DayKey` falls on, in `Date.getDay()` numbering (0 = Sunday)
 *  — the numbering the week-start setting and `Intl` both speak. Read in UTC
 *  from the key's own components, so it is the same answer in every timezone
 *  and, like everything else here, involves no clock. -1 for a string that
 *  isn't a day, which therefore matches no weekday mask. */
export function weekdayOf(day: DayKey): number {
  const parts = parseDayKey(day);
  if (!parts) return -1;
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

/** Normalise a weekday mask on the way into the document: whole numbers 0–6
 *  only, deduplicated, sorted — and null whenever the answer is "every day".
 *
 *  Both an empty selection and all seven days collapse to null on purpose: a
 *  medication with no days is not a schedule, and "all seven" is the same
 *  schedule as no mask at all. One schedule, one representation — which is
 *  what lets `activeOn` decide with a null check and lets two devices holding
 *  the same schedule serialize to the same bytes. */
export function normalizeWeekdays(
  weekdays: readonly number[] | null | undefined,
): number[] | null {
  if (!weekdays) return null;
  const days = [
    ...new Set(weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)),
  ].sort((a, b) => a - b);
  return days.length === 0 || days.length === 7 ? null : days;
}

/** Whether a medication's mask covers a day's weekday. A null mask is every
 *  day, which is what an unmasked medication carries. */
export function onWeekday(med: Medication, day: DayKey): boolean {
  return med.weekdays === null || med.weekdays.includes(weekdayOf(day));
}

/** Whether a medication's schedule covers a day: inside its start/end span,
 *  and on one of its weekdays. `DayKey` is `YYYY-MM-DD`, so plain string
 *  comparison is date comparison.
 *
 *  A masked-off day owes nothing rather than owing doses nobody took, which
 *  is the whole point of the mask: the calendar leaves it blank and the
 *  adherence figure passes over it (see `stats.ts`), instead of reading a
 *  Tuesday off as a Tuesday forgotten. */
export function activeOn(med: Medication, day: DayKey): boolean {
  if (day < med.startDate) return false;
  if (med.endDate !== null && day > med.endDate) return false;
  // An as-needed medication carries no mask — which days you need it is not a
  // fact about the week — and what a covered day owes it is `asNeededDue`'s
  // question, not this one's.
  return med.asNeeded || onWeekday(med, day);
}

/** One dose of one medication at one slot, in the shape every logging control
 *  speaks. The slot is a scheduled time for a scheduled medication, and the
 *  minute the tap happened for an as-needed one with no times of its own. */
export function doseFor(
  med: Medication,
  time: string,
  takenAt: string | null = null,
): Dose {
  return { med, time, key: doseKey(med.id, time), takenAt };
}

/** Normalise a medication's courses on the way into the document: real day
 *  spans only, oldest first — and none at all for a medication that cannot be
 *  on one (a scheduled medication, or an as-needed one with no times, whose
 *  doses are each their own record).
 *
 *  A course whose end fell before its start is dropped rather than kept as an
 *  empty span: that is a course started and ended the same day, which is a
 *  course nobody was ever on. */
export function normalizeCourses(
  courses: readonly Course[] | null | undefined,
  med: Pick<Medication, "asNeeded" | "times">,
): Course[] {
  if (!courses || !med.asNeeded || med.times.length === 0) return [];
  return courses
    .filter((c) => c.to === null || c.to >= c.from)
    .map((c) => ({
      from: c.from,
      // A start minute that isn't a time of day is no claim at all, which is
      // what null means: the first day owes every slot, as the days after it
      // do.
      fromTime:
        c.fromTime !== null && isValidTime(c.fromTime) ? c.fromTime : null,
      to: c.to,
    }))
    .sort((a, b) => a.from.localeCompare(b.from));
}

/** The largest daily maximum the document will hold. Past a couple of dozen
 *  the number has stopped being a limit anyone is counting against. */
export const MAX_PER_DAY_LIMIT = 24;

/** The most doses a day this medication is meant to take, normalised on the
 *  way into the document: a whole number of at least one, or null for "no
 *  number was given".
 *
 *  Only an as-needed medication with no times of its own can carry one. Every
 *  other kind already says how many doses a day owes by listing them — a
 *  scheduled medication's slots, a course's slots — and a second number
 *  beside them is a number that can contradict them. So switching a
 *  medication to a schedule, or giving it times, drops the cap rather than
 *  leaving one that no longer describes anything.
 *
 *  `MAX_PER_DAY_LIMIT` is a sanity bound, not a medical one: it is there so a
 *  mistyped 300 — or a byte from a file this app did not write — cannot turn
 *  a chip into a paragraph.
 */
export function normalizeMaxPerDay(
  max: number | null | undefined,
  med: Pick<Medication, "asNeeded" | "times">,
): number | null {
  if (!med.asNeeded || med.times.length > 0) return null;
  if (typeof max !== "number" || !Number.isFinite(max)) return null;
  const whole = Math.floor(max);
  if (whole < 1) return null;
  return Math.min(whole, MAX_PER_DAY_LIMIT);
}

/** The largest stretch the document will hold, in whichever unit it was given
 *  in. A sanity bound, like `MAX_PER_DAY_LIMIT`: past this the number has
 *  stopped being a stretch anyone is counting down. */
export const MAX_RUN_LIMIT = 99;

/** The most days in a row this medication is meant to be taken over, and the
 *  unit that answer was given in, normalised on the way into the document.
 *
 *  Carried by exactly the medications `normalizeMaxPerDay` lets carry a daily
 *  maximum, and for the same reason: a medication with times of its own is
 *  either on a schedule, which has its own `endDate`, or on a course, which
 *  ends when you say you are done with it. Neither needs a second answer to
 *  "how long for".
 *
 *  The unit rides along rather than being multiplied away, because "two
 *  weeks" is what a person was told and "14 days" is only the arithmetic —
 *  but `maxRunUnit` is forced back to "days" whenever there is no number, so
 *  one answer keeps one representation.
 */
export function normalizeMaxRun(
  run: number | null | undefined,
  unit: RunUnit | null | undefined,
  med: Pick<Medication, "asNeeded" | "times">,
): Pick<Medication, "maxRun" | "maxRunUnit"> {
  const none = { maxRun: null, maxRunUnit: "days" as const };
  if (!med.asNeeded || med.times.length > 0) return none;
  if (typeof run !== "number" || !Number.isFinite(run)) return none;
  const whole = Math.floor(run);
  if (whole < 1) return none;
  return {
    maxRun: Math.min(whole, MAX_RUN_LIMIT),
    maxRunUnit: unit === "weeks" ? "weeks" : "days",
  };
}

/** A medication's longest stretch as a number of days — the form the count is
 *  actually done in. Null when no stretch was given. */
export function maxRunDays(med: Medication): number | null {
  if (med.maxRun === null) return null;
  return med.maxRunUnit === "weeks" ? med.maxRun * 7 : med.maxRun;
}

/** Whether a day holds any dose of a medication at all. For the medication
 *  with no times of its own, whose keys carry the minute of the tap rather
 *  than a slot, this is the only thing "took it that day" can mean. */
function tookOn(data: AppData, med: Medication, day: DayKey): boolean {
  const prefix = `${med.id}@`;
  for (const key of Object.keys(data.days[day]?.taken ?? {})) {
    if (key.startsWith(prefix)) return true;
  }
  return false;
}

/** How many days into the current stretch `day` is: the run of consecutive
 *  days, ending at `day`, that a dose was logged on. Zero when there is no
 *  stretch running.
 *
 *  Two rules, and both are readings of how such a limit is actually said —
 *  "not more than seven days in a row":
 *
 *  - **A day skipped entirely ends the stretch.** The next dose starts a new
 *    one at day one. This is what makes the count need nothing stored: the
 *    taps already say which days it was taken on, so there is no "course" to
 *    start and none to forget to end, and a stretch resets itself the first
 *    day you do without.
 *  - **The day being asked about counts, logged or not.** Start on Monday and
 *    it is day four on Thursday, whether or not Thursday's dose has been
 *    taken yet — because the stretch is a span of days, and the question
 *    ("how long have I been on this?") is asked *before* the tap as often as
 *    after it. So a day with nothing logged continues yesterday's stretch;
 *    it is the day after that, with the gap now behind it, that starts over.
 */
export function runDays(data: AppData, med: Medication, day: DayKey): number {
  // Today, still open, is the next day of whatever was running yesterday.
  const last = tookOn(data, med, day) ? day : addDays(day, -1);
  if (!tookOn(data, med, last)) return 0;
  let count = last === day ? 1 : 2;
  let cursor = last;
  while (tookOn(data, med, addDays(cursor, -1))) {
    cursor = addDays(cursor, -1);
    count++;
  }
  return count;
}

/** How far into its longest stretch a medication is on a day, against the
 *  number its owner recorded. Null when they recorded none.
 *
 *  `left` is floored at zero for the same reason `doseAllowance`'s is: a
 *  stretch that ran long reads `days: 9, maxDays: 7, left: 0`, and "how far
 *  over" is `days - maxDays`. */
export type RunAllowance = {
  maxDays: number;
  days: number;
  left: number;
};

export function runAllowance(
  med: Medication,
  days: number,
): RunAllowance | null {
  const maxDays = maxRunDays(med);
  if (maxDays === null) return null;
  return { maxDays, days, left: Math.max(0, maxDays - days) };
}

/** The course covering a day, or null when the medication was not being taken
 *  then. An unfinished course (`to === null`) covers every day from its start
 *  onwards, today and tomorrow included — which is exactly what "I am on this
 *  at the moment" means. */
export function courseOn(med: Medication, day: DayKey): Course | null {
  if (!med.asNeeded) return null;
  for (const course of med.courses) {
    if (day < course.from) continue;
    if (course.to !== null && day > course.to) continue;
    return course;
  }
  return null;
}

/** Whether a medication is being taken *right now* — on a course nobody has
 *  closed. This is what puts its times on Today every day, and what the
 *  "done with it" control retracts. */
export function isTaking(med: Medication, today: DayKey): boolean {
  return courseOn(med, today)?.to === null;
}

/** Start taking an as-needed medication, from `day` at `fromTime`. A no-op on
 *  one already running, so a double tap cannot open two courses.
 *
 *  Both moments are parameters, like every other moment in this module: the
 *  caller reads the clock (see `clockSlot` in `format.ts`), this stays pure.
 *  `fromTime` is the minute of `day` the course begins at, and it is what
 *  keeps that day from owing the slots it predates. */
export function startCourse(
  med: Medication,
  day: DayKey,
  fromTime: string,
  now: string,
): Medication {
  if (isTaking(med, day)) return med;
  return {
    ...med,
    courses: normalizeCourses(
      [...med.courses, { from: day, fromTime, to: null }],
      med,
    ),
    updatedAt: now,
  };
}

/** Stop taking it. The course ends *yesterday*, for the same reason stopping
 *  a medication does (see `MedsScreen`): its remaining doses leave today's
 *  checklist the moment you say you are done, and an unfinished today must
 *  not turn into a missed day at midnight. The cost is that doses logged
 *  earlier today stop being scored — which errs forgiving, the direction
 *  every rule in this app errs. A course ended on the day it began leaves no
 *  span at all (see `normalizeCourses`). */
export function endCourse(
  med: Medication,
  day: DayKey,
  now: string,
): Medication {
  const courses = med.courses.map((course) =>
    course.to === null ? { ...course, to: addDays(day, -1) } : course,
  );
  return { ...med, courses: normalizeCourses(courses, med), updatedAt: now };
}

/** The slots an as-needed medication owes on a day.
 *
 *  None at all for one with no times of its own: a painkiller is never due,
 *  on any day, and the doses of it you logged are a record rather than a
 *  checklist (see `asNeededOn`).
 *
 *  For one with times, every day its courses cover owes all of them — that is
 *  what being on a course means, and it is the whole point of starting one:
 *  the times appear on Today the moment you say you are taking it, and stay
 *  there every day until you say you are done, because the course does
 *  nothing unless it is kept up. It is also why two of three logged reads as
 *  two of three rather than as a clean day.
 *
 *  The exception is the day the course *begins*, which it begins partway
 *  through. A course started at ten in the morning owes the midday and the
 *  evening dose and not the eight o'clock one — that slot passed before the
 *  medication was on the list at all, and nobody can be behind on a dose they
 *  had not yet decided to take. So the first day's slots run from
 *  `course.fromTime`; a course with no recorded minute (an imported one) owes
 *  its first day whole, like every day after it.
 *
 *  One slot always survives that cut: a course started *after* the day's last
 *  slot owes that last one. Reaching for a medication at nine in the evening
 *  when its last dose was at six is what taking a dose and then going to log
 *  it looks like — so the row is there to tick, rather than the day quietly
 *  owing nothing at all. */
export function asNeededDue(med: Medication, day: DayKey): string[] {
  if (med.times.length === 0) return [];
  const course = courseOn(med, day);
  if (course === null) return [];
  if (day !== course.from || course.fromTime === null) return med.times;
  const ahead = med.times.filter((time) => time >= course.fromTime!);
  return ahead.length > 0 ? ahead : med.times.slice(-1);
}

/** Every dose a day owes, in the order the Today screen lists them: by time
 *  slot, then by name within a slot. A day before a med started — or after it
 *  stopped, or off its weekday mask — owes none of its doses, so old days
 *  never turn red when the schedule changes. Nor does a day owe an as-needed
 *  medication anything until one of its doses is logged (see `asNeededDue`),
 *  which is what keeps the days nobody needed it out of every number. */
export function dueDoses(data: AppData, day: DayKey): Dose[] {
  const log: DayLog | undefined = data.days[day];
  const doses: Dose[] = [];
  for (const med of sortedMedications(data)) {
    if (!activeOn(med, day)) continue;
    const times = med.asNeeded ? asNeededDue(med, day) : med.times;
    for (const time of times) {
      const key = doseKey(med.id, time);
      doses.push({ med, time, key, takenAt: log?.taken[key] ?? null });
    }
  }
  return doses.sort(
    (a, b) =>
      a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name),
  );
}

/** The same doses grouped by slot, in slot order — the shape the Today screen
 *  renders: a heading per time, a row per med under it. */
export function dosesByTime(doses: Dose[]): { time: string; doses: Dose[] }[] {
  const groups = new Map<string, Dose[]>();
  for (const dose of doses) {
    const group = groups.get(dose.time);
    if (group) group.push(dose);
    else groups.set(dose.time, [dose]);
  }
  return [...groups.entries()].map(([time, group]) => ({
    time,
    doses: group,
  }));
}

/** One as-needed medication, as the quick-log sheet offers it on a day.
 *
 *  `course` is the stretch covering that day, or null when the medication is
 *  not being taken then — which is what the sheet's "start taking it" /
 *  "done with it" control reads. `logged` is the doses of a medication with
 *  no times at all, each filed under the minute it was taken; a medication
 *  with times has none of its own, because on a course its doses are *due*
 *  doses and the checklist above already has them. */
export type AsNeededEntry = {
  med: Medication;
  course: Course | null;
  logged: Dose[];
  /** Where the day's taps stand against the medication's own daily maximum,
   *  or null when no maximum was recorded — which is every medication until
   *  someone types one. See `doseAllowance`. */
  allowance: DoseAllowance | null;
  /** How far into the current stretch this day is, against the longest one
   *  recorded — or null when none was. See `runAllowance`. */
  run: RunAllowance | null;
};

/** A day's doses of one medication, counted against the maximum its owner
 *  recorded for it. `left` is what is still inside that number, floored at
 *  zero — a day that went over reads `taken: 4, max: 3, left: 0` rather than
 *  a negative remainder, because "how far over" is `taken - max` and the
 *  screens say it in words. */
export type DoseAllowance = {
  max: number;
  taken: number;
  left: number;
};

/** Count doses against a medication's recorded daily maximum. Null when it
 *  has none, which is the uncapped case every caller renders as nothing at
 *  all.
 *
 *  Arithmetic over what the user recorded, and nothing more: the app holds
 *  the taps and the number it was given, so it can say where one stands
 *  against the other. It does not decide the number, and no caller may treat
 *  a full allowance as a refusal to log — see `types.ts`. */
export function doseAllowance(
  med: Medication,
  taken: number,
): DoseAllowance | null {
  if (med.maxPerDay === null) return null;
  return {
    max: med.maxPerDay,
    taken,
    left: Math.max(0, med.maxPerDay - taken),
  };
}

/** Every as-needed medication whose span covers a day, with what can be done
 *  about it there.
 *
 *  The quick-log sheet shows all of them — that is where an as-needed
 *  medication is reached for, deliberately, so Today stays the list of what
 *  the day actually asks of you. Today and the Calendar's day card show only
 *  the entries that already have a dose logged: a painkiller sticks to the
 *  day you took it on and is gone tomorrow, which is all the stickiness a
 *  headache earns. */
export function asNeededOn(data: AppData, day: DayKey): AsNeededEntry[] {
  const log: DayLog | undefined = data.days[day];
  const entries: AsNeededEntry[] = [];
  for (const med of sortedMedications(data)) {
    if (!med.asNeeded) continue;
    if (day < med.startDate) continue;
    if (med.endDate !== null && day > med.endDate) continue;
    const logged = med.times.length === 0 ? freeDoses(med, log) : [];
    entries.push({
      med,
      course: courseOn(med, day),
      logged,
      // Only the medication whose doses are unbounded can hold a maximum, so
      // the day's own taps are the whole count — there is no due list to add
      // to them (see `normalizeMaxPerDay`).
      allowance: doseAllowance(med, logged.length),
      // Walked only for the medication that has a stretch to be counted
      // against — every other one would be a walk back through the log for an
      // answer nothing reads.
      run:
        med.maxRun === null ? null : runAllowance(med, runDays(data, med, day)),
    });
  }
  return entries;
}

/** The doses logged on a day for an as-needed medication with no slots, in
 *  clock order. Its dose keys carry the minute of the tap rather than a slot
 *  — the same `medId@HH:MM` shape, because a dose taken at 14:23 *is* one
 *  medication at one time of day, and one key shape keeps one write path. */
function freeDoses(med: Medication, log: DayLog | undefined): Dose[] {
  const prefix = `${med.id}@`;
  const doses: Dose[] = [];
  for (const [key, takenAt] of Object.entries(log?.taken ?? {})) {
    if (!key.startsWith(prefix)) continue;
    const time = key.slice(prefix.length);
    if (!isValidTime(time)) continue;
    doses.push({ med, time, key, takenAt });
  }
  return doses.sort((a, b) => a.time.localeCompare(b.time));
}

/** How far through a day's doses the log is. */
export type DayProgress = {
  due: number;
  taken: number;
  /** The one-word answer the calendar paints:
   *  - `none`    — nothing was due (no meds yet, or none active that day);
   *  - `full`    — everything due was taken;
   *  - `partial` — some taken, some not;
   *  - `missed`  — doses were due and none were taken.
   *  Whether an unfinished *today* is "missed" is the caller's call — the day
   *  is not over — which is why this stays a pure count-based answer. */
  status: "none" | "full" | "partial" | "missed";
};

/** Count a day's doses against its log. */
export function dayProgress(data: AppData, day: DayKey): DayProgress {
  const doses = dueDoses(data, day);
  const due = doses.length;
  const taken = doses.filter((d) => d.takenAt !== null).length;
  const status =
    due === 0
      ? "none"
      : taken === due
        ? "full"
        : taken === 0
          ? "missed"
          : "partial";
  return { due, taken, status };
}

/** Whether a "HH:MM" string is a real time of day — the validation the med
 *  form runs before a slot is saved. Zero-padded 24-hour form only, because
 *  that is what `<input type="time">` yields and what the slot sort relies
 *  on ("09:00" < "21:00" only works zero-padded). */
export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Normalise a med's slot list on the way into the document: valid times
 *  only, deduplicated, sorted. An empty answer is the caller's problem — a
 *  med with no slots is a med the schedule never asks about. */
export function normalizeTimes(times: string[]): string[] {
  return [...new Set(times.filter(isValidTime))].sort();
}

/** Minutes past midnight for a "HH:MM" slot — the arithmetic form of a time
 *  of day, for ordering against a moment rather than against other slots.
 *  -1 for anything that isn't a slot. */
export function minutesOfDay(time: string): number {
  if (!isValidTime(time)) return -1;
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/** How long before a slot still counts as "about to happen" for the quick-log
 *  ordering. An hour: people take the evening dose at half past nine and log
 *  it, and the slot they are reaching for should be the first row. */
export const QUICK_LOG_GRACE_MINUTES = 60;

/** How far a slot is from a moment, for quick-log ordering — smaller is more
 *  likely to be the dose in your hand.
 *
 *  Not a plain distance, because the two directions are not the same claim.
 *  A slot already past is one you *could* have taken, so it is ranked by how
 *  long ago it was; a slot still ahead is one you have not reached yet, and
 *  only counts as imminent inside the grace window above — beyond that it
 *  sorts as what it is, yesterday's version of the same slot, nearly a full
 *  day behind. So at four in the afternoon an unticked 08:00 comes before a
 *  20:00, and at half past seven in the evening the 20:00 comes first.
 *
 *  Both directions wrap around midnight, so a 23:00 slot read at 00:30 is
 *  ninety minutes behind rather than a day and a half away. */
export function quickLogDistance(time: string, nowMinutes: number): number {
  const slot = minutesOfDay(time);
  if (slot < 0) return Number.MAX_SAFE_INTEGER;
  const now = ((Math.round(nowMinutes) % 1440) + 1440) % 1440;
  const ahead = (slot - now + 1440) % 1440;
  const behind = (now - slot + 1440) % 1440;
  return ahead <= QUICK_LOG_GRACE_MINUTES ? ahead : behind;
}

/** A day's doses in the order the quick-log sheet lists them: what you have
 *  not taken yet first, likeliest first, and what you already logged at the
 *  bottom.
 *
 *  The sheet is opened with a glass in one hand to answer one question — "the
 *  one I am holding, which row is it?" — so the answer has to be near the top
 *  without reading. Already-logged doses stay on the list rather than
 *  disappearing, both because seeing them is half of why the sheet is opened
 *  and because an accidental tap has to be undoable; they just stop competing
 *  for the top of it.
 *
 *  Pure, like everything else here: the moment is a parameter, and the caller
 *  reads the clock (see `QuickLogModal.tsx`). */
export function quickLogOrder(doses: Dose[], nowMinutes: number): Dose[] {
  return [...doses].sort((a, b) => {
    const aTaken = a.takenAt !== null ? 1 : 0;
    const bTaken = b.takenAt !== null ? 1 : 0;
    if (aTaken !== bTaken) return aTaken - bTaken;
    if (aTaken === 0) {
      const distance =
        quickLogDistance(a.time, nowMinutes) -
        quickLogDistance(b.time, nowMinutes);
      if (distance !== 0) return distance;
    }
    return a.time.localeCompare(b.time) || a.med.name.localeCompare(b.med.name);
  });
}
