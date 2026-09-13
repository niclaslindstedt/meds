# Medications

A medication is a **name**, an optional free-text **dose**, the **times of
day** it is taken — one dose per slot, so morning-and-evening is two slots —
the **days of the week** it is taken on, and whether it is on a schedule at
all, plus — for the one taken when needed at no set times — the most doses of
it you mean to take in a day and the longest stretch you mean to take it for. That is the whole schedule on purpose: there is still no stock counter,
no prescriber field and no notes. Every added question is paid for at every
add, and the calendar already tells the truth about any pattern by showing
it.

## On a schedule, or when needed

The **when to take it** section opens with that question, and "on a schedule"
is the answer it starts on — a medication with set times, every day or on the
days the mask picks.

Choose **when needed** instead and nothing is scheduled: no day owes a dose of
it, so no day can count it missed. It is not on Today either — Today is the
list of what the day asks of you, and a painkiller you may not need asks
nothing. It lives on the **Meds** tab under **As needed**, as a name and
nothing more, and you reach for it with the top bar's **+**. Two shapes fit,
and they differ in what putting it on your day means:

- **No set times** — a painkiller. The sheet offers one **Log a dose**
  button, each tap filed under the minute you took it. That dose sticks to
  that day — the panel on Today then shows it, with a chip to log another —
  and is gone the next, because a headache is not a schedule. This is the one
  shape that can carry a **daily maximum** and a **longest stretch** (below).
- **Set times, taken in stretches** — a mucolytic at 8, 12 and 18 for the
  week a cold lasts. The sheet shows those times and offers **Start taking
  it**. From then on it is not "as needed" any more but your schedule for the
  week: its times are on Today every day, owed and ranked like any other
  dose, and it drops out of the as-needed offers entirely. It stays that way
  until you open it on the Meds tab and say **Done with it** — which is the
  point, since the course does nothing unless it is kept up. The medication
  then leaves Today, stays in the As needed list ready for the next cold, and
  the stretch it just ran keeps scoring in the history.

A course only owes the times still ahead of it on the day you start it: reach
for it at ten and that day owes the noon and six o'clock doses, not the eight
o'clock one you slept through before it was on the list. Start it later than
all of them and you get the last one, because reaching for it then usually
means you have just taken it. Every day after owes all of them.

A when-needed medication carries no weekday mask, so the day pills go away:
which days you need it is not a fact about the week.

## Most in one day, and for how long

A medication taken when needed and at **no set times** gets one more, optional
line of the form — both halves of the sentence such a medication usually comes
with: _no more than three a day, and not for more than a week_.

- **Most in one day** — a number. Leave it blank, which is how it starts, and
  there is no limit.
- **For at most** — a number and a **days / weeks** dropdown, because "a week"
  is how the second half is actually said.

Fill either in and every place that offers to log a dose of it says where you
stand, beside the button: _2 of 3 today_ and _Day 4 of 7_.

Nothing else is asked these, and nothing else can carry them: a medication with
set times — a schedule's or a course's — already says how many doses a day it
owes by listing them, and already ends at its own stop date or when you say
you are done with its course. A second answer beside those could only disagree
with them. Switch such a medication to a schedule, or give it times, and both
numbers go with the question.

### The stretch is counted from your own log

Nothing is stored about it and there is nothing to start or to remember to
end. The stretch is simply **the run of days in a row you logged a dose on**,
ending today, and two rules follow from that:

- **A day you skip ends it.** The next dose starts a new stretch at day one,
  so it resets itself the first day you do without.
- **Today counts, logged or not.** Start on Monday and it is day four on
  Thursday, whether or not you have taken Thursday's dose yet — the question
  is asked before the dose as often as after it.

### Reaching one

At either ceiling the one-tap offer steps aside. The chip reads **Log one
anyway**, and the count turns to _3 of 3 today — the most you noted down_ or
_Day 7 of 7 — the longest you noted down_, so a further dose is something you
do on purpose rather than by reflex. It does still log: this is a logbook, and
a log that refuses to record a dose you actually took is a log that lies. Past
either, the count says so — _4 today — past the 3 you noted down_, _Day 9 —
past the 7 days you noted down_ — and untapping puts it straight back.

The numbers are **yours**. The app holds them and counts against them; it
never suggests one, never checks what you take against anything, and nothing
about them leaves the device. They also change no figure anywhere else: a dose
that was never scheduled cannot be missed, so the calendar, the adherence
share, the streak and the missed list read exactly as they did before you
typed them.

## Which days

"Every day" is preselected, and most medications never touch it. Turn it off
and the seven days appear as pills, all lit — switch off the ones you skip,
which is how these schedules are described out loud: _100 mg every day except
Tuesday and Thursday_. At least one day always stays on; a medication with no
days is not a schedule.

A day the medication is not scheduled on owes nothing, and **a day with
nothing due says nothing**: it is not a missed day. It leaves no gap in a
streak, no zero in the adherence chart, and nothing in the missed-dose list —
which is the whole reason the mask exists rather than being left to "just
skip it" (see [`../schedule.md`](../schedule.md)).

## Adding

The **New medication** button on the Meds tab opens the form, as does the
quick-log sheet's footer; an empty install opens on the form directly. The
name autocompletes from a **bundled catalog** of common
medications — Swedish market names with their usual strengths — and a
recognised name offers those strengths as one-tap chips under the dose
field, so the common case is a name, a chip, and Save.

The catalog is strictly a typing aid:

- It is a **bundled chunk searched locally**, never a lookup service — what
  you type into a medication field must not leave the device, and doesn't.
- Nothing is validated against it. An unlisted medication is typed by hand
  and saves exactly the same.
- The strengths are the commonly dispensed ones, not a recommendation — the
  dose field stays free text and the app never does arithmetic on it.

## Editing, stopping, deleting

The **Meds** tab lists everything in three sections — the scheduled
medications, then the as-needed ones, then the stopped ones. A scheduled row
carries its slots and, when it has one, its weekday mask. An as-needed row is
a name: it has no schedule worth printing, and the times it does have are read
where they matter — in the form, and on the sheet that offers to start it. The
one thing such a row does say is whether you are **taking now**, because that
is state rather than detail. The pencil unfolds the same form in place, plus
**Done with it** for a course that is running, and the two ways out:

- **Stop** ends the schedule today: remaining doses leave the checklist, the
  history the med earned stays and keeps scoring against the schedule that
  existed then, and the med can be **started again** with one tap. This is
  the normal way to be done with a medication.
- **Delete** removes the medication _and every dose of it you ever logged_,
  behind a confirm dialog that says so. It exists for the entered-by-mistake
  case; if you are just done taking it, stop it instead.

Stopped medications keep their own section at the bottom of the list, so the
working list is never below the archive.
