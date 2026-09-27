// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The stored backend choice (`readBackend` in `src/app/useSyncEngine.ts`).
//
// The log has two places to live: this device and the reader's own Dropbox.
// Whatever else a device has stored under the key — a retired backend from a
// pre-release build, or anything unreadable — must come back as this device,
// never as a backend with nothing behind it.

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { localCacheKey } from "@niclaslindstedt/oss-framework/storage";

import { BACKEND_KEY, readBackend } from "../src/app/useSyncEngine.ts";

/** A `localStorage` stand-in over a plain map — the tests run under node. */
function fakeStorage(entries: Record<string, string> = {}) {
  const map = new Map(Object.entries(entries));
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

const globals = globalThis as { localStorage?: unknown };
let previous: unknown;

beforeEach(() => {
  previous = globals.localStorage;
});

afterEach(() => {
  if (previous === undefined) delete globals.localStorage;
  else globals.localStorage = previous;
});

describe("readBackend", () => {
  it("is this device when nothing is stored", () => {
    globals.localStorage = fakeStorage();
    expect(readBackend()).toBe("local");
  });

  it("keeps Dropbox", () => {
    globals.localStorage = fakeStorage({ [BACKEND_KEY]: "dropbox" });
    expect(readBackend()).toBe("dropbox");
  });

  it("reads a stored iCloud choice as this device, and forgets it", () => {
    const cache = localCacheKey("icloud", "meds");
    const storage = fakeStorage({ [BACKEND_KEY]: "icloud", [cache]: "{}" });
    globals.localStorage = storage;
    expect(readBackend()).toBe("local");
    expect(storage.map.get(BACKEND_KEY)).toBe("local");
    expect(storage.map.has(cache)).toBe(false);
  });

  it("reads anything unrecognised as this device", () => {
    globals.localStorage = fakeStorage({ [BACKEND_KEY]: "gdrive" });
    expect(readBackend()).toBe("local");
  });

  it("is this device when storage cannot be read at all", () => {
    globals.localStorage = {
      getItem: () => {
        throw new Error("denied");
      },
    };
    expect(readBackend()).toBe("local");
  });
});
