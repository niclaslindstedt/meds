# Releasing the native app

Builds run on **EAS Build** (Expo's infrastructure), not on GitHub's runners
and not on a laptop. Everything below is a one-time setup followed by a
one-click dispatch.

## One-time setup

### 1. The Expo project

```sh
cd native
npx eas-cli login
npx eas-cli init          # prints the project id
```

`eas init` normally writes the id into `app.json` — this app uses a **dynamic**
config (`app.config.js`), which it cannot write to, so the id is passed in
instead:

- **CI**: set it as the repository **secret** `EAS_PROJECT_ID`
  (Settings → Secrets and variables → Actions → Secrets).
- **Locally**: `native/.env` (`cp .env.example .env`).

### 2. The CI token

Create a **robot** access token at
`https://expo.dev/accounts/<account>/settings/access-tokens` — a robot cannot
sign in to the dashboard and owns no projects, so its blast radius is bounded —
and set it as the repository **secret** `EXPO_TOKEN`.

### 3. Store credentials

EAS holds these on the project, not in this repo:

```sh
npx eas-cli credentials          # iOS signing + Android keystore
```

For submission, `eas.json` → `submit.production` holds what is not secret
and is known before the app record exists — the Apple team — and the rest is
added or supplied as below:

| Field                       | Where it comes from                                                                                                                                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apple ID (not committed)    | Asked for by `eas submit` when it signs in; never written into `eas.json`.                                                                                                                                                                                 |
| `ascAppId`                  | App Store Connect → the app → App Information → **Apple ID** (digits). Add it under `submit.production.ios` once the app record exists; until then the key is absent, not a placeholder — `eas submit` rejects placeholder values before it does anything. |
| `appleTeamId`               | developer.apple.com → Membership details → **Team ID** (10 characters). Already in `submit.production.ios`.                                                                                                                                                |
| `play-service-account.json` | Play Console → Setup → API access → a service account key. Gitignored; upload it to EAS with `eas credentials` rather than committing it.                                                                                                                  |

### 4. No Dropbox

The phone app offers no Dropbox: the log stays on the device and leaves it
only in a backup exported through the share sheet. The build job passes no
Dropbox key to the web bundle, and `scripts/bundle-web.mjs` builds it with
`VITE_NATIVE_BUILD=on`, which leaves Dropbox out whatever the environment
holds. Nothing to set up in the Dropbox App Console for the phone.

## Cutting a build

Dispatch **Actions → native → Run workflow** and pick:

| Input      | Meaning                                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `platform` | `ios` (the default), `android` or `all`.                                                                                               |
| `profile`  | `development` (dev client), `preview` (internal, APK + simulator), `testflight` (store-signed, still ours), `production` (what ships). |
| `submit`   | Also submit to the stores. Refused on anything but `production`.                                                                       |

The job builds the web app, packs it into `native/assets/webroot.zip`, and
queues the build on EAS with `--no-wait` — it exits immediately, so watch the
build itself at <https://expo.dev>.

The **marketing version** comes from the repo root's `package.json`, so the app
and the website never disagree about which release they are. Store **build
numbers** are auto-incremented by EAS (`appVersionSource: remote`); nothing is
bumped by hand.

EAS installs with the Node that `eas.json` pins — `"node"` in every build
profile, the same major as `.nvmrc`. Without it EAS falls back to its image's
default Node, whose npm 10 reads the lockfile npm 11 wrote as out of sync and
stops the build at `npm ci` ("Missing: typescript@5.9.3 from lock file"). Move
the pin when `.nvmrc` moves.

## Doing it from a laptop instead

```sh
cd native
npm ci
npm run build:preview        # internal build
npm run build:testflight     # store-signed, to TestFlight
npm run build:production     # what ships
npm run submit
```

Each of those bundles the web app first — the wrapper serves that copy, and a
build without it launches to a blank screen.

## The App Store listing

The listing's text and screenshots go up through `make store-upload` (see
[`store/README.md`](store/README.md)); the build goes up through EAS. In App
Store Connect the listing points at the pages on apps.agilator.se:

- privacy policy: `https://apps.agilator.se/meds/privacy/`
- marketing: `https://apps.agilator.se/meds/`
- support: `https://apps.agilator.se/meds/support/`

The required screenshot sizes are the 6.9″ iPhone (1320×2868) and, since
`ios.supportsTablet` is true, the 13″ iPad (2064×2752); App Store Connect
scales each down to the smaller devices in its family. They are produced
outside this repository and staged into `store/screenshots/` by the listing
tooling — see [`store/README.md`](store/README.md#the-screenshots).

The version the store shows is the release's: `app.config.js` reads it from
the root `package.json`, which the **Release** workflow bumps when it tags
`v<version>`. Cut the release first, then build from it.

> **License note.** The source is `PolyForm-Noncommercial-1.0.0`, which
> governs what others may do with it. The copyright holder is not bound by it
> and sells the App Store build: paid up front, with no in-app purchases and no
> ads.

## Checklist before a store build

- [ ] `make lint && make test && make build` is green at the repo root.
- [ ] `make native-typecheck` is green.
- [ ] `EXPO_PUBLIC_MEDS_URL` is **unset** — a build that streams the website
      is the exact shape App Store guideline 4.2 rejects.
- [ ] The version in the root `package.json` is the one you mean to ship.
- [ ] **Settings** has no Sync section, Settings → Your data says the log
      is kept on this device only, and Settings → About links to the privacy
      policy. The log is health information and has no
      cloud destination in the phone app.
- [ ] **Export a backup** opens the share sheet on the file.
