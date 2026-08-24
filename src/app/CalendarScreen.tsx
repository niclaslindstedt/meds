// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useMemo, useState } from "react";

import type {
  DayKey,
  GridCell,
  WeekStart,
} from "@niclaslindstedt/oss-framework/calendar";

import { DayLegend, DayMark, toneFor } from "./DayMark.tsx";
import { DoseList } from "./DoseList.tsx";
import { dayProgress, dueDoses, type Dose } from "./schedule.ts";
import { formatFullDay } from "./format.ts";
import { useT } from "./i18n/index.ts";
import { MonthCalendar } from "./MonthCalendar.tsx";
import { earliestStart } from "./stats.ts";
import type { AppData } from "./types.ts";

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
};

export function CalendarScreen({ data, today, weekStartsOn, onToggle }: Props) {
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
          weekStartsOn={weekStartsOn}
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
        {selectedDoses.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t("calendar.dayEmpty")}</p>
        ) : future ? (
          <p className="mt-2 text-sm text-muted">
            {t("calendar.dayFuture", {
              count: String(selectedDoses.length),
            })}
          </p>
        ) : (
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
                onToggle={(dose, takenAt) => onToggle(selected, dose, takenAt)}
              />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
