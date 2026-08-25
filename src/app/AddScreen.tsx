// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import type {
  DayKey,
  WeekStart,
} from "@niclaslindstedt/oss-framework/calendar";

import { MedForm } from "./MedForm.tsx";
import { useT } from "./i18n/index.ts";
import type { Medication } from "./types.ts";

// The Add screen — reached from the quick-log sheet's footer and the Meds
// tab's button, and the first screen of an empty install (see `initialTab` in
// BottomNav.tsx). It is the `MedForm` in a card, centred in the leftover
// height the way the Today screen centres its empty state: a short form on a
// tall phone reads better in the middle of it than stranded at the top.
//
// `key`-less on purpose: the shell mounts screens per tab, so leaving for
// another tab and coming back is a fresh, blank form — which is the right
// reading of "I went away mid-add".

type Props = {
  today: DayKey;
  weekStartsOn: WeekStart;
  onSave: (med: Medication) => void;
  onCancel: () => void;
};

export function AddScreen({ today, weekStartsOn, onSave, onCancel }: Props) {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col justify-center gap-3 px-3 py-3">
      <div className="rounded-2xl border border-line bg-surface-3 p-4">
        <h2 className="text-xs font-bold tracking-wide text-accent uppercase">
          {t("meds.form.addTitle")}
        </h2>
        <div className="mt-3">
          <MedForm
            initial={null}
            today={today}
            weekStartsOn={weekStartsOn}
            onSave={onSave}
            onCancel={onCancel}
          />
        </div>
      </div>
    </div>
  );
}
