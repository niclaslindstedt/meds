// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useMemo, useState } from "react";

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import {
  Button,
  Modal,
  PlusIcon,
} from "@niclaslindstedt/oss-framework/components";

import { DoseRow } from "./DoseRow.tsx";
import { dueDoses, quickLogOrder, type Dose } from "./schedule.ts";
import { formatFullDay } from "./format.ts";
import { PillIcon } from "./icons.tsx";
import { useT } from "./i18n/index.ts";
import type { AppData } from "./types.ts";

// The quick-log sheet: the top bar's `+`, from any screen.
//
// The Today screen is where a day is *worked through* — grouped by slot, the
// morning handful as one visual block. This is the other thing people do with
// a medication log, and it is the more common one: a single dose, just taken,
// logged from wherever the app happened to be. Two taps from anywhere, and no
// navigation, because navigating away from the Calendar to tick one box and
// navigating back is three taps of tax on the one action the app exists for.
//
// It is not a second way to mark a dose taken. Every row is the same `DoseRow`
// the checklist renders, and every tap is the same `setDoseTaken` edit — what
// differs is the arrangement: one flat list, likeliest first (see
// `quickLogOrder`), with what you have already logged kept at the bottom and
// drawn back rather than dropped, so the sheet answers "have I?" as well as
// "I have".
//
// The `+` also used to be the only route to the add form, so the footer
// carries that route now — a person whose next thought is "actually I need to
// add the new one" should not have to go looking for the Meds tab.

type Props = {
  open: boolean;
  data: AppData;
  today: DayKey;
  /** Tick or untick one of today's doses — the app's one logging edit. */
  onToggle: (dose: Dose, takenAt: string | null) => void;
  /** Leave for the add form. */
  onAddMedication: () => void;
  onClose: () => void;
};

const TITLE_ID = "quick-log-title";

export function QuickLogModal({
  open,
  data,
  today,
  onToggle,
  onAddMedication,
  onClose,
}: Props) {
  const t = useT();
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={TITLE_ID}
      centered
      closeLabel={t("common.close")}
      footer={
        <div className="flex items-center justify-between gap-2 border-t border-line bg-surface-3 px-4 py-3">
          <button
            type="button"
            onClick={onAddMedication}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-accent hover:bg-surface-2"
          >
            <PlusIcon className="h-4 w-4" />
            {t("quickLog.newMedication")}
          </button>
          <Button variant="primary" onClick={onClose}>
            {t("quickLog.done")}
          </Button>
        </div>
      }
    >
      {/* Mounted only while the sheet is open — `Modal` renders nothing when
          it is closed — which is exactly what freezes the order below. */}
      <QuickLogBody
        data={data}
        today={today}
        onToggle={onToggle}
        onAddMedication={onAddMedication}
      />
    </Modal>
  );
}

function QuickLogBody({
  data,
  today,
  onToggle,
  onAddMedication,
}: Omit<Props, "open" | "onClose">) {
  const t = useT();
  const doses = useMemo(() => dueDoses(data, today), [data, today]);

  // The arrangement is decided once, when the sheet opens, and then held —
  // which is what the `useState` initialiser buys: this component is mounted
  // by the open sheet and unmounted with it, so "once per open" needs no
  // effect and no dependency list.
  //
  // Held, because the alternative is rows moving under the thumb. If the
  // split were re-derived every render, ticking a dose would drop it to the
  // bottom mid-tap and the second dose of a morning handful would be
  // somewhere new every time — in a list whose whole job is to be tapped
  // without looking. So a dose ticked *in this sheet* turns accent-filled
  // where it stands, and it is the next opening that files it under "already
  // taken". Which is the right moment for it: that opening is a new question.
  //
  // The clock is read here rather than in `schedule.ts`, which stays
  // clock-free: what the sheet needs is the moment it was opened at.
  const [opened] = useState(() => {
    const ordered = quickLogOrder(doses, minutesNow());
    return {
      order: ordered.map((dose) => dose.key),
      logged: new Set(
        ordered.filter((dose) => dose.takenAt !== null).map((dose) => dose.key),
      ),
    };
  });

  const ranked = useMemo(() => {
    const byKey = new Map(doses.map((dose) => [dose.key, dose]));
    const ordered = opened.order
      .map((key) => byKey.get(key))
      .filter((dose): dose is Dose => dose !== undefined);
    // A dose that appeared after the sheet opened (a medication saved in
    // another tab, a synced document landing) still belongs on the list —
    // at the end, where it cannot displace anything already under a thumb.
    const seen = new Set(opened.order);
    return [...ordered, ...doses.filter((dose) => !seen.has(dose.key))];
  }, [doses, opened]);

  const pending = ranked.filter((dose) => !opened.logged.has(dose.key));
  const already = ranked.filter((dose) => opened.logged.has(dose.key));
  const hasMeds = Object.keys(data.medications).length > 0;

  return (
    <>
      <div className="shrink-0 border-b border-line bg-surface-3 px-4 py-3">
        <h2
          id={TITLE_ID}
          className="text-xs font-bold tracking-wide text-accent uppercase"
        >
          {t("quickLog.title")}
        </h2>
        <p className="mt-0.5 text-sm text-fg-bright">
          {t("quickLog.subtitle", { date: formatFullDay(today) })}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {ranked.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <PillIcon className="h-8 w-8 text-muted" />
            <p className="text-sm text-muted">
              {hasMeds ? t("quickLog.nothingDue") : t("quickLog.noMeds")}
            </p>
            {!hasMeds && (
              <Button variant="primary" onClick={onAddMedication}>
                {t("today.addFirst")}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {pending.map((dose) => (
                  <li key={dose.key}>
                    <DoseRow dose={dose} onToggle={onToggle} showTime />
                  </li>
                ))}
              </ul>
            )}
            {already.length > 0 && (
              <section>
                <h3 className="px-1 text-xs font-bold tracking-wide text-muted uppercase">
                  {t("quickLog.alreadyTaken")}
                </h3>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {already.map((dose) => (
                    <li key={dose.key}>
                      <DoseRow
                        dose={dose}
                        onToggle={onToggle}
                        showTime
                        subdued
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/** The wall-clock moment, as minutes past midnight — the one number
 *  `quickLogOrder` needs, read at the edge so the derivation stays pure. */
function minutesNow(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
