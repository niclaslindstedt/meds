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
// medication weekday mask.

import { createMigrator } from "@niclaslindstedt/oss-framework/storage";

import { isValidTime, normalizeWeekdays } from "./schedule.ts";
import {
  DOC_VERSION,
  emptyDoc,
  type AppData,
  type DayLog,
  type Medication,
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

/** Coerce one stored medication, or drop it when it can't be one. A med needs
 *  a name and at least one valid time to mean anything — one without either is
 *  discarded rather than resurrected as an empty row the form then chokes
 *  on. Unknown fields are dropped rather than carried forward. */
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
  if (name === "" || times.length === 0) return null;
  return {
    id: typeof value.id === "string" ? value.id : id,
    name,
    dose: typeof value.dose === "string" ? value.dose : "",
    times,
    weekdays: parseWeekdays(value.weekdays),
    startDate:
      typeof value.startDate === "string" ? value.startDate : "1970-01-01",
    endDate: typeof value.endDate === "string" ? value.endDate : null,
    updatedAt: parseTimestamp(value.updatedAt),
  };
}

/** Coerce one stored day log. Taken entries whose value isn't a timestamp
 *  string are dropped; a day left with no marks at all is dropped whole, so
 *  the document never accumulates empty days. */
function parseDayLog(day: string, value: unknown): DayLog | null {
  if (!isRecord(value)) return null;
  const takenRaw = isRecord(value.taken) ? value.taken : {};
  const taken: Record<string, string> = {};
  for (const [key, at] of Object.entries(takenRaw)) {
    if (typeof at === "string") taken[key] = at;
  }
  if (Object.keys(taken).length === 0) return null;
  return {
    date: typeof value.date === "string" ? value.date : day,
    taken,
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
