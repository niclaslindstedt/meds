// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useMemo, useState } from "react";

import {
  MonthCalendar,
  type DayKey,
  type GridCell,
  type WeekStart,
} from "@niclaslindstedt/oss-framework/calendar";

import { AsNeededList } from "./AsNeededList.tsx";
import { DayLegend, DayMark, toneFor } from "./DayMark.tsx";
import { DoseList } from "./DoseList.tsx";
import { asNeededOn, dayProgress, dueDoses, type Dose } from "./schedule.ts";
import { formatFullDay } from "./format.ts";
import { useT } from "./i18n/index.ts";
import { earliestStart } from "./stats.ts";
import type { AppData, Medication } from "./types.ts";

// The month view — the log at a glance, and the door to mending it.
//
// Every cell asks `dayProgress` what its day was and paints the answer behind
// the number (see `DayMark.tsx`): filled when every dose landed, hollow while
// a day is part done, the danger tint for a day that owed doses and got none.
// A month of mostly-filled dots with two red gaps in it *is* the adherence
// story, told without a single number.
//
// Tapping a day opens it below the grid as the same checklist the Today
// screen shows, live toggles included — this is where a forgotten evening is
// logged after the fact, with the day picked explicitly rather than through a
// "yesterday" special case. Future days show what will be due but take no
// taps: a dose cannot truthfully be taken tomorrow.

type Props = {
  data: AppData;
  today: DayKey;
  weekStartsOn: WeekStart;
  onToggle: (day: DayKey, dose: Dose, takenAt: string | null) => void;
  onStartTaking: (med: Medication) => void;
};

export function CalendarScreen({
  data,
  today,
  weekStartsOn,
  onToggle,
  onStartTaking,
}: Props) {
  const t = useT();
  const [selected, setSelected] = useState<DayKey>(today);

  // Recomputed per render rather than cached per day: a month of cells is a
  // few thousand map lookups, and a cache keyed by day would be one more
  // thing that can hold a stale answer after a tap below the grid.
  const start = earliestStart(data);
  const selectedDoses = useMemo(
    () => dueDoses(data, selected),
    [data, selected],
  );
  // Only the days that already have a record of one, exactly as on Today: a
  // past day is mended here, not planned.
  const selectedAsNeeded = useMemo(
    () => asNeededOn(data, selected).filter((e) => e.logged.length > 0),
    [data, selected],
  );
  const selectedProgress = dayProgress(data, selected);
  const future = selected > today;

  return (
    <div className="flex flex-1 flex-col gap-3 px-3 py-3">
      {/* `app-med-calendar` is the stylesheet hook that gives each day cell a
          stacking context of its own, so the mark `DayMark` renders can sit
          under the day number instead of over it. See styles.css. */}
      <div className="app-med-calendar rounded-2xl border border-line bg-surface-3 p-3">
        <MonthCalendar
          anchor={today}
          selected={selected}
          onSelect={setSelected}
          today={today}
          weekStartsOn={weekStartsOn}
          labels={{
            prevMonth: t("calendar.prevMonth"),
            nextMonth: t("calendar.nextMonth"),
          }}
          renderDay={(cell: GridCell) => (
            <DayMark
              tone={toneFor(cell.key, today, dayProgress(data, cell.key))}
            />
          )}
        />
        <DayLegend />
      </div>

      {start === null && (
        <p className="px-1 text-xs leading-snug text-muted">
          {t("calendar.noMeds")}
        </p>
      )}

      {/* The selected day. Its heading names the day in full — this is the
          one place a mis-tapped date would silently mislabel a dose, so the
          card says exactly which day it is about. */}
      <section className="rounded-2xl border border-line bg-surface-3 p-4">
        <h2 className="text-sm font-bold text-fg-bright">
          {formatFullDay(selected)}
        </h2>
        {selectedDoses.length === 0 &&
        (future || selectedAsNeeded.length === 0) ? (
          <p className="mt-2 text-sm text-muted">{t("calendar.dayEmpty")}</p>
        ) : future ? (
          <p className="mt-2 text-sm text-muted">
            {t("calendar.dayFuture", {
              count: String(selectedDoses.length),
            })}
          </p>
        ) : (
          <>
            {selectedDoses.length > 0 && (
              <>
                <p className="mt-1 text-xs text-muted">
                  {t("calendar.dayProgress", {
                    taken: String(selectedProgress.taken),
                    due: String(selectedProgress.due),
                  })}
                </p>
                <div className="mt-3">
                  <DoseList
                    doses={selectedDoses}
                    onToggle={(dose, takenAt) =>
                      onToggle(selected, dose, takenAt)
                    }
                  />
                </div>
              </>
            )}
            {/* The as-needed panel on a past day is how a dose taken away
                from the phone gets filed after the fact — the same act the
                checklist above serves for a scheduled one. Future days show
                neither: a dose cannot truthfully be taken tomorrow. */}
            <div className="mt-3">
              <AsNeededList
                entries={selectedAsNeeded}
                onToggle={(dose, takenAt) => onToggle(selected, dose, takenAt)}
                onStartTaking={onStartTaking}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
