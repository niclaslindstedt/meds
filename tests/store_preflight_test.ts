// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// `make store-preflight` reads the bundle id the way the build and the upload
// do: from APP_BUNDLE_ID (native/identifiers.js, native/fastlane/Appfile),
// never from a literal in app.config.js, which no longer holds one. The script
// is run for real here, because what broke was the script itself reading a
// file whose shape had moved on.

import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..");

function preflight(bundleId: string): string {
  const run = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--disable-warning=ExperimentalWarning",
      "scripts/store-preflight.mjs",
    ],
    {
      cwd: root,
      encoding: "utf8",
      // An empty value wins over native/.env, so "" reads as unset.
      env: { ...process.env, APP_BUNDLE_ID: bundleId },
    },
  );
  return `${run.stdout}${run.stderr}`;
}

describe("store-preflight's bundle id", () => {
  it("takes it from APP_BUNDLE_ID, as the build and the Appfile do", () => {
    const out = preflight("se.example.meds");
    expect(out).not.toMatch(/could not read BUNDLE_ID/);
    expect(out).toMatch(/bundle id se\.example\.meds \(APP_BUNDLE_ID\)/);
  });

  it("says the variable is missing when it is", () => {
    const out = preflight("");
    expect(out).not.toMatch(/could not read BUNDLE_ID/);
    expect(out).toMatch(/APP_BUNDLE_ID is not set/);
  });
});
