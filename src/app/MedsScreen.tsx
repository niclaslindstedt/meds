// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useState } from "react";

import {
  addDays,
  type DayKey,
  type WeekStart,
} from "@niclaslindstedt/oss-framework/calendar";
import {
  Button,
  ConfirmDialog,
  PencilIcon,
  PlusIcon,
} from "@niclaslindstedt/oss-framework/components";

import { MedForm } from "./MedForm.tsx";
import { formatDay, formatTime, formatWeekdays } from "./format.ts";
import { PillIcon } from "./icons.tsx";
import { useT } from "./i18n/index.ts";
import { sortedMedications, type AppData, type Medication } from "./types.ts";

// The medication list: what you are on, and the one place it is edited.
//
// Editing happens in place — tapping a row's pencil unfolds the same
// `MedForm` the Add screen mounts, inside the row's own card — rather than in
// a modal or on another screen: the list is short, the context (which med am
// I changing?) is the row itself, and a phone keyboard over a modal over a
// list is two layers more than three fields deserve.
//
// Stopping is the first-class way out, deletion the guarded second. A stopped
// medication keeps every day it earned in the history and the calendar —
// which is the truthful record — and can be started again with one tap when
// the prescription comes back. Deleting exists for the entered-by-mistake
// case and says out loud that it rewrites history.

type Props = {
  data: AppData;
  today: DayKey;
  /** Passed through to the form's day pills, and used to spell a med's
   *  weekdays in the same order the calendar runs. */
  weekStartsOn: WeekStart;
  onSave: (med: Medication) => void;
  onRemove: (medId: string) => void;
  /** Leave for the add form. This tab is where a person looks for it, now
   *  that the top bar's `+` opens the quick-log sheet. */
  onAddMedication: () => void;
  onNotice: (message: string) => void;
};

export function MedsScreen({
  data,
  today,
  weekStartsOn,
  onSave,
  onRemove,
  onAddMedication,
  onNotice,
}: Props) {
  const t = useT();
  const meds = sortedMedications(data);
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Medication | null>(null);

  if (meds.length === 0) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-3 px-3 py-3">
        <div className="rounded-2xl border border-line bg-surface-3 p-6 text-center">
          <PillIcon className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm text-muted">{t("meds.empty")}</p>
          <div className="mt-4 flex justify-center">
            <Button variant="primary" onClick={onAddMedication}>
              {t("today.addFirst")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const current = meds.filter((m) => m.endDate === null);
  const stopped = meds.filter((m) => m.endDate !== null);

  const stop = (med: Medication) => {
    // The schedule ends *yesterday*: today's doses vanish from the checklist
    // the moment the med is stopped, which is what stopping means — and an
    // unfinished today must not turn into a missed day at midnight.
    onSave({
      ...med,
      endDate: addDays(today, -1),
      updatedAt: new Date().toISOString(),
    });
    setEditing(null);
    onNotice(t("meds.stoppedNotice", { name: med.name }));
  };

  const resume = (med: Medication) => {
    onSave({ ...med, endDate: null, updatedAt: new Date().toISOString() });
    setEditing(null);
    onNotice(t("meds.resumedNotice", { name: med.name }));
  };

  const rows = (list: Medication[]) => (
    <ul className="flex flex-col gap-1.5">
      {list.map((med) => (
        <li key={med.id}>
          {editing === med.id ? (
            <div className="rounded-xl border border-accent/40 bg-surface-3 p-3">
              <h3 className="text-xs font-bold tracking-wide text-accent uppercase">
                {t("meds.form.editTitle")}
              </h3>
              <div className="mt-3">
                <MedForm
                  initial={med}
                  today={today}
                  weekStartsOn={weekStartsOn}
                  onSave={(next) => {
                    onSave(next);
                    setEditing(null);
                    onNotice(t("meds.saved"));
                  }}
                  onCancel={() => setEditing(null)}
                />
              </div>
              <div className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
                {med.endDate === null ? (
                  <div className="flex flex-col gap-1">
                    <Button onClick={() => stop(med)}>{t("meds.stop")}</Button>
                    <p className="text-xs text-muted">{t("meds.stopHint")}</p>
                  </div>
                ) : (
                  <Button onClick={() => resume(med)}>
                    {t("meds.resume")}
                  </Button>
                )}
                <div className="flex flex-col gap-1">
                  <Button
                    variant="danger"
                    onClick={() => setConfirmDelete(med)}
                  >
                    {t("meds.deleteMed")}
                  </Button>
                  <p className="text-xs text-muted">{t("meds.deleteHint")}</p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`flex items-center gap-3 rounded-xl border border-line bg-surface-3 px-3 py-2.5 ${
                med.endDate !== null ? "opacity-70" : ""
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-fg-bright">
                  {med.name}
                  {med.dose && (
                    <span className="font-normal text-muted">
                      {" "}
                      · {med.dose}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted tabular-nums">
                  {med.times.map(formatTime).join(" · ")}
                  {/* Only a masked med says which days: "every day" is the
                      absence of a qualifier, and printing it on every row
                      would say nothing on all of them. */}
                  {med.weekdays !== null &&
                    ` · ${formatWeekdays(med.weekdays, weekStartsOn)}`}
                  {" — "}
                  {med.endDate !== null
                    ? t("meds.stoppedOn", { date: formatDay(med.endDate) })
                    : t("meds.startedOn", { date: formatDay(med.startDate) })}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setEditing(med.id)}
                aria-label={`${t("meds.edit")}: ${med.name}`}
                title={t("meds.edit")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <button
        type="button"
        onClick={onAddMedication}
        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-dashed border-line text-sm text-accent transition-colors hover:bg-surface-2"
      >
        <PlusIcon className="h-4 w-4" />
        {t("meds.addNew")}
      </button>
      {current.length > 0 && (
        <section>
          <h2 className="px-1 text-xs font-bold tracking-wide text-muted uppercase">
            {t("meds.current")}
          </h2>
          <div className="mt-1.5">{rows(current)}</div>
        </section>
      )}
      {stopped.length > 0 && (
        <section>
          <h2 className="px-1 text-xs font-bold tracking-wide text-muted uppercase">
            {t("meds.stopped")}
          </h2>
          <div className="mt-1.5">{rows(stopped)}</div>
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title={t("meds.deleteConfirm", { name: confirmDelete?.name ?? "" })}
        description={t("meds.deleteHint")}
        confirmLabel={t("common.delete")}
        tone="danger"
        labels={{ cancel: t("common.cancel"), close: t("common.close") }}
        onConfirm={() => {
          if (confirmDelete) {
            onRemove(confirmDelete.id);
            onNotice(t("meds.deletedNotice", { name: confirmDelete.name }));
          }
          setConfirmDelete(null);
          setEditing(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
