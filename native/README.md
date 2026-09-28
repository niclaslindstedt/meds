# The native wrapper

A **thin** Expo / React Native shell around the medication log, so it can ship to
the App Store and Google Play — and so it can do the things a PWA cannot:
run entirely from inside its own download, sign in to Dropbox through the
system's own authentication sheet, and hand a backup to the share sheet.

Thin is the design, not an aspiration. The wrapper:

- packs the built web app into `assets/webroot.zip`, unpacks it on first
  launch and serves it from a **loopback HTTP server** (`src/local-server.ts`);
- points a `WebView` at that origin, and gets out of the way — on iOS the
  WebView runs edge to edge and the page pads itself with
  `env(safe-area-inset-*)`, as the installed PWA does; on Android the
  safe-area bands are painted in the page's own background; on both, the
  status bar's clock and icons are light or dark from the background the page
  reports (`src/injected.ts`), never from the phone's appearance; off-origin
  links go to the system browser, and Android's back button drives the
  WebView's history;
- opens Dropbox's sign-in in an **authentication session** when the page asks
  for one (`src/authSessionBridge.ts` → `src/authSession.ts` →
  `expo-web-browser`) — see [Signing in to Dropbox](#signing-in-to-dropbox);
- hands an export to the **share sheet** when the page sends one
  (`src/saveFileBridge.ts` → `src/saveFile.ts` → `expo-file-system` and
  `expo-sharing`) — see [Exports](#exports).

That is the entire list, and it is deliberately not empty: **App Store
guideline 4.2 rejects a build that is only a viewer for a website**, so the
wrapper has to do things the browser cannot. The self-contained bundle, the
in-app sign-in and the share sheet are those things. Adding another is allowed; adding one that
makes `src/` aware of this wrapper is not.

**The wrapper adds no storage of its own.** A medication log is personal
health information: it stays on the device, or goes to the reader's own
Dropbox when they connect it, and nowhere else. A storage backend offered by
the wrapper — a container of the app's own — is exactly what that rules out
(see [`docs/features/native-app.md`](../docs/features/native-app.md)).

**Nothing in the repo's `src/` knows this exists.** The in-app sign-in works
without breaking that rule: the page looks for an authentication-session
**capability** on `window` and this installs one, so a browser — which has
none — keeps its redirect flow. The app never asks what it is running inside.

The wrapper also decides nothing about the medication log. When a dose is
due, what counts as taken and how two devices' edits reconcile are the web
app's, in `src/app/schedule.ts`, `stats.ts` and `merge.ts`.

## Layout

| Path                       | What it is                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`                  | The whole app: a WebView, a spinner, and a failure screen.                                                                         |
| `src/local-server.ts`      | Unpacks `assets/webroot.zip` and serves it on a **fixed** loopback port.                                                           |
| `src/injected.ts`          | The theme reporter injected into the page, the status-bar style chosen from its report, and the service-worker teardown.           |
| `src/authSessionBridge.ts` | **Pure.** The injected sign-in provider (`window.__ossAuthSession`) and its plumbing. Tested from the root.                        |
| `src/authSession.ts`       | Opens one sign-in in an authentication session (`expo-web-browser`) and hands back where it ended.                                 |
| `src/saveFileBridge.ts`    | **Pure.** The framework's `save-file` contract: the `window.__ossShell` descriptor, the message, the answer. Tested from the root. |
| `src/saveFile.ts`          | Binds that answer to the phone: the bytes to a cache file (`expo-file-system`), the file to the share sheet (`expo-sharing`).      |
| `src/scriptText.ts`        | **Import-free.** Splicing text safely into an injected script.                                                                     |
| `scripts/bundle-web.mjs`   | Builds the web app — named `APP_DISPLAY_NAME` inside, as under the icon — and packs `dist/` into `assets/webroot.zip`.             |

`ios/` and `android/` are **prebuild output**: regenerated from `app.config.js`
by `expo prebuild --clean`, gitignored, and the source of truth for nothing.
Never edit them.

## Working on it

```sh
make native-install      # or: npm --prefix native install
make native-bundle       # build the web app into assets/webroot.zip
make native-typecheck
make native-prebuild     # inspect what the config generates
```

Then run it on a device or simulator (needs Xcode / Android Studio):

```sh
cd native
npm run ios        # bundles the web app first, then expo run:ios
npm run android
```

`npm run bundle` must have run at least once before any native build — the
wrapper serves that zip, and without it the app launches to a blank screen.

To point a build at a deployed slot instead of the bundled copy (debugging
only — a store build must never do this):

```sh
EXPO_PUBLIC_MEDS_URL=https://meds.niclaslindstedt.se/preview/ npm run ios
```

## Signing in to Dropbox

The page's own Dropbox sign-in is a redirect: consent at dropbox.com, then
back to the page's origin with a code, which the page trades for tokens using
the PKCE verifier it kept in `sessionStorage`. That cannot finish in here.
Dropbox refuses consent inside an embedded WebView, so `App.tsx` sends an
off-origin page to Safari — and Dropbox then redirects **Safari** to the
loopback origin, which it has not registered, in a browser that does not hold
the verifier.

So the wrapper offers the page an **authentication session**
(`ASWebAuthenticationSession` on iOS, a Custom Tab on Android): a browser sheet
over the app that closes as soon as Dropbox redirects to the app's own scheme,
and hands that URL back.

```
Settings → Sync → Dropbox
   │  src/app/useSyncEngine.ts — getAuthSessionHost() is present, so
   │  connectDropboxAuthSession(appKey, host)   (oss-framework)
   ▼
window.__ossAuthSession.open(authorizeUrl)   — installed by src/authSessionBridge.ts
   │  postMessage (request)  /  injectJavaScript (answer)
   ▼
App.tsx → src/authSession.ts → WebBrowser.openAuthSessionAsync(url, "se.agilator.meds://oauth")
   │  the reader consents in the sheet; Dropbox redirects to
   │  se.agilator.meds://oauth?code=…&state=dropbox and the sheet closes
   ▼
the page checks the state, trades the code (same verifier, same redirect URI)
```

The page asks for a **capability**, not for this wrapper: the
host lives at `window.__ossAuthSession`, a name the framework owns
(`AUTH_SESSION_HOST_PROPERTY`), so the website — which has no host — keeps its
redirect flow and the desktop app keeps its loopback one. The wrapper never
sees a token: it opens an `https:` URL (nothing else is accepted) and returns
the callback URL, unread; a closed sheet comes back as `null`, which the page
treats as "cancelled" rather than as an error.

**The URL scheme is the bundle id** (`scheme: BUNDLE_ID` in `app.config.js`,
from `identifiers.js`), reverse-DNS so no other app can claim it — and so
**the redirect URI is `se.agilator.meds://oauth`** in a store build (`dev.local.meds://oauth`
in a plain checkout). Dropbox requires the exact URI to be registered, so the
Dropbox app behind `VITE_DROPBOX_APP_KEY` must list `se.agilator.meds://oauth` under
**Settings → OAuth 2 → Redirect URIs** in the
[App Console](https://www.dropbox.com/developers/apps), next to the website's
and the desktop app's. Without it Dropbox shows "Invalid redirect_uri" in the
sheet.

Other off-origin links are unchanged: they still leave for the system browser.

## Exports

A browser export is a download: an anchor clicked at a `blob:` URL. Inside a
WebView that click goes nowhere, so the page exports through the framework's
`saveFile` instead (Settings → **Export a backup**), and the wrapper takes the
other half of that contract (the framework's `docs/native-shell.md`):

```
before load   window.__ossShell = { version: 1, capabilities: ["save-file"] }
page          saveFile() → postMessage { type: "oss-framework/save-file", id, filename, mimeType, base64 }
App.tsx       → src/saveFile.ts → cache/exports/<id>/<filename> → Sharing.shareAsync
page          ← "oss-framework/save-file-result" { id, ok }
```

The file lands in the cache directory, one export at a time — the next export
clears the last, and the OS may purge it sooner — and it goes to nothing but
the share sheet; it is never logged. `blob:` and `data:` navigations are
refused rather than sent to the system browser, which could not open them.
`tests/native_save_file_test.ts` runs the round trip against the framework's
own `saveFile`.

## Things that will bite you

- **The port in `src/local-server.ts` is fixed on purpose.** A web origin is
  scheme + host + port, and `localStorage` is keyed by origin — so a random
  port would hand the WebView an empty store on every launch, and every dose
  the user logged would appear to vanish.
- **`localhost`, not `127.0.0.1`.** App Transport Security blocks the literal
  address from `WKWebView` even with exception domains declared. The failure
  mode is a silent blank page on iOS.
- **The service worker is unregistered** (`src/injected.ts`). The origin is
  stable across app updates, so a worker registered by an older build would
  keep answering from its precache after a store update had already unpacked
  the new one.

## Releasing

See [`RELEASING.md`](RELEASING.md).
