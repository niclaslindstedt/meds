// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The persistence pipeline: raw JSON in, a validated `AppData` out, and back.
// Every read — from localStorage, from a cloud backend, from an imported
// backup file — goes through `parseDoc`, so no other module has to trust the
// bytes it was handed.
//
// The framework owns the migration *runner* (`createMigrator`); this module
// owns the step table and the shape validation. Adding a schema change means
// bumping `DOC_VERSION` in `types.ts` and appending one step here — never
// editing an existing step, which would silently rewrite documents that
// already migrated through it. v1 is the first published shape; v2 added the
// medication weekday mask; v3 as-needed medications — the flag and the
// courses together; v4 the daily maximum; v5 the longest stretch; v6 the day
// log's skipped doses.

import { createMigrator } from "@niclaslindstedt/oss-framework/storage";

import {
  isValidTime,
  normalizeCourses,
  normalizeMaxPerDay,
  normalizeMaxRun,
  normalizeWeekdays,
} from "./schedule.ts";
import {
  DOC_VERSION,
  emptyDoc,
  type AppData,
  type Course,
  type DayLog,
  type Medication,
  type RunUnit,
} from "./types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const EPOCH = new Date(0).toISOString();

function parseTimestamp(value: unknown): string {
  return typeof value === "string" ? value : EPOCH;
}

/** Coerce a stored weekday mask. Anything that isn't a list of whole numbers
 *  0–6 reads as "every day" — which is also what a pre-v2 medication, with no
 *  such field at all, reads as. */
function parseWeekdays(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  return normalizeWeekdays(
    value.filter((day): day is number => typeof day === "number"),
  );
}

/** Coerce a stored course list. Anything that isn't a `{ from, to }` pair of
 *  day keys is dropped; `normalizeCourses` then throws away the spans a
 *  medication of this kind cannot be on at all. */
function parseCourses(
  value: unknown,
  med: Pick<Medication, "asNeeded" | "times">,
): Course[] {
  if (!Array.isArray(value)) return [];
  const courses: Course[] = [];
  for (const raw of value) {
    if (!isRecord(raw)) continue;
    if (typeof raw.from !== "string") continue;
    courses.push({
      from: raw.from,
      fromTime: typeof raw.fromTime === "string" ? raw.fromTime : null,
      to: typeof raw.to === "string" ? raw.to : null,
    });
  }
  return normalizeCourses(courses, med);
}

/** Coerce a stored daily maximum. Anything that isn't a number reads as "no
 *  maximum given" — which is also what a pre-v4 medication, with no such
 *  field at all, reads as; `normalizeMaxPerDay` then throws away a number a
 *  medication of this kind cannot carry. */
function parseMaxPerDay(
  value: unknown,
  med: Pick<Medication, "asNeeded" | "times">,
): number | null {
  return normalizeMaxPerDay(typeof value === "number" ? value : null, med);
}

/** Coerce a stored stretch and its unit. Anything that isn't a number reads
 *  as "no stretch given" — which is also what a pre-v5 medication, with
 *  neither field, reads as — and any unit but "weeks" reads as days, so a
 *  stored typo cannot multiply a limit by seven. */
function parseMaxRun(
  run: unknown,
  unit: unknown,
  med: Pick<Medication, "asNeeded" | "times">,
): Pick<Medication, "maxRun" | "maxRunUnit"> {
  return normalizeMaxRun(
    typeof run === "number" ? run : null,
    unit === "weeks" ? ("weeks" as RunUnit) : ("days" as RunUnit),
    med,
  );
}

/** Coerce one stored medication, or drop it when it can't be one. A med needs
 *  a name, and a *scheduled* med needs at least one valid time to mean
 *  anything — one without either is discarded rather than resurrected as an
 *  empty row the form then chokes on. An as-needed med is allowed no times at
 *  all: taken when it is taken is a complete answer, and its doses are filed
 *  under the minute of the tap (see `asNeededOn` in `schedule.ts`). Unknown
 *  fields are dropped rather than carried forward. */
function parseMedication(id: string, value: unknown): Medication | null {
  if (!isRecord(value)) return null;
  const name = typeof value.name === "string" ? value.name.trim() : "";
  const times = Array.isArray(value.times)
    ? [
        ...new Set(
          value.times.filter(
            (t): t is string => typeof t === "string" && isValidTime(t),
          ),
        ),
      ].sort()
    : [];
  // Strictly `=== true`: a missing field is a pre-v3 medication, which was a
  // scheduled one.
  const asNeeded = value.asNeeded === true;
  if (name === "" || (times.length === 0 && !asNeeded)) return null;
  return {
    id: typeof value.id === "string" ? value.id : id,
    name,
    dose: typeof value.dose === "string" ? value.dose : "",
    times,
    asNeeded,
    courses: parseCourses(value.courses, { asNeeded, times }),
    maxPerDay: parseMaxPerDay(value.maxPerDay, { asNeeded, times }),
    ...parseMaxRun(value.maxRun, value.maxRunUnit, { asNeeded, times }),
    // An as-needed medication carries no mask: which days you need it is not
    // a fact about the week, and one schedule gets one representation.
    weekdays: asNeeded ? null : parseWeekdays(value.weekdays),
    startDate:
      typeof value.startDate === "string" ? value.startDate : "1970-01-01",
    endDate: typeof value.endDate === "string" ? value.endDate : null,
    updatedAt: parseTimestamp(value.updatedAt),
  };
}

