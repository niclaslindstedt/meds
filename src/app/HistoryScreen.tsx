// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useMemo, type ReactNode } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import { Section } from "@niclaslindstedt/oss-framework/components";

import { formatDay, formatTime, adherencePercent } from "./format.ts";
import { HistoryChart } from "./HistoryChart.tsx";
import { ChartIcon, FlameIcon, PillIcon } from "./icons.tsx";
import { useT } from "./i18n/index.ts";
import {
  adherenceLastDays,
  dailyShares,
  medAdherence,
  missedDoses,
  streaks,
  totalTaken,
} from "./stats.ts";
import { activeMedications, type AppData } from "./types.ts";

// What the log adds up to: how reliably the doses land, where the gaps are,
// and which medication the gaps belong to.
//
// The screen is built top-down from forgiving to specific. The tiles say how
// you are doing; the chart shows *when* it slipped — one column per day, so a
// missed day is a visible notch in an otherwise full row; the per-med list
// says *what* slips, because one troublesome evening med hides inside a good
// overall number; and the missed list names the individual gaps, each still
// mendable from the Calendar. Every number comes from `stats.ts`, which
// means today-in-progress never counts against any of them.

/** The chart's window. A month: long enough that a pattern shows, short
 *  enough that each day still gets a legible column on a phone. */
const CHART_DAYS = 30;

/** The missed list's window. Two weeks — a missed dose from months ago is
 *  not something anyone acts on, and an unbounded list would bury the recent
 *  gaps that are. */
const MISSED_DAYS = 14;

type Props = {
  data: AppData;
  today: DayKey;
};

export function HistoryScreen({ data, today }: Props) {
  const t = useT();

  const week = useMemo(() => adherenceLastDays(data, today, 7), [data, today]);
  const month = useMemo(
    () => adherenceLastDays(data, today, 30),
    [data, today],
  );
  const streak = useMemo(() => streaks(data, today), [data, today]);
  const taken = useMemo(() => totalTaken(data), [data]);
  const shares = useMemo(
    () => dailyShares(data, today, CHART_DAYS),
    [data, today],
  );
  const missed = useMemo(
    () => missedDoses(data, today, MISSED_DAYS),
    [data, today],
  );
  const meds = useMemo(() => activeMedications(data), [data]);
  const perMed = useMemo(
    () =>
      meds
        .map((med) => ({ med, adherence: medAdherence(data, med, today, 30) }))
        .filter(({ adherence }) => adherence.due > 0),
    [meds, data, today],
  );

  if (taken === 0 && month.due === 0) {
    return (
      <div className="px-3 py-3">
        <div className="rounded-2xl border border-line bg-surface-3 p-6 text-center">
          <ChartIcon className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm text-muted">{t("history.empty")}</p>
        </div>
      </div>
    );
  }

  const hasChartData = shares.some((s) => s.share !== null);

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <div className="grid grid-cols-2 gap-2">
        <Stat
          label={t("history.last7")}
          value={
            week.share === null
              ? t("history.noData")
              : adherencePercent(week.share)
          }
        />
        <Stat
          label={t("history.last30")}
          value={
            month.share === null
              ? t("history.noData")
              : adherencePercent(month.share)
          }
        />
        <Stat
          label={t("history.streak")}
          value={
            <span className="flex items-center gap-1.5">
              <FlameIcon className="h-4 w-4 shrink-0 text-accent" />
              {t("history.streakDays", { count: String(streak.current) })}
            </span>
          }
        />
        <Stat label={t("history.dosesTaken")} value={String(taken)} />
      </div>

      {hasChartData && (
        <Section
          title={t("history.adherenceChart")}
          icon={<ChartIcon className="h-3.5 w-3.5" />}
        >
          <HistoryChart
            values={shares.map((s) =>
              s.share === null ? null : s.share * 100,
            )}
            labels={shares.map((s) => formatDay(s.day))}
            mark="bars"
            ariaLabel={t("history.adherenceChart")}
            desc={t("history.adherenceChartDesc", {
              count: String(CHART_DAYS),
            })}
            formatValue={(v) =>
              t("history.dayShare", { percent: `${Math.round(v)}%` })
            }
            // A share is only a share against its sign — 45 next to 20 could
            // be doses as easily as percent.
            formatTick={(v) => `${Math.round(v)}%`}
          />
        </Section>
      )}

      {perMed.length > 0 && (
        <Section
          title={t("history.byMedication")}
          icon={<PillIcon className="h-3.5 w-3.5" />}
        >
          <p className="text-xs text-muted">{t("history.byMedicationDesc")}</p>
          <ul className="flex flex-col gap-2.5">
            {perMed.map(({ med, adherence }) => (
              <li key={med.id}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium text-fg-bright">
                    {med.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">
                    {t("history.medShare", {
                      taken: String(adherence.taken),
                      due: String(adherence.due),
                    })}
                    {" · "}
                    {adherencePercent(adherence.share ?? 0)}
                  </span>
                </div>
                {/* The same bar the Today header draws, per med — one visual
                    for "how full", everywhere it is asked. */}
                <div
                  aria-hidden="true"
                  className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/60"
                >
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(adherence.share ?? 0) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        title={t("history.missed")}
        icon={<ChartIcon className="h-3.5 w-3.5" />}
      >
        {missed.length === 0 ? (
          <p className="text-sm text-muted">
            {month.share !== null && month.share >= 1
              ? t("history.perfect")
              : t("history.missedNone")}
          </p>
        ) : (
          <>
            <p className="text-xs text-muted">{t("history.missedDesc")}</p>
            <ul className="flex flex-col gap-1 text-sm">
              {missed.map(({ day, dose }) => (
                <li
                  key={`${day}-${dose.key}`}
                  className="flex items-baseline justify-between gap-2"
                >
                  <span className="min-w-0 truncate text-fg">
                    {dose.med.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">
                    {formatDay(day)} · {formatTime(dose.time)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-3 p-3">
      <p className="text-xs tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 text-lg font-bold text-fg-bright tabular-nums">
        {value}
      </p>
    </div>
  );
}
