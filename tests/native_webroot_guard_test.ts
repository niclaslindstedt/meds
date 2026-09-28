// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The phone bundle is the shell edition: `native/scripts/bundle-web.mjs`
// builds with VITE_SHELL_BUILD=on, so the webroot holds no service worker and
// the app shows no update prompt, and the guard it runs over `dist/` refuses a
// webroot that holds a worker or a link back to the source anyway — the
// `--skip-build` path re-zips whatever a website build left there.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const scripts = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "native",
  "scripts",
);

type Guard = {
  webrootProblems: (files: Record<string, Uint8Array>) => string[];
};

const guardPath = join(scripts, "webroot-guard.mjs");
const { webrootProblems } = (await import(guardPath)) as Guard;

function webroot(files: Record<string, string>): Record<string, Uint8Array> {
  return Object.fromEntries(
    Object.entries(files).map(([path, text]) => [
      path,
      new TextEncoder().encode(text),
    ]),
  );
}

describe("the phone webroot guard", () => {
  it("passes an app webroot", () => {
    expect(
      webrootProblems(
        webroot({
          "index.html": "<!doctype html>",
          "version.json": "{}",
          "assets/index.js": "console.log(1)",
        }),
      ),
    ).toEqual([]);
  });

  it("refuses a service worker", () => {
    const problems = webrootProblems(
      webroot({ "index.html": "<!doctype html>", "sw.js": "self.skip()" }),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/sw\.js is a service worker/);
  });

  it("refuses a link back to the source", () => {
    const problems = webrootProblems(
      webroot({ "index.html": "https://github.com/NiclasLindstedt/meds" }),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/index\.html/);
  });
});

describe("the phone bundle script", () => {
  const script = readFileSync(join(scripts, "bundle-web.mjs"), "utf8");

  it("builds the shell edition", () => {
    expect(script).toMatch(/VITE_SHELL_BUILD: "on"/);
    expect(script).toMatch(/VITE_EMBEDDED_BUILD: "on"/);
  });

  it("runs the guard before it writes the zip", () => {
    const guard = script.indexOf("webrootProblems(files)");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(script.indexOf("zipSync(files"));
  });
});
