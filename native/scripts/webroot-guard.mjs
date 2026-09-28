// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// What the phone app's webroot must never carry, checked over the collected
// `dist/` before `bundle-web.mjs` zips it. Kept apart from the bundle script
// so a root test can drive it without running a build.
//
//   - A service worker (`sw.js`). The phone app's files ship inside the binary
//     and a new version arrives through the App Store, so a worker would only
//     stand a staler cache in front of files already on local disk, and its
//     update prompt would offer something nobody can act on. VITE_SHELL_BUILD
//     is what leaves it out; this is the check that the build honoured it.
//   - The author's GitHub handle, anywhere. A store app carries no link back
//     to the source — no repository, issues, releases or sponsor link, and no
//     trace of the web edition's host — by owner decision, with no exceptions.
//     VITE_EMBEDDED_BUILD strips the site's own traces; this catches the rest.
//
// A `dist/` left by a plain website build, which `--skip-build` would re-zip,
// carries both.

/** The handle no file in a store app may name. */
export const FORBIDDEN = "niclaslindstedt";

/** A service worker's file name, at any depth. */
const WORKER = /(^|\/)sw\.m?js$/;

/**
 * The reasons a webroot cannot ship, given it as `{ "path": bytes }` with
 * forward-slash paths relative to its root. Empty when it can.
 * @param {Record<string, Uint8Array>} files
 * @returns {string[]}
 */
export function webrootProblems(files) {
  const problems = [];
  const workers = Object.keys(files).filter((path) => WORKER.test(path));
  if (workers.length) {
    problems.push(
      `${workers.join(", ")} is a service worker — the phone app is the ` +
        `shell edition, built with VITE_SHELL_BUILD=on, and carries none.`,
    );
  }
  const tainted = Object.entries(files)
    .filter(([, bytes]) =>
      Buffer.from(bytes).toString("latin1").toLowerCase().includes(FORBIDDEN),
    )
    .map(([path]) => path);
  if (tainted.length) {
    problems.push(
      `${tainted.join(", ")} name(s) "${FORBIDDEN}" — a store app carries ` +
        `no link to the source.`,
    );
  }
  return problems;
}