/** Coerce one stored map of dose marks — `doseKey` → ISO timestamp. Entries
 *  whose value isn't a timestamp string are dropped. */
function parseMarks(value: unknown): Record<string, string> {
  const raw = isRecord(value) ? value : {};
  const marks: Record<string, string> = {};
  for (const [key, at] of Object.entries(raw)) {
    if (typeof at === "string") marks[key] = at;
  }
  return marks;
}

/** Coerce one stored day log. A day left with no marks at all — neither taken
 *  nor skipped — is dropped whole, so the document never accumulates empty
 *  days.
 *
 *  A dose both maps claim is resolved in favour of `taken`, here as everywhere
 *  else: the two are one claim's two answers (see `types.ts`), and bytes this
 *  app did not write must not be able to produce a dose that is somehow both.
 *  A pre-v6 document carries no `skipped` field at all, which reads as none —
 *  what those documents already meant. */
function parseDayLog(day: string, value: unknown): DayLog | null {
  if (!isRecord(value)) return null;
  const taken = parseMarks(value.taken);
  const skipped: Record<string, string> = {};
  for (const [key, at] of Object.entries(parseMarks(value.skipped))) {
    if (!(key in taken)) skipped[key] = at;
  }
  if (Object.keys(taken).length === 0 && Object.keys(skipped).length === 0) {
    return null;
  }
  return {
    date: typeof value.date === "string" ? value.date : day,
    taken,
    skipped,
    updatedAt: parseTimestamp(value.updatedAt),
  };
}

const migrator = createMigrator({
  latestVersion: DOC_VERSION,
  migrations: {
    // v0 → v1: documents that predate versioning (the runner reads a missing
    // `version` as 0) carry the v1 shape already — this step exists so the
    // stored number moves and later steps have a floor to build on.
    0: (doc) => ({ ...doc, version: 1 }),
    // v1 → v2: medications gained a weekday mask. A v1 medication carries no
    // `weekdays` field at all, and `parseMedication` reads a missing one as
    // null — every day, which is exactly the schedule those documents already
    // described. So the shape needs no rewriting; the step exists so the
    // stored number moves and a later step has a floor to build on.
    1: (doc) => ({ ...doc, version: 2 }),
    // v2 → v3: medications gained the as-needed flag and its courses. A v2
    // medication carries neither field; `parseMedication` reads a missing
    // `asNeeded` as false — a scheduled medication, which is the only kind
    // those documents could describe — and a scheduled medication has no
    // courses. So again the shape needs no rewriting and the step exists so
    // the stored number moves.
    2: (doc) => ({ ...doc, version: 3 }),
    // v3 → v4: medications gained a daily maximum. A v3 medication carries no
    // `maxPerDay` field, and `parseMedication` reads a missing one as null —
    // no maximum given, which is what every document written before the field
    // existed meant. Nothing to rewrite; the step moves the stored number.
    3: (doc) => ({ ...doc, version: 4 }),
    // v4 → v5: medications gained the longest stretch and the unit it was
    // given in. A v4 medication carries neither; `parseMedication` reads a
    // missing `maxRun` as null — no stretch given, which is what those
    // documents meant — and null forces the unit back to "days". Nothing to
    // rewrite; the step moves the stored number.
    4: (doc) => ({ ...doc, version: 5 }),
    // v5 → v6: day logs gained the doses that were deliberately set aside. A
    // v5 day carries no `skipped` field, and `parseDayLog` reads a missing one
    // as none — which is what every document written before a skip could be
    // recorded meant. Nothing to rewrite; the step moves the stored number.
    5: (doc) => ({ ...doc, version: 6 }),
  },
});

/** Validate and normalise an arbitrary parsed value into an `AppData`. Used
 *  by both `parseDoc` and the Settings import flow, which has already turned
 *  a picked file into JSON. */
export function normalizeDoc(value: unknown): AppData {
  if (!isRecord(value)) return emptyDoc();
  const { data } = migrator.migrate(value);
  const migrated = data as unknown as Record<string, unknown>;

  const medsRaw = isRecord(migrated.medications) ? migrated.medications : {};
  const medications: AppData["medications"] = {};
  for (const [id, raw] of Object.entries(medsRaw)) {
    const med = parseMedication(id, raw);
    if (med) medications[med.id] = med;
  }

  const daysRaw = isRecord(migrated.days) ? migrated.days : {};
  const days: AppData["days"] = {};
  for (const [day, raw] of Object.entries(daysRaw)) {
    const log = parseDayLog(day, raw);
    if (log) days[log.date] = log;
  }

  return { version: DOC_VERSION, medications, days };
}

/** Parse serialized document bytes. Throws on malformed JSON so the caller
 *  can decide whether to quarantine the stored copy — a *shape* problem is
 *  recoverable (unknown fields are dropped), a *syntax* problem is not. */
export function parseDoc(raw: string): AppData {
  return normalizeDoc(JSON.parse(raw) as unknown);
}

/** Serialize a document for storage. Keys are emitted in sorted order so the
 *  bytes are stable — two devices holding the same log produce the same
 *  string, which keeps cloud revisions from churning on no-op saves. */
export function serializeDoc(data: AppData): string {
  const medications: AppData["medications"] = {};
  for (const id of Object.keys(data.medications).sort()) {
    medications[id] = data.medications[id]!;
  }
  const days: AppData["days"] = {};
  for (const day of Object.keys(data.days).sort()) {
    days[day] = data.days[day]!;
  }
  return JSON.stringify({ version: DOC_VERSION, medications, days });
}
