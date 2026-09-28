// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The dose row's two answers, as a finger gives them. A tap takes the dose; a
// long press sets it aside — and only sets it aside. The press ends in a
// pointer-up, and the platform follows every pointer-up over a button with a
// click; that click must not *also* land as the tap, however long the finger
// stayed down. Before framework 3.12.0 the swallow lasted 400 ms from the
// moment the press fired, so a hold of about a second lifted into a tap and a
// just-skipped dose read as taken (D28).
//
// The DOM half of this app is otherwise untested (the domain modules carry the
// logic); this file is here because the bug lived in the gesture, not in the
// arithmetic. No mocked clock, like the rest of the suite: the hold is real.

import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { h } from "preact";
import { useState } from "preact/hooks";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DoseRow } from "../src/app/DoseRow.tsx";
import type { Dose } from "../src/app/schedule.ts";
import type { Medication } from "../src/app/types.ts";

const MED: Medication = {
  id: "m1",
  name: "Levothyroxine",
  dose: "50 µg",
  times: ["08:00"],
  asNeeded: false,
  courses: [],
  maxPerDay: null,
  maxRun: null,
  maxRunUnit: "days",
  weekdays: null,
  startDate: "2024-03-01",
  endDate: null,
  updatedAt: "2024-03-01T08:00:00.000Z",
};

/** The row over a one-dose log, so a test reads the state a user would see:
 *  both answers write back into it exactly as the app's store would. */
function Harness() {
  const [dose, setDose] = useState<Dose>({
    med: MED,
    time: "08:00",
    key: "m1@08:00",
    takenAt: null,
    skippedAt: null,
  });
  return h(DoseRow, {
    dose,
    onToggle: (d: Dose, takenAt: string | null) =>
      setDose({ ...d, takenAt, skippedAt: null }),
    onSkip: (d: Dose, skippedAt: string | null) =>
      setDose({ ...d, skippedAt, takenAt: null }),
  });
}

const hold = (ms: number) => new Promise((done) => setTimeout(done, ms));

beforeEach(() => {
  // A phone: no fine pointer, so the row takes the long press rather than
  // the context menu (`useDesktopPointer`).
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(cleanup);

describe("a dose row under a finger", () => {
  it("takes the dose on a tap", () => {
    render(h(Harness, {}));
    const row = screen.getByRole("button");
    fireEvent.pointerDown(row, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(row, { button: 0, pointerId: 1 });
    fireEvent.click(row);
    expect(row.getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps a dose held for 1.5 s skipped, not taken", async () => {
    render(h(Harness, {}));
    const row = screen.getByRole("button");
    fireEvent.pointerDown(row, { button: 0, pointerId: 1 });
    await hold(1500);
    // The press fired a second ago; the finger lifts only now, and the
    // platform's click follows the lift.
    fireEvent.pointerUp(row, { button: 0, pointerId: 1 });
    fireEvent.click(row);

    expect(row.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText(/Skipped/)).toBeTruthy();
  });

  it("lets the next tap through after a long press", async () => {
    render(h(Harness, {}));
    const row = screen.getByRole("button");
    fireEvent.pointerDown(row, { button: 0, pointerId: 1 });
    await hold(1500);
    fireEvent.pointerUp(row, { button: 0, pointerId: 1 });
    fireEvent.click(row);
    // A skipped row is one tap from taken, and that tap is a new gesture.
    fireEvent.pointerDown(row, { button: 0, pointerId: 2 });
    fireEvent.pointerUp(row, { button: 0, pointerId: 2 });
    fireEvent.click(row);
    expect(row.getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText(/Skipped/)).toBeNull();
  });
});
