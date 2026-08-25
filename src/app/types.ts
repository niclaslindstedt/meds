// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The app's data model: the medications you take, and one log per day of the
// doses you actually took. Everything the calendar, the history and the stats
// draw is derived from these two maps at read time — nothing about adherence
// is stored, so correcting a day re-derives every downstream number (see
// `stats.ts`).
//
// A medication is deliberately few facts: a name, an optional dose ("20 mg",
// free text — the app never does arithmetic on it), the times of day it is
// taken, and the weekdays it is taken on. The focus of the whole app is
// cutting the seconds spent logging, and every further field would be a
// question asked at every dose for nothing. There is still no stock counter,
// no prescriber and no notes.
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
// A day's log is keyed by *dose* — `medId@HH:MM` — so "taken" is a claim about
// one medication at one slot, and a day with two slots half done is exactly
// half done rather than ambiguously "logged".

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";

/** One medication on the schedule. */
export type Medication = {
  /** Stable random id — the half of a dose key that survives a rename. */
  id: string;
  name: string;
  /** Free text ("20 mg", "2 tablets"), or "" when none was given. Display
   *  only — the app never parses it. */
  dose: string;
  /** The times of day a dose is due, as zero-padded "HH:MM", sorted, at least
   *  one. Times rather than counts because the Today screen groups doses by
   *  slot — "morning meds" is a list you clear in one glance. */
  times: string[];
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

/** One day's log: which due doses were taken, and when. */
export type DayLog = {
  date: DayKey;
  /** `doseKey` → ISO timestamp of the tap that logged it. Absence means "not
   *  taken" — there is no explicit skip state, because a dose that is neither
   *  taken nor due says everything a skip would. */
  taken: Record<string, string>;
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
 *  added the medication weekday mask. */
export const DOC_VERSION = 2;

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
  return data.days[day] ?? { date: day, taken: {}, updatedAt: "" };
}
