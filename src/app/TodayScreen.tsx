// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useMemo } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import { Button, CheckIcon } from "@niclaslindstedt/oss-framework/components";

import { AsNeededList } from "./AsNeededList.tsx";
import { DoseList } from "./DoseList.tsx";
import { asNeededOn, dueDoses, type Dose } from "./schedule.ts";
import { formatFullDay } from "./format.ts";
import { PillIcon } from "./icons.tsx";
import { useT } from "./i18n/index.ts";
import type { AppData, Medication } from "./types.ts";

// The first screen: today's doses, as a checklist you clear.
//
// Everything else in the app is a readout of what this screen records, which
// is why it opens here — the app's whole job is to make "did I take it?" a
// glance and "I just did" one tap. The header says how far through the day
// you are; the list below is grouped by time slot so the morning handful is
// one visual block; and when the last dose is ticked the header says so, in
// the one moment of colour the app allows itself.
//
// Under the checklist, and only when the day has one, is the "As needed"
// panel — and it lists what you *logged*, never what you might. An as-needed
// medication is reached for from the quick-log `+`; this screen is the list
// of what the day asks of you, and a painkiller you may not need asks
// nothing. Once one is logged it sticks to that day (and is gone the next),
// because the second one of an afternoon is the likeliest next tap.
//
// A medication you have *started taking* is not here at all: its times are
// owed, so they are in the checklist above with everything else.
//
// Deliberately not on this screen: yesterday. A forgotten evening is logged
// from the Calendar, where the day is picked explicitly — a "yesterday" row
// here would double the screen for a case that is the exception, and the
// fifteen-second visit pays for it every day.

type Props = {
  data: AppData;
  today: DayKey;
  onToggle: (day: DayKey, dose: Dose, takenAt: string | null) => void;
  /** Start taking an as-needed medication. Never actually reached from this
   *  screen — it only ever shows the entries a dose is already logged
   *  against, and those are the ones with no times to start — but the panel
   *  is one component and this is its one write it does not share. */
  onStartTaking: (med: Medication) => void;
  /** Hand-off to the Add screen, for the empty install. */
  onAddMedication: () => void;
};

export function TodayScreen({
  data,
  today,
  onToggle,
  onStartTaking,
  onAddMedication,
}: Props) {
  const t = useT();
  const doses = useMemo(() => dueDoses(data, today), [data, today]);
  // Only what the day already has a record of — see the note above.
  const asNeeded = useMemo(
    () => asNeededOn(data, today).filter((e) => e.logged.length > 0),
    [data, today],
  );
  const taken = doses.filter((d) => d.takenAt !== null).length;
  const allDone = doses.length > 0 && taken === doses.length;

  if (doses.length === 0 && asNeeded.length === 0) {
    const hasMeds = Object.keys(data.medications).length > 0;
    return (
      <div className="flex flex-1 flex-col justify-center gap-3 px-3 py-3">
        <div className="rounded-2xl border border-line bg-surface-3 p-6 text-center">
          <PillIcon className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm text-muted">
            {hasMeds ? t("today.nothingDue") : t("today.noMeds")}
          </p>
          {!hasMeds && (
            <div className="mt-4 flex justify-center">
              <Button variant="primary" onClick={onAddMedication}>
                {t("today.addFirst")}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      {/* The header card: the date, and the count that is the day's whole
          status. It flips to the accent-tinted "all done" state when the
          checklist clears — the same fill the ticked rows wear, because it is
          the same claim writ large. */}
      <div
        className={`rounded-2xl border p-4 ${
          allDone ? "border-accent/40 bg-accent/10" : "border-line bg-surface-3"
        }`}
      >
        <p className="text-xs font-bold tracking-wide text-accent uppercase">
          {t("today.title")}
        </p>
        <p className="mt-1 text-lg font-bold text-fg-bright">
          {formatFullDay(today)}
        </p>
        <p className="mt-2 flex items-center gap-2 text-sm text-fg">
          {allDone && <CheckIcon className="h-4 w-4 shrink-0 text-accent" />}
          {doses.length === 0
            ? t("today.nothingScheduled")
            : allDone
              ? t("today.allDone")
              : t("today.progress", {
                  taken: String(taken),
                  due: String(doses.length),
                })}
        </p>
        {/* The progress bar under the count: the same fact, readable from
            further away than a number. `bg-accent/45` matches the calendar's
            "all taken" fill, so the bar filling up and the day filling in are
            visibly one thing. A day that owes nothing has no share to draw —
            the bar would be a nought out of nought — so it is left off. */}
        {doses.length > 0 && (
          <div
            aria-hidden="true"
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-line/60"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-300"
              style={{ width: `${(taken / doses.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      {doses.length > 0 && (
        <DoseList
          doses={doses}
          onToggle={(dose, takenAt) => onToggle(today, dose, takenAt)}
        />
      )}

      <AsNeededList
        entries={asNeeded}
        onToggle={(dose, takenAt) => onToggle(today, dose, takenAt)}
        onStartTaking={onStartTaking}
      />
    </div>
  );
}
