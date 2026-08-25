// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
import { useEffect, useMemo, useState } from "react";

import type {
  DayKey,
  WeekStart,
} from "@niclaslindstedt/oss-framework/calendar";
import {
  Button,
  CloseIcon,
  PlusIcon,
} from "@niclaslindstedt/oss-framework/components";

import {
  catalogEntryFor,
  searchCatalog,
  type CatalogEntry,
} from "./catalog.ts";
import { normalizeTimes, normalizeWeekdays } from "./schedule.ts";
import { formatWeekdayName, weekdayOrder } from "./format.ts";
import { useT } from "./i18n/index.ts";
import { newMedicationId, type Medication } from "./types.ts";

// The medication form — the Add screen's whole body, and the Meds screen's
// inline editor. One component so adding and editing cannot drift apart.
//
// Three fields, and the third defaults: a name, an optional dose, and the
// time slots. The common case — one pill, every morning — is typing a name
// and pressing Save, which is the bar the app's "reduce the time spent
// adding" claim has to clear. The slots are native `<input type="time">`
// pickers: the platform's own wheel is better at times than anything this
// app could draw, and it yields the zero-padded 24-hour form the schedule
// sorts by (see `schedule.ts`).
//
// The fourth control is the weekday mask, and it is deliberately the one that
// answers itself: "Every day" starts lit, and the seven day pills only appear
// if you turn it off — at which point they all start lit and you switch off
// the days you skip. That is how these schedules are described out loud ("100
// mg every day except Tuesday and Thursday"), and it means the common case
// still costs zero taps.
//
// The name field autocompletes against the bundled medication catalog (see
// `data/medications.ts`), and a recognised name offers its common strengths
// as one-tap chips under the dose field — the two fields the form has, both
// answerable without the keyboard for a catalogued med. Strictly an aid:
// nothing is validated against the catalog, an unlisted name is typed by
// hand and saves the same, and no byte of what is typed leaves the device —
// the catalog is a bundled chunk, not a lookup service.
//
// Plain controlled inputs rather than the framework's commit-on-blur
// `LabeledInput`: a form with a Save button needs the draft to be current the
// moment Save is tapped, not after a blur the tap may race.

/** The slot a new medication starts with. Morning, because most are. */
const DEFAULT_TIME = "08:00";

/** Every weekday, for the state the day pills start from when "every day" is
 *  switched off: all of them lit, so the tap that follows is the day you
 *  skip. Normalised back to null on save — all seven *is* every day. */
const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

type Props = {
  /** The medication being edited, or null for the Add form. */
  initial: Medication | null;
  /** Which day the week starts on, so the pills run in the same order as the
   *  calendar grid (see `useAppSettings.ts`). */
  weekStartsOn: WeekStart;
  /** The day a *new* medication's schedule starts. Ignored on edit — the
   *  start date is history, not a form field. */
  today: DayKey;
  onSave: (med: Medication) => void;
  onCancel?: () => void;
};

