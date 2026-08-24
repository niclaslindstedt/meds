// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";

import { parseDoc, serializeDoc } from "./migrations.ts";
import {
  emptyDoc,
  type AppData,
  type DayLog,
  type Medication,
} from "./types.ts";
import * as output from "../output.ts";

// The app's data store. Holds the document in state, persists it to
// localStorage, and exposes the edits the app can make — save or remove a
// medication, and tick or untick one dose of one day. This is the framework's
// "store stays in the app" seam: the framework owns the storage adapters and
// the UI kit, this hook owns where the document lives and what an edit means.
//
// The local copy is always the working copy. Cloud sync (see `useSyncEngine`)
// reads and writes *around* this hook rather than through it, so losing the
// network never costs a tap.

const DOC_KEY = "meds:doc";

/** The document storage seam. The store never touches `localStorage` directly
 *  — it reads and writes through a `DocBackend`, so a test (or the demo-data
 *  mode) can take over storage without the store changing. */
export type DocBackend = {
  readonly id: string;
  /** The current document, or an empty one when nothing is stored. */
  load(): AppData;
  /** Persist the document, answering whether the bytes actually landed. Still
   *  a best-effort sink — it must not throw — but the answer is what lets the
   *  shell tell a write that happened from one that didn't. A checkmark over
   *  a document that never reached the disk is the one piece of feedback
   *  worse than none. */
  save(doc: AppData): boolean;
};

/**
 * The real backend: one JSON document in localStorage, run through the
 * migration pipeline on the way in and out.
 *
 * Both directions are *non-destructive*. A document that exists but this
 * build can't read — most often one a NEWER build already upgraded, then read
 * by a stale (service-worker-cached) build mid-update — is left on disk
 * untouched rather than replaced with a blank starter, so it comes back on
 * its own once the update finishes.
 */
export const localDocBackend: DocBackend = {
  id: "local",
  load() {
    let raw: string | null;
    try {
      raw = localStorage.getItem(DOC_KEY);
    } catch {
      // Storage unavailable (private mode, quota policy) — boot empty.
      return emptyDoc();
    }
    if (!raw) return emptyDoc();
    try {
      return parseDoc(raw);
    } catch (err) {
      // Bytes exist but can't be parsed. Keep the original on disk — the
      // caller must NOT persist the empty document we return here over it
      // (see the persist guard below) — and quarantine a copy so it stays
      // recoverable even if a later edit does overwrite the live key.
      output.error(
        `Couldn't read the log saved on this device — ${
          err instanceof Error ? err.message : String(err)
        }. The stored copy is left untouched and should reappear once the app finishes updating.`,
      );
      try {
        localStorage.setItem(`${DOC_KEY}:unreadable`, raw);
      } catch {
        // No room to quarantine — the live key is still left intact.
      }
      return emptyDoc();
    }
  },
  save(doc) {
    try {
      localStorage.setItem(DOC_KEY, serializeDoc(doc));
      return true;
    } catch (err) {
      output.error(
        `Couldn't save to this device — ${
          err instanceof Error ? err.message : String(err)
        }.`,
      );
      return false;
    }
  },
};

export type DocStore = {
  data: AppData;
  /** Upsert one medication — the Add form's save and every edit-form save. */
  saveMedication: (med: Medication) => void;
  /** Remove a medication and every logged dose of it. The destructive path —
   *  stopping a med is `saveMedication` with an `endDate` instead. */
  removeMedication: (medId: string) => void;
  /** Tick or untick one dose of one day. `takenAt` is the tap's timestamp, or
   *  null to retract it. A day whose last mark is retracted drops out of the
   *  document entirely, so it never accumulates empty days. */
  setDoseTaken: (day: DayKey, doseKey: string, takenAt: string | null) => void;
  /** Replace the whole document — used by the cloud adopt path and by the
   *  Settings import flow. */
  replaceAll: (doc: AppData) => void;
  /** Monotonic counter bumped on every edit. The sync engine debounces on it
   *  rather than deep-comparing the document. */
  editCount: number;
  /** True once the first load has been applied — the persist guard below
   *  refuses to write before it, so a slow read can never be overwritten by
   *  the empty document that preceded it. */
  loaded: boolean;
  /** How many write-throughs have failed. A counter rather than a flag so a
   *  second failure raises a second warning: the toast for the first one has
   *  usually gone by then, and "it didn't save" is worth saying every time it
   *  is true. */
  writeFailures: number;
};

export function useDocStore(backend: DocBackend = localDocBackend): DocStore {
  // Read synchronously on the first render: localStorage can answer before
  // the first paint, so there is no empty-state flash to design around.
  const [data, setData] = useState<AppData>(() => backend.load());
  const [editCount, setEditCount] = useState(0);
  const [writeFailures, setWriteFailures] = useState(0);
  const loadedRef = useRef(true);

  // A backend swap (the demo-data toggle, and tests) adopts the new backend's
  // document rather than writing this one over it.
  useEffect(() => {
    loadedRef.current = false;
    setData(backend.load());
    loadedRef.current = true;
  }, [backend]);

  // Write-through on every change. Guarded on `loadedRef` so the document is
  // only ever persisted after a load has been applied.
  useEffect(() => {
    if (!loadedRef.current) return;
    if (!backend.save(data)) setWriteFailures((n) => n + 1);
  }, [backend, data]);

  const saveMedication = useCallback((med: Medication) => {
    setData((prev) => ({
      ...prev,
      medications: { ...prev.medications, [med.id]: med },
    }));
    setEditCount((n) => n + 1);
  }, []);

  const removeMedication = useCallback((medId: string) => {
    setData((prev) => {
      if (!prev.medications[medId]) return prev;
      const medications = { ...prev.medications };
      delete medications[medId];
      // Sweep the med's doses out of every day, dropping days left empty —
      // a dose key names its med, so the sweep is a prefix match.
      const days: AppData["days"] = {};
      for (const [day, log] of Object.entries(prev.days)) {
        const taken: Record<string, string> = {};
        for (const [key, at] of Object.entries(log.taken)) {
          if (!key.startsWith(`${medId}@`)) taken[key] = at;
        }
        if (Object.keys(taken).length > 0) days[day] = { ...log, taken };
      }
      return { ...prev, medications, days };
    });
    setEditCount((n) => n + 1);
  }, []);

  const setDoseTaken = useCallback(
    (day: DayKey, doseKey: string, takenAt: string | null) => {
      setData((prev) => {
        const log: DayLog = prev.days[day] ?? {
          date: day,
          taken: {},
          updatedAt: "",
        };
        const taken = { ...log.taken };
        if (takenAt === null) {
          if (!(doseKey in taken)) return prev;
          delete taken[doseKey];
        } else {
          taken[doseKey] = takenAt;
        }
        const days = { ...prev.days };
        if (Object.keys(taken).length === 0) {
          delete days[day];
        } else {
          days[day] = {
            date: day,
            taken,
            updatedAt: takenAt ?? new Date().toISOString(),
          };
        }
        return { ...prev, days };
      });
      setEditCount((n) => n + 1);
    },
    [],
  );

  const replaceAll = useCallback((doc: AppData) => {
    setData(doc);
    setEditCount((n) => n + 1);
  }, []);

  return useMemo(
    () => ({
      data,
      saveMedication,
      removeMedication,
      setDoseTaken,
      replaceAll,
      editCount,
      loaded: loadedRef.current,
      writeFailures,
    }),
    [
      data,
      saveMedication,
      removeMedication,
      setDoseTaken,
      replaceAll,
      editCount,
      writeFailures,
    ],
  );
}
