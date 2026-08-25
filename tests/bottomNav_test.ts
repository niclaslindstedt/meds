// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Which tab the app opens on, and which of the screens the bar actually
// carries. The rendering is not tested (no DOM in this suite), but both of
// those are choices rather than markup: an empty install that opens on a
// screen with nothing to say is the whole reason the first branch exists,
// and the second is what a swipe moves along.

import { describe, expect, it } from "vitest";

import {
  initialTab,
  isNavTab,
  screenEnter,
  TABS,
} from "../src/app/BottomNav.tsx";
import { emptyDoc, type AppData, type Medication } from "../src/app/types.ts";

function med(overrides: Partial<Medication> = {}): Medication {
  return {
    id: "m1",
    name: "Levothyroxine",
    dose: "50 µg",
    times: ["08:00"],
    weekdays: null,
    startDate: "2024-03-01",
    endDate: null,
    updatedAt: "2024-03-01T08:00:00.000Z",
    ...overrides,
  };
}

function docWith(meds: Medication[]): AppData {
  return {
    ...emptyDoc(),
    medications: Object.fromEntries(meds.map((m) => [m.id, m])),
  };
}

describe("initialTab", () => {
  it("opens on Add when no medications exist yet", () => {
    expect(initialTab(emptyDoc())).toBe("add");
  });

  it("opens on Today once a medication exists", () => {
    expect(initialTab(docWith([med()]))).toBe("today");
  });

  it("opens on Add again when every medication has been stopped", () => {
    expect(initialTab(docWith([med({ endDate: "2024-04-01" })]))).toBe("add");
  });
});

describe("the bar's destinations", () => {
  it("carries the four places and neither of the two actions", () => {
    expect(TABS).toEqual(["today", "calendar", "history", "meds"]);
    expect(isNavTab("add")).toBe(false);
    expect(isNavTab("settings")).toBe(false);
    for (const tab of TABS) expect(isNavTab(tab)).toBe(true);
  });

  it("opens on a screen the bar cannot light up, which is allowed", () => {
    // A first run lands on Add, which is not a destination — the top bar's
    // own button is what shows as current there.
    expect(isNavTab(initialTab(emptyDoc()))).toBe(false);
  });
});

describe("which way a screen arrives from", () => {
  // The motion is the bar's order made visible, so the thing worth pinning is
  // that it agrees with the order — a screen that slid the wrong way would
  // contradict the swipe that asked for it.

  it("moves forward down the bar and back up it", () => {
    expect(screenEnter("today", "calendar")).toBe("forward");
    expect(screenEnter("calendar", "meds")).toBe("forward");
    expect(screenEnter("meds", "today")).toBe("back");
    expect(screenEnter("history", "calendar")).toBe("back");
  });

  it("agrees with the order for every pair on the bar", () => {
    TABS.forEach((from, i) => {
      TABS.forEach((to, j) => {
        const expected = i === j ? "none" : j > i ? "forward" : "back";
        expect(screenEnter(from, to)).toBe(expected);
      });
    });
  });

  it("claims no direction for the screens the bar does not carry", () => {
    // Add and Settings are top-bar actions with no neighbours, so there is
    // no side for them to come in from.
    for (const tab of TABS) {
      expect(screenEnter(tab, "add")).toBe("none");
      expect(screenEnter("add", tab)).toBe("none");
      expect(screenEnter(tab, "settings")).toBe("none");
      expect(screenEnter("settings", tab)).toBe("none");
    }
    expect(screenEnter("add", "settings")).toBe("none");
  });

  it("claims no direction for a screen replacing itself", () => {
    for (const tab of TABS) expect(screenEnter(tab, tab)).toBe("none");
  });
});
