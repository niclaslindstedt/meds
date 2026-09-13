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

## As needed

Below the checklist, and only when the day has one, sits the **As needed**
panel — and it lists what you _logged_, never what you might. Medications with
no schedule are reached for from the quick-log **+** (see
[medications.md](medications.md)); this screen is the list of what the day
asks of you, and a painkiller you may not need asks nothing. Once one is
logged it sticks to that day, with a chip to log another, because the second
one of an afternoon is the likeliest next tap — and it is gone the next day.

A medication you noted a **daily maximum** for says where the day stands next
to the chip that logs another — _2 of 3 today_ — and at the maximum the chip
becomes **Log one anyway**, so a further dose is deliberate rather than
reflexive. It still logs; the count just stops being silent (see
[medications.md](medications.md)).

It is deliberately not a list of hollow rows. Hollow means _still open_
everywhere else in the app, and an as-needed dose is not outstanding; so an
offer is a chip, and only a dose actually logged wears the filled row the
checklist uses.

A medication you have **started taking** is not in this panel at all. It is
not "as needed" any more but your schedule for as long as the course runs, so
its times are up in the checklist with everything else, every day until the
Meds tab says you are done with it.

## The quick-log sheet

The **+** in the top bar opens the same act from anywhere in the app: a sheet
listing today's doses as one flat list, **likeliest first**. The slot you
just passed comes top, a slot inside the next hour counts as imminent, and
anything further ahead sorts as what it is — not yet reached. What you have
already logged sits at the bottom, greyed but still tappable, so the sheet
answers "have I?" as well as "I have" and a mistap is one tap to undo.

The as-needed medications come at the foot of the pending doses, because this
is _the_ place one is reached for: a dose just swallowed is the thing this
sheet exists for. It is also where a medication taken in stretches is
started — after which it leaves the panel and ranks with the rest.

It is a modal rather than a screen on purpose: logging a dose you just took
should not cost you the month you had open on the Calendar. It blurs and
darkens the screen behind it, so the sheet reads as a layer above the app
rather than as one more panel on it. The rows are the
same rows this screen renders and every tap is the same write — one way to
mark a dose taken, two arrangements of it. The order is fixed when the sheet
opens, so nothing moves under your thumb; ticking a dose fills it in place,
and it is the next opening that files it under "already taken".

Two deliberate absences:

- **No yesterday.** A forgotten evening is logged from the
  [Calendar](calendar.md), where the day is picked explicitly. A "yesterday"
  row here would double the screen for the exceptional case, and the
  fifteen-second visit would pay for it every day.
- **No skip state.** A dose is taken or it isn't; "skipped on purpose" and
  "forgot" read the same in the history, and asking which at every miss is a
  question the checklist never reads back.

On an install with no medications the screen hands over to the add form
instead — see [medications.md](medications.md), which is also where the
sheet's **New medication** footer leads.

An unfinished today is never scolded: the day only counts against the stats
once it is over (see [`../schedule.md`](../schedule.md)).