export function MedForm({
  initial,
  today,
  weekStartsOn,
  onSave,
  onCancel,
}: Props) {
  const t = useT();
  const [name, setName] = useState(initial?.name ?? "");
  const [dose, setDose] = useState(initial?.dose ?? "");
  const [times, setTimes] = useState<string[]>(
    initial?.times ?? [DEFAULT_TIME],
  );
  // null is "every day" — the same value the document holds, so there is no
  // second representation of the schedule to keep in step.
  const [weekdays, setWeekdays] = useState<number[] | null>(
    initial?.weekdays ?? null,
  );
  const [nameMissing, setNameMissing] = useState(false);

  // The catalog rides in its own chunk (it is a few hundred rows nobody
  // needs until this form is open), fetched once the form mounts. `null`
  // until it lands — every read below treats that as an empty catalog, so a
  // slow chunk just means suggestions arrive a beat later.
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void import("./data/medications.ts").then((module) => {
      if (!cancelled) setCatalog(module.MEDICATIONS);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Suggestions show while the name field is being typed in, and go away on
  // blur or on a pick. An exact match suggests nothing — the name is already
  // there, and the list would only cover the dose field it just filled.
  const [suggesting, setSuggesting] = useState(false);
  const suggestions = useMemo(() => {
    if (!catalog || !suggesting) return [];
    if (catalogEntryFor(catalog, name)) return [];
    return searchCatalog(catalog, name);
  }, [catalog, suggesting, name]);

  // A recognised name's common strengths, offered as one-tap dose chips.
  const strengths = useMemo(
    () => (catalog ? (catalogEntryFor(catalog, name)?.strengths ?? []) : []),
    [catalog, name],
  );

  const save = () => {
    const trimmed = name.trim();
    if (trimmed === "") {
      setNameMissing(true);
      return;
    }
    // An emptied slot falls back to the default rather than blocking the
    // save: the native picker can be cleared, and "no time" is not a schedule
    // this document can hold.
    const slots = normalizeTimes(times);
    onSave({
      id: initial?.id ?? newMedicationId(),
      name: trimmed,
      dose: dose.trim(),
      times: slots.length > 0 ? slots : [DEFAULT_TIME],
      weekdays: normalizeWeekdays(weekdays),
      startDate: initial?.startDate ?? today,
      endDate: initial?.endDate ?? null,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="flex flex-col gap-1">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-fg">
            {t("meds.form.name")}
          </span>
          <input
            type="text"
            value={name}
            placeholder={t("meds.form.namePlaceholder")}
            aria-invalid={nameMissing || undefined}
            autoComplete="off"
            enterKeyHint="done"
            onInput={(e) => {
              setName((e.target as HTMLInputElement).value);
              setNameMissing(false);
              setSuggesting(true);
            }}
            onFocus={() => setSuggesting(true)}
            onBlur={() => setSuggesting(false)}
            className={`rounded-md border bg-surface px-3 py-2 text-sm text-fg-bright outline-none focus:border-accent ${
              nameMissing ? "border-danger" : "border-line"
            }`}
          />
        </label>
        {suggestions.length > 0 && (
          <ul
            aria-label={t("meds.form.suggestions")}
            className="overflow-hidden rounded-md border border-line bg-surface-3"
          >
            {suggestions.map((entry) => (
              <li key={entry.name}>
                <button
                  type="button"
                  // `preventDefault` on mousedown keeps the input focused, so
                  // the blur above cannot unmount this button before its own
                  // click lands.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setName(entry.name);
                    setNameMissing(false);
                    setSuggesting(false);
                  }}
                  className="flex w-full items-baseline justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2"
                >
                  <span className="min-w-0 truncate font-medium text-fg-bright">
                    {entry.name}
                  </span>
                  {entry.strengths.length > 0 && (
                    <span className="shrink-0 truncate text-xs text-muted">
                      {entry.strengths.join(" · ")}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        {nameMissing && (
          <span className="text-xs text-danger">
            {t("meds.form.nameMissing")}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-fg">
            {t("meds.form.dose")}
          </span>
          <input
            type="text"
            value={dose}
            placeholder={t("meds.form.dosePlaceholder")}
            autoComplete="off"
            enterKeyHint="done"
            onInput={(e) => setDose((e.target as HTMLInputElement).value)}
            className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg-bright outline-none focus:border-accent"
          />
        </label>
        {/* A recognised medication's common strengths, one tap each. The lit
            chip is the strength already in the field, so tapping it again is
            visibly a no-op rather than a mystery. */}
        {strengths.length > 0 && (
          <div
            role="group"
            aria-label={t("meds.form.commonDoses")}
            className="flex flex-wrap gap-1.5"
          >
            {strengths.map((strength) => {
              const active = dose.trim() === strength;
              return (
                <button
                  key={strength}
                  type="button"
                  onClick={() => setDose(strength)}
                  aria-pressed={active}
                  className={`rounded-full border px-2.5 py-1 text-xs tabular-nums transition-colors ${
                    active
                      ? "border-accent bg-accent/15 text-fg-bright"
                      : "border-line text-fg hover:bg-surface-2"
                  }`}
                >
                  {strength}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-fg">
          {t("meds.form.times")}
        </span>
        <p className="text-xs text-muted">{t("meds.form.timesHint")}</p>
        <ul className="mt-1 flex flex-col gap-1.5">
          {times.map((time, index) => (
            // Index keys, deliberately: a slot has no identity beyond its
            // position while it is being edited, and a value key would remount
            // the input mid-keystroke as its own value changes under it.
            <li key={index} className="flex items-center gap-2">
              <input
                type="time"
                value={time}
                onInput={(e) => {
                  const next = (e.target as HTMLInputElement).value;
                  setTimes((prev) =>
                    prev.map((prevTime, i) => (i === index ? next : prevTime)),
                  );
                }}
                className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm text-fg-bright outline-none focus:border-accent"
              />
              {/* The last slot cannot be removed — a medication with no times
                  is not a schedule — so the button leaves the row rather than
                  sitting there disabled. */}
              {times.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setTimes((prev) => prev.filter((_, i) => i !== index))
                  }
                  aria-label={t("meds.form.removeTime", { time })}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() =>
            setTimes((prev) => [...prev, prev[prev.length - 1] ?? DEFAULT_TIME])
          }
          className="mt-1 flex items-center gap-1.5 self-start rounded-md px-2 py-1.5 text-sm text-accent hover:bg-surface-2"
        >
          <PlusIcon className="h-4 w-4" />
          {t("meds.form.addTime")}
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-fg">
          {t("meds.form.days")}
        </span>
        <p className="text-xs text-muted">{t("meds.form.daysHint")}</p>
        {/* The "every day" pill and the seven day pills are one control in
            two states, so they share the chips' shape — the same rounded-full
            outline the dose strengths wear, lit with the accent when on. */}
        <div className="mt-1 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() =>
              setWeekdays((prev) => (prev === null ? [...ALL_WEEKDAYS] : null))
            }
            aria-pressed={weekdays === null}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              weekdays === null
                ? "border-accent bg-accent/15 text-fg-bright"
                : "border-line text-fg hover:bg-surface-2"
            }`}
          >
            {t("meds.form.everyDay")}
          </button>
        </div>
        {weekdays !== null && (
          <div
            role="group"
            aria-label={t("meds.form.pickDays")}
            // Seven columns rather than a wrapping row: a week reads as a
            // week, and a "Sun" that drops to a second line on a narrow
            // phone stops looking like part of one.
            className="mt-1 grid grid-cols-7 gap-1"
          >
            {weekdayOrder(weekStartsOn).map((day) => {
              const on = weekdays.includes(day);
              // The last day standing cannot be switched off — a medication
              // with no days is not a schedule — so the tap is a no-op rather
              // than a save that quietly means something else. Same rule the
              // last time slot follows.
              const last = on && weekdays.length === 1;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() =>
                    setWeekdays((prev) => {
                      const current = prev ?? [...ALL_WEEKDAYS];
                      if (!current.includes(day)) return [...current, day];
                      if (current.length === 1) return current;
                      return current.filter((d) => d !== day);
                    })
                  }
                  aria-pressed={on}
                  aria-disabled={last || undefined}
                  aria-label={formatWeekdayName(day, "long")}
                  title={formatWeekdayName(day, "long")}
                  className={`rounded-full border px-1 py-1.5 text-xs transition-colors ${
                    on
                      ? "border-accent bg-accent/15 text-fg-bright"
                      : "border-line text-muted hover:bg-surface-2"
                  }`}
                >
                  {formatWeekdayName(day)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" variant="primary">
          {t("meds.form.save")}
        </Button>
        {onCancel && <Button onClick={onCancel}>{t("common.cancel")}</Button>}
      </div>
    </form>
  );
}
