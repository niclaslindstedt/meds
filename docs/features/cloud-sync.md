# Cloud sync

Optional, off by default, and always to **your own** account: connect Dropbox
or Google Drive in Settings → Sync and the app keeps one JSON file there —
the same document it stores locally, byte for byte, in a folder you can open
with the provider's own file browser.

The local copy is always the working copy, so losing the network never costs
a tap. Two copies reconcile without asking: medications by their last edit,
day logs as a union of taps — a dose ticked on the phone and another ticked
on the tablet both survive. The one honest limitation: removals are absences,
not tombstones, so an unticked dose (or a deleted medication) can come back
from a device that still holds it. Stopping a medication — the normal way to
be done with one — is an edit, and syncs cleanly.

The full protocol, the status glyphs, and the reconnection flow are
documented in [`../sync.md`](../sync.md); the build-time OAuth configuration
in [`../configuration.md`](../configuration.md).

Nothing but that one file is ever sent, to nobody but that one account. No
backend connected means no network requests at all after the page loads.
