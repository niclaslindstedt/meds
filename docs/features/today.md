# Today

The logging screen, and the reason the app opens on it: the day's doses as a
checklist you clear, grouped by time of day.

The whole row is the tap target — the app is used one-handed, standing at a
bathroom shelf, and a 44px full-width row is hittable without looking where a
checkbox is not. Tapping logs the dose with the moment's timestamp (the row
then shows "Taken 8:04 AM"); tapping again unticks it. The header counts you
through the day, draws the same progress bar the History screen uses per
medication, and flips to **All done for today** — the app's one moment of
celebration — when the last dose lands.

Two deliberate absences:

- **No yesterday.** A forgotten evening is logged from the
  [Calendar](calendar.md), where the day is picked explicitly. A "yesterday"
  row here would double the screen for the exceptional case, and the
  fifteen-second visit would pay for it every day.
- **No skip state.** A dose is taken or it isn't; "skipped on purpose" and
  "forgot" read the same in the history, and asking which at every miss is a
  question the checklist never reads back.

On an install with no medications the screen hands over to the add form
instead — see [medications.md](medications.md).

An unfinished today is never scolded: the day only counts against the stats
once it is over (see [`../schedule.md`](../schedule.md)).
