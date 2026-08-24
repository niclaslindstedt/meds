// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { CheckIcon } from "@niclaslindstedt/oss-framework/components";

import { dosesByTime, type Dose } from "./schedule.ts";
import { formatTime } from "./format.ts";
import { useT } from "./i18n/index.ts";

// A day's doses as a tappable checklist, grouped by time slot. Shared between
// the Today screen (where it is the whole screen) and the Calendar screen's
// selected-day card (where it is how a forgotten evening gets logged after
// the fact) — logging has to feel identical in both places, because it is the
// same act.
//
// The whole row is the button, not a checkbox at the end of it. The tap this
// app exists to shave down happens standing at a bathroom shelf with a glass
// in the other hand; a 44px full-width target is hittable without looking,
// a 20px checkbox is not. The check glyph at the right is the state, the row
// is the control.

type Props = {
  doses: Dose[];
  /** Tick or untick one dose. `takenAt` is null to retract. */
  onToggle: (dose: Dose, takenAt: string | null) => void;
};

export function DoseList({ doses, onToggle }: Props) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3">
      {dosesByTime(doses).map(({ time, doses: group }) => (
        <section key={time}>
          <h3 className="px-1 text-xs font-bold tracking-wide text-muted uppercase tabular-nums">
            {formatTime(time)}
          </h3>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {group.map((dose) => {
              const taken = dose.takenAt !== null;
              return (
                <li key={dose.key}>
                  <button
                    type="button"
                    onClick={() =>
                      onToggle(dose, taken ? null : new Date().toISOString())
                    }
                    aria-pressed={taken}
                    aria-label={t(
                      taken ? "today.markNotTaken" : "today.markTaken",
                      { name: dose.med.name },
                    )}
                    // The row wears the app's one grammar: filled means it
                    // happened, hollow means it is still open. A taken row
                    // keeps its text legible rather than greying out — the
                    // list is a record as well as a to-do.
                    className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                      taken
                        ? "border-accent/40 bg-accent/10"
                        : "border-line bg-surface-3 hover:bg-surface-2"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-fg-bright">
                        {dose.med.name}
                      </span>
                      {(dose.med.dose || taken) && (
                        <span className="block truncate text-xs text-muted">
                          {dose.med.dose}
                          {dose.med.dose && taken && " · "}
                          {taken &&
                            t("today.takenAt", {
                              time: clockTime(dose.takenAt!),
                            })}
                        </span>
                      )}
                    </span>
                    {/* The state glyph: a filled accent disc with a check, or
                        the hollow ring it will fill. Both 28px so the row
                        never shifts as it is ticked. */}
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
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** An ISO timestamp as a wall-clock time ("21:03" / "9:03 PM"), for the
 *  "taken at" note on a ticked row. Local time, because that is when the tap
 *  happened for the person who tapped. */
function clockTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
