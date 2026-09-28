// @vitest-environment jsdom
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// A fresh install starts the week the way the device's region does — Sunday
// on a US phone, Monday in Sweden — and anyone who has opened the app before
// keeps what they had. The calendar grid and the weekday pills both run from
// that one setting.
import { cleanup, render, screen } from "@testing-library/preact";
import type { WeekStart } from "@niclaslindstedt/oss-framework/calendar";
import { h } from "preact";
import { afterEach, describe, expect, it } from "vitest";

import { CalendarScreen } from "../src/app/CalendarScreen.tsx";
import {
  FALLBACK_WEEK_START,
  regionOf,
  weekStartFor,
} from "../src/app/regional.ts";
import { emptyDoc } from "../src/app/types.ts";
import { defaultSettings, parseSettings } from "../src/app/useAppSettings.ts";

afterEach(cleanup);

describe("weekStartFor", () => {
  it("starts a US device's week on Sunday", () => {
    expect(weekStartFor(["en-US"])).toBe(0);
    expect(weekStartFor(["es-US", "en"])).toBe(0);
  });

  it("keeps Monday in the Nordics, English interface or not", () => {
    for (const tag of ["sv-SE", "en-SE", "nb-NO", "da-DK", "fi-FI", "is-IS"]) {
      expect(weekStartFor([tag])).toBe(1);
    }
  });

  it("lets the first tag with a region decide", () => {
    expect(weekStartFor(["en", "sv-SE", "en-US"])).toBe(1);
    expect(weekStartFor(["en", "en-US", "sv-SE"])).toBe(0);
  });

  it("does not read a bare language as American", () => {
    expect(weekStartFor(["en"])).toBe(FALLBACK_WEEK_START);
    expect(weekStartFor([])).toBe(FALLBACK_WEEK_START);
    expect(weekStartFor(["", "  "])).toBe(FALLBACK_WEEK_START);
    expect(FALLBACK_WEEK_START).toBe(1);
  });

  it("reads the region out of longer and underscored tags", () => {
    expect(regionOf("zh-Hant-TW")).toBe("TW");
    expect(regionOf("en_us")).toBe("US");
    expect(regionOf("en")).toBeNull();
  });
});

describe("settings: the device's week start, and a stored choice over it", () => {
  const us = defaultSettings(0);
  const se = defaultSettings(1);

  it("starts a US install on Sunday and a Swedish one on Monday", () => {
    expect(us.weekStartsOn).toBe(0);
    expect(se.weekStartsOn).toBe(1);
    expect({ ...us, weekStartsOn: 1 }).toEqual(se);
  });

  it("keeps an existing user's Monday on a US device", () => {
    const stored = JSON.stringify({ ...se, theme: "dark" });
    expect(parseSettings(stored, us).weekStartsOn).toBe(1);
  });

  it("gives a blob with no week start the device's", () => {
    expect(
      parseSettings(JSON.stringify({ theme: "dark" }), us).weekStartsOn,
    ).toBe(0);
    expect(parseSettings("[]", us)).toEqual(us);
  });

  it("falls back to the device's week start over a nonsense value", () => {
    expect(
      parseSettings(JSON.stringify({ weekStartsOn: 9 }), us).weekStartsOn,
    ).toBe(0);
  });
});

describe("the calendar grid", () => {
  function firstColumn(weekStartsOn: WeekStart): string | null {
    render(
      h(CalendarScreen, {
        data: emptyDoc(),
        today: "2026-09-28",
        weekStartsOn,
        onToggle: () => {},
        onSkip: () => {},
        onStartTaking: () => {},
      }),
    );
    return screen.getAllByRole("columnheader")[0].getAttribute("aria-label");
  }

  it("runs Sunday first on a US week", () => {
    expect(firstColumn(weekStartFor(["en-US"]))).toBe("Sunday");
  });

  it("runs Monday first on a Swedish week", () => {
    expect(firstColumn(weekStartFor(["sv-SE"]))).toBe("Monday");
  });
});
