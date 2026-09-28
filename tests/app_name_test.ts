// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The phone app calls itself by its listing name. The name under the icon is
// `expo.name` (APP_DISPLAY_NAME through native/identifiers.js); the name in the
// top bar is `app.name`, which the web build takes from VITE_APP_NAME — and
// native/scripts/bundle-web.mjs sets that from the same DISPLAY_NAME, so the
// two cannot disagree. Every other build keeps the project's own name.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

const native = join(import.meta.dirname, "..", "native");

async function appName(): Promise<string> {
  vi.resetModules();
  const { en } = await import("../src/app/i18n/en.ts");
  return en.app.name;
}

describe("the name the app calls itself", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is the project's own name when nothing names it", async () => {
    vi.stubEnv("VITE_APP_NAME", "");
    expect(await appName()).toBe("Meds");
  });

  it("is the name the build hands it", async () => {
    vi.stubEnv("VITE_APP_NAME", " Nird Meds ");
    expect(await appName()).toBe("Nird Meds");
  });

  it("is handed over by the phone bundle, from the listing name", () => {
    const script = readFileSync(
      join(native, "scripts", "bundle-web.mjs"),
      "utf8",
    );
    expect(script).toMatch(/VITE_APP_NAME: DISPLAY_NAME/);
    expect(script).toContain('"../identifiers.js"');

    const require = createRequire(join(native, "identifiers.js"));
    const saved = process.env.APP_DISPLAY_NAME;
    try {
      process.env.APP_DISPLAY_NAME = "Nird Meds";
      delete require.cache[require.resolve(join(native, "identifiers.js"))];
      const ids = require(join(native, "identifiers.js")) as {
        DISPLAY_NAME: string;
      };
      expect(ids.DISPLAY_NAME).toBe("Nird Meds");
    } finally {
      if (saved === undefined) delete process.env.APP_DISPLAY_NAME;
      else process.env.APP_DISPLAY_NAME = saved;
      delete require.cache[require.resolve(join(native, "identifiers.js"))];
    }
  });
});
