# Troubleshooting

## Installing and building

### `npm install` fails with `401 Unauthorized` or `404` on the framework

`@niclaslindstedt/oss-framework` resolves from GitHub Packages, which
requires auth even for public packages. Put a `read:packages` token in your
npm config once:

```sh
npm config set //npm.pkg.github.com/:_authToken <your-token>
```

The committed project `.npmrc` only pins the registry for the
`@niclaslindstedt` scope — it deliberately carries no token.

### `make lint` / `make test` fail on missing modules right after a web session opens

The session-start hook installs dependencies in the background
(`.claude/hooks/session-start.sh`); `node_modules` may still be populating.
Wait a moment and retry.

## Using the app

### A day is marked missed that shouldn't be

Open it from **Calendar** — tapping the day opens its checklist below the
grid, and ticking the doses recomputes every number instantly. Two rules
worth knowing: a day from before a medication was added owes nothing, and an
unfinished _today_ is never marked missed (it wears the hollow "still open"
mark until midnight).

### Today lists a medication you no longer take

**Meds** → the pencil on its row → **Stop this medication**. The schedule
ends (today's remaining doses disappear), the history it earned stays, and
the med can be started again later. **Delete** exists for the
entered-by-mistake case only — it also removes every dose of it you ever
logged.

### You changed a med's time and old days went red

Editing a slot changes what every scheduled day owes, including past ones —
the taps you logged at the old time no longer match a due dose. If the change
is really "from now on", the cleanest path is: stop the old medication (its
history stays scored against the old schedule) and add it again with the new
time.

### The autocomplete doesn't suggest your medication

The catalog is a bundled list of common medications, not a formulary — an
unlisted name is typed by hand and works exactly the same. Nothing is
validated against the catalog.

### The streak reads lower than you expect

The current streak ends at the first _finished_ day that owed doses and
didn't get them all. Days with nothing due are stepped over without counting,
and today only joins once it is complete. See
[schedule.md](schedule.md#the-two-rules-every-number-applies).

## Sync

### Cloud sync shows "Reconnect needed"

The provider's session lapsed (Google's token grants are short-lived; Dropbox
refreshes its own). Tap the sync glyph → **Reconnect**. Your log is safe
locally the whole time — pushes are simply held until the session is back.

### An unticked dose (or a deleted medication) came back

A removal is an absence, not a tombstone, so another device that still holds
the record re-contributes it on the next merge. Remove it on each device, or
remove it on one and let that device sync before the other opens. Prefer
**stopping** a medication over deleting it — stopping is an edit, and edits
sync. See [sync.md](sync.md#the-known-limitation-removals-come-back).

### Two devices show different logs

Check both are connected to the same account and both show the synced state
(cloud with a tick). The merge is order-independent, so once both have pulled
and pushed they converge — the union of taps, the later edit per medication.

## The PWA

### The installed app is stale after a deploy

Updates apply through the in-app prompt: the new version downloads in the
background and a toast offers **Reload** when it is ready. If the toast never
appears, close the app fully and reopen it — iOS in particular only checks
for a new worker on a fresh launch.

### The app shows an empty state but your data existed

The document is only replaced when _you_ delete it — an unreadable stored
copy is left on disk untouched and quarantined under `meds:doc:unreadable`,
and it comes back once the app finishes updating. Check Settings → About
shows the newest version, and avoid clearing site data, which is the one
thing that genuinely erases the log.

## Developer

### The demo data won't turn off

It is in-memory only — reloading the page always restores your real log.
The toggle also turns itself off when developer mode is switched off.

### Where are the logs?

Settings → Developer → the log panel (turn on **Capture console output** to
mirror `console.*` there too). The sync engine writes its own lines into the
same buffer, newest first in the sync command centre.
