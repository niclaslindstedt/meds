// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type { ReactNode } from "react";

import { CogIcon, PlusIcon } from "@niclaslindstedt/oss-framework/components";

import { AppMarkIcon } from "./icons.tsx";
import { useT } from "./i18n/index.ts";
import type { Tab } from "./BottomNav.tsx";

// The bar across the top: the app's mark and name, the sync glyph, and the
// two things you *do* rather than places you go — logging a dose, and
// changing a setting.
//
// The left half is the `<h1>` — the mark beside the wordmark, which is the
// same pair the home-screen tile and the browser tab show. The mark here is
// `AppMarkIcon` and not the favicon file: the same capsule with the install
// tile's background dropped and the ink swapped for `currentColor`, so it
// wears the accent — this app's teal — inside the app while staying green
// where it is an icon among other apps' icons.
//
// It is the sibling apps' bar geometry — a bordered row at `px-4 py-3` with
// the action cluster on the right, gapped at `0.5rem` — because these are the
// same app family and a header that lands at a different height on each of
// them reads as unrelated apps rather than one set. The 36px action buttons
// set the row's height. The top-up of `padding-top` comes from the stylesheet
// (`.app-header`), which takes the larger of the row's own padding and the
// status-bar inset — so an installed PWA paints edge to edge and the rule
// under the bar still tucks straight under the Dynamic Island.
//
// Why these two and not tabs. The bottom bar is a row of *destinations*, and
// a row of destinations should have an order that means something left to
// right — which is what lets a swipe move along it (see `useSwipeNav.ts`).
// Logging a dose and changing a setting are neither of those: you go, you do
// the thing, you come back. So they are buttons — one opening a sheet over
// whatever you were looking at, the other a screen that pressing the button a
// second time comes back from, rather than stranding you with no tab lit.
//
// The `+` is deliberately the loudest thing on screen and the last thing
// before the right edge, where a right thumb lands. It wears the filled
// accent the dose toggles wear, and inverts to an outline while the sheet it
// opens is up — the same "filled means happening, outlined means expected"
// grammar the calendar's marks use.
//
// What it opens is the quick-log sheet (`QuickLogModal.tsx`), not the add
// form. The loudest button on a medication log should do the thing the app is
// picked up for, and that is logging a dose you just took — adding a
// medication happens a handful of times a year, and it is one tap further, in
// the sheet's footer and on the Meds tab.

type Props = {
  /** The screen on display, so the button that leads to it can say so. */
  active: Tab;
  /** Show the Settings screen — or, when it is already showing, go back to
   *  where you were. */
  onOpen: (tab: "add" | "settings") => void;
  /** Open the quick-log sheet. */
  onQuickLog: () => void;
  /** Whether that sheet is up, so the `+` can say so. */
  quickLogOpen: boolean;
  /** The cloud glyph, when there is a cloud. Absent on the local backend,
   *  which has nothing to sync against. */
  syncSlot?: ReactNode;
};

export function TopBar({
  active,
  onOpen,
  onQuickLog,
  quickLogOpen,
  syncSlot,
}: Props) {
  const t = useT();
  const onSettings = active === "settings";
  return (
    // `justify-between`: the heading takes the left edge and the action
    // cluster the right, which is where the thumb is.
    <header className="app-header flex shrink-0 items-center justify-between gap-2 border-b border-line bg-surface-3 px-4 pb-3">
      {/* `min-w-0` + `truncate` so a longer name in another language gives way
          to the buttons rather than pushing them off the row. */}
      <h1 className="app-wordmark flex min-w-0 items-center gap-2 text-accent">
        <AppMarkIcon className="h-6 w-6 shrink-0" />
        <span className="truncate">{t("app.name")}</span>
      </h1>
      <div className="flex shrink-0 items-center gap-2">
        {syncSlot}
        <button
          type="button"
          onClick={() => onOpen("settings")}
          aria-label={t("nav.settings")}
          aria-current={onSettings ? "page" : undefined}
          title={t("nav.settings")}
          // Accent at rest as well as on the Settings screen, so the row reads
          // as one colour. The lit state is the tinted fill behind it instead
          // of a change of ink — the same "filled means happening" grammar the
          // `+` and the calendar's marks use.
          className={`flex h-9 w-9 items-center justify-center rounded-md text-accent transition-colors ${
            onSettings ? "bg-accent/15" : "hover:bg-surface-2"
          }`}
        >
          <CogIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onQuickLog}
          aria-label={t("nav.logDose")}
          aria-expanded={quickLogOpen}
          aria-haspopup="dialog"
          title={t("nav.logDose")}
          className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
            quickLogOpen
              ? "border-accent text-accent"
              : // `page-bg` for the glyph is what the framework's solid buttons
                // use, so the mark stays legible on the fill in both themes.
                "border-accent bg-accent text-page-bg hover:bg-accent/90"
          }`}
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
