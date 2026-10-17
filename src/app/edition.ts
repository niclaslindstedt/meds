// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Which edition this build is. Only one fact differs, and it is the phone's:
// the App Store app offers no cloud copy at all. The log stays on the phone,
// and leaves it only in a backup the reader exports through the share sheet.
// The website and the desktop app keep Dropbox exactly as before.
//
// Set by `native/scripts/bundle-web.mjs` and nothing else, and read at build
// time: Vite inlines the comparison, so in the phone bundle every branch
// behind it folds away rather than being hidden at runtime.

/** True only in the build the phone wrapper serves. */
export const PHONE_BUILD: boolean = import.meta.env.VITE_NATIVE_BUILD === "on";
