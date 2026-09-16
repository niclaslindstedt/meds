// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useCallback, useState } from "react";

import {
  CheckIcon,
  ContextMenu,
  type FloatingPoint,
  type RowAction,
} from "@niclaslindstedt/oss-framework/components";
import {
  useDesktopPointer,
  useLongPress,
} from "@niclaslindstedt/oss-framework/hooks";

import type { Dose } from "./schedule.ts";
import { formatMoment, formatTime } from "./format.ts";
import { SkippedIcon } from "./icons.tsx";
import { useT } from "./i18n/index.ts";

// One dose, as the control that logs it. Three places render this row — the
// Today screen, the Calendar's selected-day card (both through `DoseList`),
// and the quick-log sheet — and all three write through the same
// `setDoseTaken` edit. One row component so they cannot drift into three
// slightly different ways to claim the same thing.
//
// The whole row is the button, not a checkbox at the end of it. The tap this
// app exists to shave down happens standing at a bathroom shelf with a glass
// in the other hand; a 44px full-width target is hittable without looking, a
// 20px checkbox is not. The check glyph at the right is the state, the row is
// the control.
//
// The row holds a second answer as well as the first: the dose you decided
// against (see `types.ts`). It is deliberately *not* a second control beside
// the tap — a "skip" button next to every row would put a second target in a
// place the app spent its whole design budget making one big one, and would
// ask the question at every dose when the answer is nearly always the tap. So
// it is the press the platform already reserves for "the other thing you
// might mean": a long press where the finger is already resting, the context
// menu where there is a pointer to right-click with. Skipping is rare, and it
// is fine for a rare thing to be the second gesture — what it must not be is
// a third way to log a dose, which is why the tap itself is untouched and a
// skipped row is still one tap from taken.
//
// A row that cannot be skipped (`onSkip` omitted) keeps neither gesture: the
// as-needed panel's logged doses were never due, so there is nothing there to
// decline.

type Props = {
  dose: Dose;
  /** Tick or untick this dose. `takenAt` is null to retract. */
  onToggle: (dose: Dose, takenAt: string | null) => void;
  /** Set this dose aside, or put it back. `skippedAt` is null to put it back.
   *  Omitted for a dose that was never due, which has nothing to decline. */
  onSkip?: (dose: Dose, skippedAt: string | null) => void;
  /** Carry the slot on the row itself. The checklist groups by time and puts
   *  the slot in the group heading; the quick-log sheet is one flat list
   *  ordered by likelihood, so there each row has to say its own time. */
  showTime?: boolean;
  /** Draw the row back, for a dose the surrounding list has already set
   *  aside — the quick-log sheet's "already taken" tail. Still a live
   *  control: a mistap has to be one tap to undo. */
  subdued?: boolean;
};

