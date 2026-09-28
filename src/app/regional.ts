// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The day a fresh install's week starts on, taken from the device rather than
// from this app. Someone in the United States expects a Sunday-first calendar;
// someone in Sweden expects Monday. It is a setting, so this only decides where
// a new install *starts* — the stored choice of anyone who has opened the app
// before always wins (see `useAppSettings.ts`, where a stored value is read
// over this).
//
// Pure: the device's preferred languages are a parameter, so the tests pin
// real tags without a mocked `navigator`.

import type { WeekStart } from "@niclaslindstedt/oss-framework/calendar";

/** Where nothing on the device names a region: the app's long-standing
 *  default, Monday. */
export const FALLBACK_WEEK_START: WeekStart = 1;

/**
 * Regions whose calendars start the week on Sunday: the United States and its
 * territories, and the larger Sunday-first markets beside it. Everywhere else
 * starts on Monday, which is what the app has always done.
 *
 * A table rather than `Intl.Locale#getWeekInfo`, on purpose: that is missing
 * from older WebKit, and where it exists its CLDR data moves between releases
 * (it currently puts Iceland on Sunday, which no Icelandic calendar does). A
 * default that changes under someone with an OS update is worse than a short
 * list that says exactly what it covers.
 */
const SUNDAY_REGIONS = new Set([
  "US",
  "AS",
  "GU",
  "MP",
  "PR",
  "UM",
  "VI",
  "CA",
  "MX",
  "BR",
  "JP",
  "KR",
  "TW",
  "HK",
  "IL",
  "PH",
  "IN",
  "ZA",
]);

/** The region subtag of a BCP 47 tag ("en-US" → "US", "zh-Hant-TW" → "TW"),
 *  or null when the tag names only a language. */
export function regionOf(tag: string): string | null {
  const parts = tag.trim().replace(/_/g, "-").split("-").slice(1);
  const region = parts.find((p) => /^[A-Za-z]{2}$/.test(p));
  return region ? region.toUpperCase() : null;
}

/**
 * The week start a device's preferred languages ask for, most-preferred first
 * (`navigator.languages`).
 *
 * The first tag that names a region decides, because the region is what
 * carries the convention — "en-US" and "es-US" both want Sunday, while "en-SE"
 * (an English phone in Sweden) wants Monday. A tag with no region ("en") says
 * nothing about it and is passed over rather than read as American, and a
 * device that names no region at all keeps the fallback.
 */
export function weekStartFor(tags: readonly string[]): WeekStart {
  for (const tag of tags) {
    if (typeof tag !== "string" || !tag.trim()) continue;
    const region = regionOf(tag);
    if (!region) continue;
    return SUNDAY_REGIONS.has(region) ? 0 : 1;
  }
  return FALLBACK_WEEK_START;
}

/** The device's preferred languages, most-preferred first; empty where there
 *  is no `navigator` (the tests, a build step). */
export function deviceLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  if (navigator.languages && navigator.languages.length > 0) {
    return navigator.languages;
  }
  return navigator.language ? [navigator.language] : [];
}
