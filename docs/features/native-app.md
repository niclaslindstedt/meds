# The app on a phone

Meds is a PWA first: open it in a browser, add it to the home screen, and it
is an app. `native/` is the other way in — the same web app, wrapped thinly
enough to ship through the **App Store** and **Google Play**. In exchange for
that wrapper it gains what the browser cannot give it: it runs entirely from
inside its own download, and Dropbox signs in without leaving the app.

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

On the phone, exactly where it is kept on the website: **on the device**, and
— only if you connect it — in **your own Dropbox**. Nowhere else.

There is **no iCloud**, and that is a decision rather than a gap. A medication
log is personal health information, and App Store guideline 5.1.3(ii) says an
app may not store personal health information in iCloud. So the phone app
offers the same two places the website does, and the wrapper adds no storage
of its own.

No App Store release ever offered iCloud, so there is nothing to move. A
pre-release build that had it selected simply reads as **this device** — the
copy on the phone was always the working copy — and the choice is forgotten.

## Dropbox

Connecting Dropbox opens Dropbox's own sign-in in a sheet over the app. You
approve there, the sheet closes, and the app is connected — the sign-in never
leaves for Safari. Closing the sheet simply leaves Dropbox unconnected. The
app never sees your Dropbox password; the sheet is Dropbox's page, and what
comes back is a one-time code the app trades for access to its own folder.

## What the wrapper is not allowed to do

Two rules, and they are what keep the app and the website the same product:

- **Nothing in `src/` knows the wrapper exists.** The web app does not check
  whether it is native. It looks for an authentication-session _capability_
  on `window` (the framework's `getAuthSessionHost`) and signs in through it
  when one is there. Exports work the same way: the framework's `saveFile`
  downloads, unless the wrapper has said on `window` that it takes files.
- **The wrapper decides nothing about medications.** When a
  dose is due, what counts as taken, and how two copies reconcile are the web
  app's, in `schedule.ts`, `stats.ts` and `merge.ts`.

## Building it

See [`../../native/README.md`](../../native/README.md) for the day-to-day, and
[`../../native/RELEASING.md`](../../native/RELEASING.md) for what a store build
needs.
