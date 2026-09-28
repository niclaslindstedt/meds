// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Builds the web app and packs its `dist/` into one asset —
// `native/assets/webroot.zip` — that the wrapper bundles, unpacks on first
// launch and serves over a loopback HTTP server (src/local-server.ts). That is
// what makes the app self-contained: the medication log runs entirely on-device,
// and changes only when a new build ships to the store.
//
// The web build is a plain `npm run build` at the repo root — base `/`, which
// is exactly what a localhost origin wants — and NOTHING in `src/` is changed
// for the app. If the wrapper ever needs the web app to behave differently,
// that is a sign it has stopped being thin. It sets three variables:
//
//   - VITE_EMBEDDED_BUILD, about the channel: it leaves the web edition's
//     link-preview tags and its GitHub Pages `CNAME` out of the build (see
//     `vite.config.ts`).
//   - VITE_SHELL_BUILD, about the medium, exactly as for the desktop shell:
//     the files already ship inside the binary and a new version arrives
//     through the App Store, so there is no service worker (`sw.js`; it would
//     only stand a staler cache in front of files on local disk) and no update
//     prompt nobody can act on.
//   - VITE_APP_NAME, the name the app calls itself inside — the listing name
//     from APP_DISPLAY_NAME, resolved by `../identifiers.js` exactly as
//     `expo.name` is, so the wordmark and the name under the icon cannot
//     disagree. Unset (a plain checkout), both are the project's own name.
//
// The flags are build-time, so `--skip-build` re-zips whatever the last build
// left in `dist/` — and a website build there carries the service worker and
// the link-preview tags. The zip is refused when either is found in it
// (`webroot-guard.mjs`).
//
// Usage:
//   node scripts/bundle-web.mjs                 # build the site, then zip it
//   node scripts/bundle-web.mjs --skip-build    # re-zip an existing dist/
//   node scripts/bundle-web.mjs --profile production
//
// `--profile` is accepted (and echoed) so the release scripts and the CI
// workflow can pass the EAS profile through uniformly. It does not change the
// build today — the web app has no profile-dependent output — but the seam is
// where a "strip the developer menu from store builds" knob would land, and
// having the plumbing already correct is cheaper than retrofitting it.
//
// The zip is a build artifact (gitignored). Generate it before `eas build`;
// the root `.easignore` is what keeps it in the EAS upload despite that.

import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { zipSync } from "fflate";

import { webrootProblems } from "./webroot-guard.mjs";

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO_DIR = resolve(APP_DIR, "..");
const DIST_DIR = join(REPO_DIR, "dist");
const OUT_ZIP = join(APP_DIR, "assets", "webroot.zip");
const WINDOWS = process.platform === "win32";
const NPM = WINDOWS ? "npm.cmd" : "npm";

// The listing name, from the one module that reads it (APP_DISPLAY_NAME, or
// the project's own name when unset).
const { DISPLAY_NAME } = createRequire(import.meta.url)("../identifiers.js");

const skipBuild = process.argv.includes("--skip-build");
const profileArg = process.argv.indexOf("--profile");
const profile =
  (profileArg >= 0 ? process.argv[profileArg + 1] : undefined) ??
  process.env.EAS_BUILD_PROFILE ??
  "preview";

if (!skipBuild) {
  console.log(
    `• building the web app (npm run build) — "${DISPLAY_NAME}", profile ${profile}…`,
  );
  execFileSync(NPM, ["run", "build"], {
    cwd: REPO_DIR,
    stdio: "inherit",
    // npm on Windows is a batch shim, which Node cannot execute directly.
    shell: WINDOWS,
    env: {
      ...process.env,
      VITE_EMBEDDED_BUILD: "on",
      VITE_SHELL_BUILD: "on",
      VITE_APP_NAME: DISPLAY_NAME,
    },
  });
}

/** Collect `dist/` into the flat `{ "index.html": bytes }` shape fflate wants,
 *  with forward-slash paths relative to the dist root. */
function collect(dir, files = {}) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) {
      collect(abs, files);
    } else {
      files[relative(DIST_DIR, abs).split("\\").join("/")] = new Uint8Array(
        readFileSync(abs),
      );
    }
  }
  return files;
}

let files;
try {
  files = collect(DIST_DIR);
} catch (error) {
  console.error(
    `\n✗ could not read ${DIST_DIR} — build the web app first ` +
      `(drop --skip-build, or run 'npm run build' at the repo root).\n`,
  );
  throw error;
}

const count = Object.keys(files).length;
if (count === 0 || !files["index.html"]) {
  throw new Error(
    `dist/ has no index.html (${count} files) — the web build looks empty.`,
  );
}

// Refuse a webroot that carries what only the website may: a service worker
// (`sw.js`), or anything naming the author's handle — a link back to the
// source (`webroot-guard.mjs`).
const problems = webrootProblems(files);
if (problems.length) {
  console.error(
    `\n✗ refusing the bundle:\n${problems.map((p) => `  - ${p}`).join("\n")}\n` +
      `Rebuild through this script (not --skip-build over a plain site ` +
      `build), so VITE_EMBEDDED_BUILD=on and VITE_SHELL_BUILD=on apply.\n`,
  );
  process.exit(1);
}

// Deterministic zip: every entry pinned to the ZIP epoch (1980-01-01), so the
// artifact is reproducible instead of drifting with the clock.
const zipped = zipSync(files, { mtime: new Date("1980-01-01T00:00:00Z") });
mkdirSync(dirname(OUT_ZIP), { recursive: true });
writeFileSync(OUT_ZIP, zipped);

console.log(
  `✓ wrote ${OUT_ZIP} — ${count} files, ${(zipped.length / 1024).toFixed(0)} KB`,
);
