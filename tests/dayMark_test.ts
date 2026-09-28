// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Which mark a calendar day wears. The counts say what a day's log holds; the
// clock says what that means — a day still ahead has no state at all, today
// is open while anything remains, and only a finished day can read as missed.

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";
import { describe, expect, it } from "vitest";

import { toneFor } from "../src/app/DayMark.tsx";
import type { DayProgress } from "../src/app/schedule.ts";

const TODAY = "2026-09-28" as DayKey;
const YESTERDAY = "2026-09-27" as DayKey;
const TOMORROW = "2026-09-29" as DayKey;
const NEXT_MONTH = "2026-10-15" as DayKey;

const progress = (
  status: DayProgress["status"],
  due = 2,
  taken = 0,
): DayProgress => ({ due, taken, status });

describe("toneFor", () => {
  it("leaves a day ahead plain, whatever it will owe", () => {
    for (const day of [TOMORROW, NEXT_MONTH]) {
      expect(toneFor(day, TODAY, progress("missed"))).toBe("none");
      expect(toneFor(day, TODAY, progress("partial", 2, 1))).toBe("none");
      expect(toneFor(day, TODAY, progress("full", 2, 2))).toBe("none");
      expect(toneFor(day, TODAY, progress("none", 0))).toBe("none");
    }
  });

  it("keeps today open while anything remains", () => {
    expect(toneFor(TODAY, TODAY, progress("missed"))).toBe("partial");
    expect(toneFor(TODAY, TODAY, progress("partial", 2, 1))).toBe("partial");
    expect(toneFor(TODAY, TODAY, progress("full", 2, 2))).toBe("full");
    expect(toneFor(TODAY, TODAY, progress("none", 0))).toBe("none");
  });

  it("calls a finished day what its counts say", () => {
    expect(toneFor(YESTERDAY, TODAY, progress("missed"))).toBe("missed");
    expect(toneFor(YESTERDAY, TODAY, progress("partial", 2, 1))).toBe(
      "partial",
    );
    expect(toneFor(YESTERDAY, TODAY, progress("full", 2, 2))).toBe("full");
    expect(toneFor(YESTERDAY, TODAY, progress("none", 0))).toBe("none");
  });
});
