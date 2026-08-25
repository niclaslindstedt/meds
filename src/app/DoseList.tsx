// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { DoseRow } from "./DoseRow.tsx";
import { dosesByTime, type Dose } from "./schedule.ts";
import { formatTime } from "./format.ts";

// A day's doses as a tappable checklist, grouped by time slot. Shared between
// the Today screen (where it is the whole screen) and the Calendar screen's
// selected-day card (where it is how a forgotten evening gets logged after
// the fact) — logging has to feel identical in both places, because it is the
// same act.
//
// The grouping is this component's whole contribution: the rows themselves
// are `DoseRow`, which the quick-log sheet renders too (in likelihood order
// rather than by slot). One row, one write path, two arrangements.

type Props = {
  doses: Dose[];
  /** Tick or untick one dose. `takenAt` is null to retract. */
  onToggle: (dose: Dose, takenAt: string | null) => void;
};

export function DoseList({ doses, onToggle }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {dosesByTime(doses).map(({ time, doses: group }) => (
        <section key={time}>
          <h3 className="px-1 text-xs font-bold tracking-wide text-muted uppercase tabular-nums">
            {formatTime(time)}
          </h3>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {group.map((dose) => (
              <li key={dose.key}>
                <DoseRow dose={dose} onToggle={onToggle} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
