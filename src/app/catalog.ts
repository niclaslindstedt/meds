// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Search over the bundled medication catalog — the arithmetic behind the Add
// form's autocomplete. Pure: the data is a parameter, so the tests never
// touch the (lazy-loaded) catalog chunk and the ranking can be pinned with a
// three-entry fixture.
//
// The ranking is deliberately simple: names whose start matches the query
// first, names that contain it after, alphabetical within each group. A
// medication list is not prose — someone typing "lev" wants Levaxin before
// anything that merely contains the letters — and anything cleverer
// (fuzziness, edit distance) starts suggesting medications the person did
// not type, which in this domain is worse than suggesting nothing.

import type { CatalogEntry } from "./data/medications.ts";

export type { CatalogEntry };

/** How many suggestions the form shows. Enough to catch a misremembered
 *  spelling, few enough that the list never covers the dose field below. */
export const MAX_SUGGESTIONS = 6;

/** Fold a name for matching: lowercase, accents stripped (é → e), but the
 *  Swedish å/ä/ö kept distinct — they are letters here, not decorations, and
 *  folding them would rank "Behepan" for a "bäh" typo while the person can
 *  see perfectly well which vowel they typed. */
function fold(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      // Every combining mark except the diaeresis (ä, ö) and the ring (å),
      // which recompose below and stay significant.
      .replace(/(?![\u0308\u030A])[\u0300-\u036f]/g, "")
      .normalize("NFC")
  );
}

/**
 * The catalog entries matching a query, best first.
 *
 * A query under two characters answers nothing: one letter matches half the
 * catalog, and a list that long is noise where the keyboard needs the room.
 */
export function searchCatalog(
  entries: CatalogEntry[],
  query: string,
  limit = MAX_SUGGESTIONS,
): CatalogEntry[] {
  const needle = fold(query.trim());
  if (needle.length < 2) return [];
  const starts: CatalogEntry[] = [];
  const contains: CatalogEntry[] = [];
  for (const entry of entries) {
    const name = fold(entry.name);
    if (name.startsWith(needle)) starts.push(entry);
    else if (name.includes(needle)) contains.push(entry);
  }
  const byName = (a: CatalogEntry, b: CatalogEntry) =>
    a.name.localeCompare(b.name);
  return [...starts.sort(byName), ...contains.sort(byName)].slice(0, limit);
}

/** The exact catalog entry for a name, if it is one — how the form finds the
 *  dose chips for a name that was picked (or typed out in full). */
export function catalogEntryFor(
  entries: CatalogEntry[],
  name: string,
): CatalogEntry | null {
  const needle = fold(name.trim());
  if (needle === "") return null;
  return entries.find((entry) => fold(entry.name) === needle) ?? null;
}
