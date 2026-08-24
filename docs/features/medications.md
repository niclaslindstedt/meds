# Medications

A medication is three facts: a **name**, an optional free-text **dose**, and
the **times of day** it is taken — one dose per slot, so morning-and-evening
is two slots. That is the whole schedule on purpose: there is no weekday
matrix, no stock counter, no prescriber field. Every added question would be
paid for at every add, and the calendar already tells the truth about any
pattern by showing it.

## Adding

The **+** in the top bar opens the form (an empty install opens on it
directly). The name autocompletes from a **bundled catalog** of common
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

The **Meds** tab lists everything, current medications first. The pencil
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
