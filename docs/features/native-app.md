# The app on a phone

Meds is a PWA first: open it in a browser, add it to the home screen, and it
is an app. `native/` is the other way in — the same web app, wrapped thinly
enough to ship through the **App Store** and **Google Play**. In exchange for
that wrapper it gains what the browser cannot give it: it runs entirely from
inside its own download, and a backup leaves through the phone's share
sheet.

## What the wrapper is

A `WebView` and a loopback HTTP server, and very little else.

The whole web build is packed into the download (`assets/webroot.zip`),
unpacked on first launch, and served from `http://localhost:<fixed port>`.
Nothing is fetched. The app works on a plane, in a tunnel, and on a phone that
has never had a network — and it changes only when a new build ships to the
store, not when the website deploys.

Around that, the wrapper keeps the native chrome in step: the status bar and
the safe-area bands take the page's own theme. Links out of the app open in
the system browser. On Android the hardware back button drives the WebView's
history. **Export a backup** in Settings opens the phone's share sheet on the
file, where you can save it to Files or send it, since a WebView has no
downloads folder to put it in.

There is **no native UI**. Everything you see is the web app, unchanged.

## Where your log is kept

On the phone, **on the device, and nowhere else.** The phone app has no
cloud copy: Settings has no Sync section, and the log leaves the phone only
in a backup you export yourself through the share sheet. The website and the
desktop app keep their optional Dropbox copy; the phone app offers none.

There is **no iCloud** either, and that is a decision rather than a gap. A
medication log is personal health information, and App Store guideline
5.1.3(ii) says an app may not store personal health information in iCloud.
The wrapper adds no storage of its own.

No App Store release ever offered iCloud or Dropbox, so there is nothing to
move. A pre-release build that had either selected simply reads as **this
device** — the copy on the phone was always the working copy. A copy already
in Dropbox is left where it is, and the website or the desktop app still
reads it.

It is a build-time switch: `native/scripts/bundle-web.mjs` builds the page
with `VITE_NATIVE_BUILD=on`, and every Dropbox branch tests that variable
itself (`import.meta.env.VITE_NATIVE_BUILD === "on"`, never a constant
carried from another module), so it folds out of the phone bundle rather than
being hidden at runtime.

## What the wrapper is not allowed to do

Two rules, and they are what keep the app and the website the same product:

- **The page never asks whether it is native at runtime.** The one thing
  the phone edition does differently — no cloud copy — is decided when the
  page is built (`VITE_NATIVE_BUILD`). Everything else is a _capability_ on
  `window`: the framework's `saveFile` downloads, unless the wrapper has said
  on `window` that it takes files.
- **The wrapper decides nothing about medications.** When a
  dose is due, what counts as taken, and how two copies reconcile are the web
  app's, in `schedule.ts`, `stats.ts` and `merge.ts`.

## Building it

See [`../../native/README.md`](../../native/README.md) for the day-to-day, and
[`../../native/RELEASING.md`](../../native/RELEASING.md) for what a store build
needs.
