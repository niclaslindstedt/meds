// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { PlusIcon } from "@niclaslindstedt/oss-framework/components";

import { DoseRow } from "./DoseRow.tsx";
import { doseFor, type AsNeededEntry, type Dose } from "./schedule.ts";
import { clockSlot, formatTime } from "./format.ts";
import { useT } from "./i18n/index.ts";
import type { Medication } from "./types.ts";

// The "As needed" panel — the medications that are not on your day, and what
// you can do to put them there.
//
// That is the whole rule, and it is what keeps the panel honest: the moment a
// medication *is* on your day it leaves here. A medication you have started
// taking is not "as needed" any more — it is your schedule for the week the
// cold lasts — so its doses rank in the list above with every other dose you
// owe, and it is done with from the Meds tab (see `MedsScreen`). A medication
// with no times never joins your schedule at all, so it stays here, with the
// doses of it you logged today underneath its own offer.
//
// Two surfaces render it, and the difference is which entries they pass in
// (see `asNeededOn`), not how the rows look:
//
//   - **The quick-log sheet** gets every medication not currently being
//     taken. That is where an as-needed medication is reached for,
//     deliberately: Today is the list of what the day asks of you, and a
//     painkiller you may not need asks nothing.
//   - **Today and the Calendar's day card** get only the entries that already
//     have a dose logged. A painkiller sticks to the day you took it on and
//     is gone the next — which is all the stickiness a headache earns — and
//     the chip under it is there because the second one of an afternoon is
//     the likeliest next tap.
//
// A medication with a daily maximum noted on it (see `types.ts`) says where
// the day's taps stand against that number, right beside the button that adds
// to them — "2 of 3 today" — because that is the moment the question is
// actually asked. At the maximum the one-tap offer steps aside for a plainly
// labelled one, so a further dose takes meaning to: the app will always record
// a dose that was really taken, since a log that argues with you is a log that
// lies, but it will not let you walk past the number without noticing.
//
// **It is deliberately not a checklist.** The app has one visual grammar rule
// (see `DayMark.tsx`): filled means it happened, hollow means it is still
// open. A hollow row is a claim that something is outstanding — which is
// exactly what an as-needed dose is not. So an offer is a *chip*, and only a
// dose that actually happened wears the filled `DoseRow` the checklist uses.
// Same row component, same `setDoseTaken` write, one arrangement more.

type Props = {
  entries: AsNeededEntry[];
  /** Log or retract one dose — the app's one logging edit, same as every
   *  other row's. */
  onToggle: (dose: Dose, takenAt: string | null) => void;
  /** Start taking a medication that has times — which moves it out of this
   *  panel and onto every day until the Meds tab says otherwise. */
  onStartTaking: (med: Medication) => void;
  /** Say what the panel is for. The quick-log sheet does, because it offers
   *  the whole list; Today does not, because everything on it is already
   *  something you logged. */
  showHint?: boolean;
};

export function AsNeededList({
  entries,
  onToggle,
  onStartTaking,
  showHint,
}: Props) {
  const t = useT();
  if (entries.length === 0) return null;

  return (
    <section>
      <h3 className="px-1 text-xs font-bold tracking-wide text-muted uppercase">
        {t("asNeeded.title")}
      </h3>
      {showHint && (
        <p className="mt-0.5 px-1 text-xs text-muted">{t("asNeeded.hint")}</p>
      )}
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {entries.map((entry) => {
          // Where today's taps stand against the number its owner wrote down,
          // or null for the medication that has no such number — which is
          // most of them, and which renders as nothing at all.
          const allowance = entry.allowance;
          const spent = allowance !== null && allowance.left === 0;
          const over = allowance !== null && allowance.taken > allowance.max;
          const standing =
            allowance === null
              ? null
              : t(
                  over
                    ? "asNeeded.maxOver"
                    : spent
                      ? "asNeeded.maxReached"
                      : "asNeeded.maxToday",
                  {
                    taken: String(allowance.taken),
                    max: String(allowance.max),
                  },
                );
          return (
            <li
              key={entry.med.id}
              className="rounded-xl border border-line bg-surface-3 px-3 py-2.5"
            >
              <p className="truncate text-sm font-medium text-fg-bright">
                {entry.med.name}
                {entry.med.dose && (
                  <span className="font-normal text-muted">
                    {" "}
                    · {entry.med.dose}
                  </span>
                )}
              </p>

              {/* A medication with times reads its own schedule here, because
                this is the moment it matters: deciding to start it is
                deciding to take it at these times. */}
              {entry.med.times.length > 0 && (
                <p className="mt-0.5 truncate text-xs text-muted tabular-nums">
                  {entry.med.times.map(formatTime).join(" · ")}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                {entry.med.times.length === 0 ? (
                  <>
                    {/* The same write either way — one `setDoseTaken` through
                      one `doseFor`. What the maximum changes is how plainly
                      the offer is put, never whether the tap is allowed. */}
                    <Chip
                      label={t(
                        spent ? "asNeeded.logAnyway" : "asNeeded.logNow",
                      )}
                      title={t(
                        spent
                          ? "asNeeded.logAnywayLabel"
                          : "asNeeded.logNowLabel",
                        { name: entry.med.name },
                      )}
                      subdued={spent}
                      onClick={() =>
                        onToggle(
                          doseFor(entry.med, clockSlot()),
                          new Date().toISOString(),
                        )
                      }
                    />
                    {/* Three weights for three readings, and only the last
                        is a warning tint: a day still inside the number is
                        quiet detail, a day that has spent it is worth
                        reading, and a day past it is the one the app has
                        something to report about — the same grammar the
                        calendar's danger tint follows, a fact rather than a
                        verdict. */}
                    {standing !== null && (
                      <span
                        className={`text-xs tabular-nums ${
                          over
                            ? "text-danger"
                            : spent
                              ? "text-fg"
                              : "text-muted"
                        }`}
                      >
                        {standing}
                      </span>
                    )}
                  </>
                ) : (
                  <Chip
                    label={t("asNeeded.start")}
                    title={t("asNeeded.startLabel", { name: entry.med.name })}
                    onClick={() => onStartTaking(entry.med)}
                  />
                )}
              </div>

              {/* Said once, under the medication it applies to, because "this
                puts three rows on every day until you come back" is the one
                thing about starting a course that is not self-evident. */}
              {entry.med.times.length > 0 && (
                <p className="mt-1.5 text-xs text-muted">
                  {t("asNeeded.startHint")}
                </p>
              )}

              {entry.logged.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {entry.logged.map((dose) => (
                    <li key={dose.key}>
                      <DoseRow dose={dose} onToggle={onToggle} showTime />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** One offer to put this medication on your day. The chips wear the same
 *  rounded-full outline the med form's dose strengths and day pills do — an
 *  offer, in the shape this app already uses for offers — rather than the
 *  checklist's row, which means something else. */
function Chip({
  label,
  title,
  subdued,
  onClick,
}: {
  label: string;
  title: string;
  /** Draw the offer back — the day has already reached the maximum noted for
   *  this medication, so the chip stops being the obvious next tap. Still a
   *  live control, for the same reason a ticked `DoseRow` is: the record has
   *  to be able to hold what actually happened. */
  subdued?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={title}
      title={title}
      className={`flex min-h-9 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        subdued
          ? "border-line text-muted hover:bg-surface-2"
          : "border-accent/50 text-accent hover:bg-accent/10"
      }`}
    >
      <PlusIcon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