export function DoseRow({ dose, onToggle, onSkip, showTime, subdued }: Props) {
  const t = useT();
  const taken = dose.takenAt !== null;
  const skipped = dose.skippedAt !== null;
  const slot = formatTime(dose.time);
  // "Taken 8:32 AM" is only worth saying *against* the slot it was due at —
  // it is the row's one piece of information the check glyph does not already
  // carry. When the row is showing that slot and the tap landed in the same
  // minute, the note is the slot repeated, which is how an as-needed dose
  // reads every time: its key *is* the minute it was taken (see
  // `asNeededOn`), so the slot and the note are the same claim by
  // construction. Say it once.
  const at = taken ? formatMoment(dose.takenAt!) : "";
  const sayWhen = taken && !(showTime && at === slot);
  // "Skipped" carries no moment: unlike a tap, which is a claim about when
  // something entered a body, the minute a decision was made says nothing
  // anybody reads the row for.
  const note = sayWhen
    ? t("today.takenAt", { time: at })
    : skipped
      ? t("today.skipped")
      : "";
  const subtitle = dose.med.dose || note;

  // Which press means "the other thing": a long press under a finger, the
  // context menu under a pointer. The same split the framework's own row menu
  // makes (`RowActionMenu`) — what differs is that a finger gets the decision
  // itself rather than a menu to pick it from, because there is exactly one
  // other thing this row can do and a sheet to say so would cost the gesture
  // its whole point.
  const desktop = useDesktopPointer();
  const [menuAt, setMenuAt] = useState<FloatingPoint | null>(null);
  const toggleSkip = useCallback(() => {
    onSkip?.(dose, skipped ? null : new Date().toISOString());
  }, [onSkip, dose, skipped]);
  const longPress = useLongPress(toggleSkip, {
    enabled: onSkip !== undefined && !desktop,
  });
  const onContextMenu = useCallback(
    (e: { preventDefault: () => void; clientX: number; clientY: number }) => {
      if (onSkip === undefined) return;
      // Prevented on touch too, where nothing opens: the long press below is
      // this row's answer, and the platform's own callout arriving over it is
      // the one thing that would stop it landing.
      e.preventDefault();
      if (desktop) setMenuAt({ x: e.clientX, y: e.clientY });
    },
    [onSkip, desktop],
  );
  const actions: RowAction[] = [
    {
      label: t(skipped ? "today.putBack" : "today.skip"),
      icon: <SkippedIcon className="h-4 w-4" />,
      onSelect: toggleSkip,
    },
  ];

  return (
    // `select-none` and the iOS callout suppression are what make a long
    // press a long press rather than a text selection — the same pair the
    // framework's row menu wears.
    <div
      onContextMenu={onContextMenu}
      className="select-none [-webkit-touch-callout:none]"
      {...longPress}
    >
      <button
        type="button"
        onClick={() => onToggle(dose, taken ? null : new Date().toISOString())}
        aria-pressed={taken}
        aria-label={t(taken ? "today.markNotTaken" : "today.markTaken", {
          name: dose.med.name,
        })}
        // The row wears the app's one grammar: filled means it happened,
        // hollow means it is still open. A taken row keeps its text legible
        // rather than greying out — the list is a record as well as a to-do —
        // except where the caller has explicitly set it aside.
        //
        // A skipped row is the third thing, and it is drawn as neither: a
        // dashed outline, which is the one border weight the grammar has not
        // spent, for a row that is on the day without being owed by it. No
        // danger tint anywhere near it — that is reserved for the day that
        // owed doses and got none, and this day did not owe this one.
        className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
          taken
            ? "border-accent/40 bg-accent/10"
            : skipped
              ? "border-line border-dashed bg-surface-3/60 hover:bg-surface-2"
              : "border-line bg-surface-3 hover:bg-surface-2"
        } ${
          // Drawn back, but only far enough. The caller's `subdued` is a row
          // filed away at the bottom of a list; a skipped row is in the middle
          // of the checklist and still says a thing worth reading, so it stops
          // short of the same fade.
          subdued ? "opacity-55" : skipped ? "opacity-75" : ""
        }`}
      >
        {/* The slot is a *column*: every row in a list is rendered by this
            component and formatted by the same `formatTime`, so reserving the
            width its format needs lines the names up under each other. Two
            widths rather than one, because "08:00" and "12:00 PM" are not the
            same size of thing and a box built for the second leaves a gutter
            you could park a bus in beside the first. */}
        {showTime && (
          <span
            className={`shrink-0 text-xs font-bold text-muted tabular-nums ${
              slot.length > 5 ? "w-[4.25rem]" : "w-11"
            }`}
          >
            {slot}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm font-medium text-fg-bright ${
              skipped ? "line-through decoration-muted" : ""
            }`}
          >
            {dose.med.name}
          </span>
          {subtitle && (
            <span className="block truncate text-xs text-muted">
              {dose.med.dose}
              {dose.med.dose && note && " · "}
              {note}
            </span>
          )}
        </span>
        {/* The state glyph: a filled accent disc with a check, the hollow ring
            it will fill, or — for a dose set aside — that ring with a rule
            through it. All 28px so the row never shifts as it changes. */}
        <span
          aria-hidden="true"
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            taken
              ? "border-accent bg-accent text-page-bg"
              : skipped
                ? "border-dashed border-line text-muted"
                : "border-line text-transparent"
          }`}
        >
          {skipped ? (
            <SkippedIcon className="h-4 w-4" />
          ) : (
            <CheckIcon className="h-4 w-4" />
          )}
        </span>
      </button>

      <ContextMenu
        position={menuAt}
        actions={actions}
        onClose={() => setMenuAt(null)}
        ariaLabel={t("today.doseActions", { name: dose.med.name })}
      />
    </div>
  );
}
