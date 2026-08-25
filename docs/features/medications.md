# Medications

A medication is a **name**, an optional free-text **dose**, the **times of
day** it is taken — one dose per slot, so morning-and-evening is two slots —
and the **days of the week** it is taken on. That is the whole schedule on
purpose: there is still no stock counter, no prescriber field and no notes.
Every added question is paid for at every add, and the calendar already tells
the truth about any pattern by showing it.

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

The **Meds** tab lists everything, current medications first, each row
carrying its slots and — when it has one — its weekday mask. The pencil
unfolds the same form in place, plus the two ways out:

- **Stop** ends the schedule today: remaining doses leave the checklist, the
  history the med earned stays and keeps scoring against the schedule that
  existed then, and the med can be **started again** with one tap. This is
  the normal way to be done with a medication.
- **Delete** removes the medication _and every dose of it you ever logged_,
  behind a confirm dialog that says so. It exists for the entered-by-mistake
  case; if you are just done taking it, stop it instead.

Stopped medications keep their own section at the bottom of the list, so the
working list is never below the archive.
