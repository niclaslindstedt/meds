// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The phone app offers no Dropbox (`src/app/edition.ts`): built with
// VITE_NATIVE_BUILD=on, the backends are this device alone, whatever key the
// environment holds, and a Dropbox choice a pre-release build stored reads as
// this device. The website and the desktop app keep Dropbox exactly as before.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  if (previous === undefined) delete globals.localStorage;
  else globals.localStorage = previous;
});

/** The sync engine's module as a build with this environment sees it. */
async function engineBuiltWith(env: Record<string, string>) {
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  return import("../src/app/useSyncEngine.ts");
}

describe("the phone build", () => {
  it("offers this device alone, even with a Dropbox key set", async () => {
    const engine = await engineBuiltWith({
      VITE_NATIVE_BUILD: "on",
      VITE_DROPBOX_APP_KEY: "a-key",
    });
    expect(engine.DROPBOX_OFFERED).toBe(false);
    expect(engine.AVAILABLE_BACKENDS).toEqual(["local"]);
  });

  it("reads a stored Dropbox choice as this device, and leaves it", async () => {
    const engine = await engineBuiltWith({
      VITE_NATIVE_BUILD: "on",
      VITE_DROPBOX_APP_KEY: "a-key",
    });
    const storage = fakeStorage({ [engine.BACKEND_KEY]: "dropbox" });
    globals.localStorage = storage;
    expect(engine.readBackend()).toBe("local");
    expect(storage.map.get(engine.BACKEND_KEY)).toBe("dropbox");
  });
});

describe("the website and the desktop build", () => {
  it("offer Dropbox once a key is set", async () => {
    const engine = await engineBuiltWith({ VITE_DROPBOX_APP_KEY: "a-key" });
    expect(engine.DROPBOX_OFFERED).toBe(true);
    expect(engine.AVAILABLE_BACKENDS).toEqual(["local", "dropbox"]);
  });

  it("hide it without a key, as before", async () => {
    const engine = await engineBuiltWith({ VITE_DROPBOX_APP_KEY: "" });
    expect(engine.DROPBOX_OFFERED).toBe(false);
    expect(engine.AVAILABLE_BACKENDS).toEqual(["local"]);
  });

  it("keep a stored Dropbox choice", async () => {
    const engine = await engineBuiltWith({ VITE_DROPBOX_APP_KEY: "a-key" });
    globals.localStorage = fakeStorage({ [engine.BACKEND_KEY]: "dropbox" });
    expect(engine.readBackend()).toBe("dropbox");
  });
});
