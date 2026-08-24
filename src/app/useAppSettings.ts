// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useCallback } from "react";

import { useLocalStorageState } from "@niclaslindstedt/oss-framework/hooks";
import type { WeekStart } from "@niclaslindstedt/oss-framework/calendar";

// The app's own (non-theme) settings: which of the two themes is active, how
// the calendar is laid out, and the developer knobs. The framework
// deliberately leaves this in the app; it only owns the appearance
// *projection*. Persisted to localStorage so a reload keeps your choices.
//
// Deliberately this short. A medication log is opened for fifteen seconds a
// day, and every knob is a question asked of everyone to serve someone — the
// schedule itself lives on the medications (see `types.ts`), not here.

/** The theme choice. Deliberately three values and no more — one light, one
 *  dark, and "follow the device". No palette variations: a logbook you open
 *  for fifteen seconds a day does not need a theme gallery. */
export type ThemeChoice = "light" | "dark" | "system";

export type AppSettings = {
  theme: ThemeChoice;
  /** First day of the week in the calendar grid (`Date.getDay()` numbering:
   *  0 = Sunday, 1 = Monday). */
  weekStartsOn: WeekStart;
  /** Surface the developer affordances (the demo document, the log panel,
   *  the raw document size) in Settings. */
  devMode: boolean;
  /** Mirror console output into the in-app log buffer. */
  captureLogs: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  // Follow the device out of the box: a med log is opened first thing in the
  // morning and last thing at night, and the OS already knows whether that
  // means dark.
  theme: "system",
  weekStartsOn: 1,
  devMode: false,
  captureLogs: false,
};

const STORAGE_KEY = "meds:settings";

function parseSettings(raw: string): AppSettings {
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return DEFAULT_SETTINGS;
  }
  const stored = parsed as Record<string, unknown>;
  const merged = { ...DEFAULT_SETTINGS, ...stored } as AppSettings;
  const week = Math.round(Number(merged.weekStartsOn));
  return {
    ...merged,
    // Enumerations fall back rather than reaching a `switch` that has no case
    // for a value this build does not recognise.
    theme:
      merged.theme === "light" || merged.theme === "dark"
        ? merged.theme
        : "system",
    weekStartsOn: (week >= 0 && week <= 6 ? week : 1) as WeekStart,
    devMode: merged.devMode === true,
    captureLogs: merged.captureLogs === true,
  };
}

export function useAppSettings() {
  // The framework hook owns the persistence mechanics (safe parse,
  // write-through); this store owns the key, the settings shape, and the
  // fallbacks.
  const [settings, setSettings] = useLocalStorageState<AppSettings>(
    STORAGE_KEY,
    DEFAULT_SETTINGS,
    { parse: parseSettings },
  );

  const update = useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
      setSettings((prev) => ({ ...prev, [key]: value })),
    [setSettings],
  );

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), [setSettings]);

  return { settings, update, reset, setSettings };
}
