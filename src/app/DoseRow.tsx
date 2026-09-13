// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { CheckIcon } from "@niclaslindstedt/oss-framework/components";

import type { Dose } from "./schedule.ts";
import { formatMoment, formatTime } from "./format.ts";
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

type Props = {
  dose: Dose;
  /** Tick or untick this dose. `takenAt` is null to retract. */
  onToggle: (dose: Dose, takenAt: string | null) => void;
  /** Carry the slot on the row itself. The checklist groups by time and puts
   *  the slot in the group heading; the quick-log sheet is one flat list
   *  ordered by likelihood, so there each row has to say its own time. */
  showTime?: boolean;
  /** Draw the row back, for a dose the surrounding list has already set
   *  aside — the quick-log sheet's "already taken" tail. Still a live
   *  control: a mistap has to be one tap to undo. */
  subdued?: boolean;
};

export function DoseRow({ dose, onToggle, showTime, subdued }: Props) {
  const t = useT();
  const taken = dose.takenAt !== null;
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
  const subtitle = dose.med.dose || sayWhen;
  return (
    <button
      type="button"
      onClick={() => onToggle(dose, taken ? null : new Date().toISOString())}
      aria-pressed={taken}
      aria-label={t(taken ? "today.markNotTaken" : "today.markTaken", {
        name: dose.med.name,
      })}
      // The row wears the app's one grammar: filled means it happened, hollow
      // means it is still open. A taken row keeps its text legible rather
      // than greying out — the list is a record as well as a to-do — except
      // where the caller has explicitly set it aside.
      className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
        taken
          ? "border-accent/40 bg-accent/10"
          : "border-line bg-surface-3 hover:bg-surface-2"
      } ${subdued ? "opacity-55" : ""}`}
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
        <span className="block truncate text-sm font-medium text-fg-bright">
          {dose.med.name}
        </span>
        {subtitle && (
          <span className="block truncate text-xs text-muted">
            {dose.med.dose}
            {dose.med.dose && sayWhen && " · "}
            {sayWhen && t("today.takenAt", { time: at })}
          </span>
        )}
      </span>
      {/* The state glyph: a filled accent disc with a check, or the hollow
          ring it will fill. Both 28px so the row never shifts as it is
          ticked. */}
      <span
        aria-hidden="true"
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          taken
            ? "border-accent bg-accent text-page-bg"
            : "border-line text-transparent"
        }`}
      >
        <CheckIcon className="h-4 w-4" />
      </span>
    </button>
  );
}
