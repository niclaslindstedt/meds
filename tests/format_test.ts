// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Presentation rules. The date strings themselves are the locale's business,
// so what is pinned is the shape (a real date in, something non-empty out;
// garbage in, the input back) and the one number rule the app enforces
// itself: the adherence percentage's flooring and its two exact ends.

import { describe, expect, it } from "vitest";

import {
  adherencePercent,
  formatDay,
  formatFullDay,
  formatTime,
  toDate,
} from "../src/app/format.ts";

describe("toDate", () => {
  it("reads a day key as a local date", () => {
    const date = toDate("2024-03-05");
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(2);
    expect(date?.getDate()).toBe(5);
  });

  it("is null for a string that is not a day", () => {
    expect(toDate("not-a-day")).toBeNull();
  });
});

describe("date formatting", () => {
  it("formats a real day and passes garbage through", () => {
    expect(formatDay("2024-03-05")).toBeTruthy();
    expect(formatDay("nope")).toBe("nope");
    expect(formatFullDay("nope")).toBe("nope");
  });
});

describe("formatTime", () => {
  it("formats a slot and passes garbage through", () => {
    // The exact rendering is the locale's; both digits must survive it.
    expect(formatTime("08:05")).toMatch(/8/);
    expect(formatTime("08:05")).toMatch(/05/);
    expect(formatTime("late")).toBe("late");
  });
});

describe("adherencePercent", () => {
  it("floors to a whole percent", () => {
    expect(adherencePercent(0.968)).toBe("96%");
    expect(adherencePercent(0.5)).toBe("50%");
  });

  it("prints 100% only for a genuinely perfect share", () => {
    expect(adherencePercent(1)).toBe("100%");
    expect(adherencePercent(0.999)).toBe("99%");
  });

  it("prints <1% for a small-but-real share and 0% only for zero", () => {
    expect(adherencePercent(0.004)).toBe("<1%");
    expect(adherencePercent(0)).toBe("0%");
  });

  it("survives nonsense", () => {
    expect(adherencePercent(Number.NaN)).toBe("0%");
    expect(adherencePercent(-1)).toBe("0%");
    expect(adherencePercent(2)).toBe("100%");
  });
});
