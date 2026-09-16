# History

What the log adds up to, from forgiving to specific:

- **The tiles** — adherence over the last 7 and 30 days, the current streak,
  and the total doses ever logged.
- **The daily chart** — one column per day over the last month, so a missed
  day is a visible notch in an otherwise full row and a gap week is
  unmissable. Days with nothing scheduled are gaps in the chart, not zeroes.
- **By medication** — the same 30-day window scored per med, because one
  troublesome evening medication hides inside a good overall number. Each
  row draws the same progress bar the Today header uses.
- **Missed doses** — the individual gaps, by name, day and slot, over the
  last two weeks. Recent only, because a miss from May is not something
  anyone acts on in September — and each one is still mendable from the
  [Calendar](calendar.md).

Every figure applies the two rules documented in
[`../schedule.md`](../schedule.md): an unfinished today never counts against
you, and a day with nothing due says nothing. The second is what keeps
[medications taken when needed](medications.md) out of the numbers — a day
nobody needed the painkiller owed nothing, so it neither dents a share nor
breaks a streak. The stretches you _were_ taking one over score like any other
schedule for as long as they ran, dropped doses included.

The same rule reaches one dose at a time: a dose you **skipped** from Today or
the Calendar (see [`today.md`](today.md)) is out of every figure on this
screen, both halves of it. It does not dent a share, break a streak or earn a
row in the missed list — that list is the gaps worth going back for, and a
decision already made is not one — and it does not pad a share either, which
is what stops the state being a way to make a bad month read well. The only
tile that behaves differently is **Doses taken**, which counts taps, and a
skip is not one.

The percentages are floored,
print `100%` only for a genuinely perfect share, and print `<1%` rather than
a dishonest `0%`.

The one sentence of judgement the screen allows itself is pointed at the good
case: a perfect month reads "Every scheduled dose taken — keep it up." The
gaps are shown, named, and left to speak for themselves.
