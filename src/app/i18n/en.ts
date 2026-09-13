// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The English catalog — the app's single source of user-facing copy, and (as
// the fallback language) the source of the compile-time message-key type. Add
// a string here first; `t()` won't type-check against a key this file doesn't
// carry.
//
// `{name}`-style placeholders interpolate at call time. Keep the surrounding
// sentence in the catalog rather than concatenating fragments at the call
// site: a translator needs the whole sentence to move its words around.

export const en = {
  app: {
    name: "Nird Meds",
    tagline: "Your meds, on your device",
  },

  nav: {
    today: "Today",
    calendar: "Calendar",
    history: "History",
    meds: "Meds",
    settings: "Settings",
    // The top bar's `+`. It is a glyph with no label beside it, so the name it
    // is announced and hovered by has to carry the whole of what it does — and
    // what it does is open the quick-log sheet, not the add form.
    logDose: "Log a dose",
    addMedication: "Add medication",
  },

  common: {
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    today: "Today",
    days: "{count} days",
    day: "1 day",
  },

  // The logging screen — the reason the app is opened, which is why it opens
  // here. Every line is written for the fifteen seconds it is on screen.
  today: {
    title: "Today",
    // The headline count. "3 of 5" rather than a percentage: today is a
    // checklist you are clearing, not a grade you are earning.
    progress: "{taken} of {due} taken",
    allDone: "All done for today",
    nothingDue: "Nothing scheduled today",
    // Said in the header card when the day owes nothing but there are
    // as-needed medications listed below it — "nothing scheduled" would read
    // as an empty screen with a panel of medications sitting under it.
    nothingScheduled: "Nothing scheduled — take what you need below",
    // The empty install. The one useful thing an empty Today screen can do is
    // hand you to the form that fills it.
    noMeds: "Add your medications and today's doses appear here.",
    addFirst: "Add a medication",
    // What a row's toggle is announced as — the visible row already shows the
    // name and slot, so the label carries the action.
    markTaken: "Mark {name} taken",
    // The one thing about a tap that does need a toast — the write was
    // refused (no room, or storage switched off), and nothing on the screen
    // would show it otherwise.
    saveFailed:
      "Couldn't save to this device — check the browser's storage settings.",
    markNotTaken: "Mark {name} not taken",
    takenAt: "Taken {time}",
  },

  // The quick-log sheet behind the top bar's `+` — today's doses as one flat
  // list, the likeliest at the top, so logging is one tap from wherever you
  // happen to be in the app.
  quickLog: {
    title: "Log a dose",
    // Said under the title, because the sheet lists *today* wherever it was
    // opened from — including from the Calendar looking at another month.
    subtitle: "Today · {date}",
    // The bottom of the list: what you already ticked, kept on screen so the
    // sheet answers "have I?" as well as "I have", and so a mistap is one tap
    // to undo.
    alreadyTaken: "Already taken",
    // Nothing due: either the mask says not today, or there is nothing to
    // take yet.
    nothingDue: "Nothing scheduled today.",
    noMeds: "Add a medication and today's doses show up here.",
    // The footer, and the only route to the add form left once the `+` opens
    // this sheet instead.
    newMedication: "New medication",
    done: "Done",
  },

  // As-needed medications — the ones with no schedule to be behind on.
  //
  // They are deliberately *not* on Today until the day has something to do
  // with them. Today is the list of what the day asks of you, and a
  // painkiller you may not need asks nothing; so the offer lives behind the
  // quick-log `+`, where you go when you have actually taken something, and
  // on the Meds tab, where the things you take are listed.
  //
  // What lands on Today is what you did: a painkiller you logged sticks to
  // that day and is gone the next, and a medication you have *started taking*
  // puts its times on the checklist every day until you say you are done —
  // which is the whole point of it, since a course does nothing unless it is
  // kept up.
  asNeeded: {
    title: "As needed",
    // Said in the quick-log sheet, where the whole list is offered. Today
    // shows only what is already logged, and needs no explaining.
    hint: "Nothing here counts as missed. Reach for it when you need it.",
    // The medication with no times of its own. Each tap files a dose under
    // the minute it happened.
    logNow: "Log a dose",
    logNowLabel: "Log a dose of {name}",
    // The daily maximum, said where it is asked about: next to the button
    // that logs the dose. It is the number *you* recorded, so the copy
    // reports it and never rules on it — the app counts, the prescriber
    // decides. Three readings, because "two of three" and "three of three"
    // and "four of three" are three different days.
    maxToday: "{taken} of {max} today",
    maxReached: "{taken} of {max} today — the most you noted down",
    maxOver: "{taken} today — past the {max} you noted down",
    // At the maximum the one-tap offer is withdrawn and this stands in its
    // place. It still logs: a dose that was actually swallowed has to be
    // recordable, or the log lies. It just stops being something you can do
    // without meaning to.
    logAnyway: "Log one anyway",
    logAnywayLabel: "Log another dose of {name}, past the maximum you noted",
    // Starting and ending a course — the medication taken at set times for as
    // long as the cold lasts. Starting is an offer, so it is said in the
    // quick-log sheet; ending is a fact about the medication, so it is said
    // on the Meds tab, where the other two ways out of your days live.
    start: "Start taking it",
    startLabel: "Start taking {name}",
    startHint: "Puts its times on Today every day until you are done with it.",
    end: "Done with it",
    startedNotice: "{name} is on your days",
    endedNotice: "{name} is off your days",
  },

  meds: {
    title: "Medications",
    empty: "No medications yet.",
    add: "Add medication",
    edit: "Edit",
    current: "Current",
    stopped: "Stopped",
    stoppedOn: "Stopped {date}",
    startedOn: "Since {date}",
    timesPerDay: "{count}× daily",
    oncePerDay: "1× daily",
    // The third section of the Meds list, after the scheduled medications
    // and before the stopped ones. Its rows are names and nothing else: an
    // as-needed medication has no schedule worth printing on every row, and
    // the times it does have are read where they matter — in the form, and
    // on the sheet that offers to start it.
    asNeededSection: "As needed",
    asNeededHint: "No schedule. Reach for these with the + button.",
    // The one thing about such a row that is state rather than detail.
    takingNow: "Taking now",
    // The daily maximum on the row, for the as-needed medication that has
    // one. The only detail such a row carries, because it is the only fact
    // about it that isn't "whenever you need it".
    maxPerDayRow: "Max {count} a day",
    // The Meds screen's "new medication" button, now that the top bar's `+`
    // opens the quick-log sheet instead.
    addNew: "New medication",
    // The form. Name is the only thing the app insists on; a dose is display
    // text, and the times default to one morning slot so the common case is
    // two fields and Save.
    form: {
      addTitle: "New medication",
      editTitle: "Edit medication",
      name: "Name",
      namePlaceholder: "e.g. Levaxin",
      // The autocomplete list under the name field, and the strength chips
      // under the dose field — both fed by the bundled catalog, and both
      // aids rather than validation: an unlisted name saves the same.
      suggestions: "Suggestions",
      commonDoses: "Common doses",
      dose: "Dose",
      dosePlaceholder: "e.g. 50 µg — optional",
      times: "When to take it",
      timesHint:
        "One dose per time of day. Add a slot for each dose — morning and evening is two slots.",
      addTime: "Add a time",
      removeTime: "Remove {time}",
      // The two kinds of schedule, as the first thing the "when" section
      // asks. On a schedule is the default and the common case; when needed
      // is the painkiller, and the course you are only on some weeks.
      scheduled: "On a schedule",
      whenNeeded: "When needed",
      // Chosen "when needed": the times become optional, and the weekday
      // pills go away entirely — which days you need it is not a fact about
      // the week.
      whenNeededHint:
        "Nothing is scheduled and no day counts as missed — it waits under “As needed” until you log a dose. Add times only if it has set ones on the days you do take it, like 8, 12 and 18 for a few days at a stretch; logging the first then puts the rest of that day's times on the list.",
      noTimes: "No set times — log a dose whenever you take one.",
      // The daily maximum. Only asked of the medication with no set times,
      // because that is the only one whose doses are not already counted by
      // its own schedule. Optional, blank by default, and phrased as what it
      // is: a number you were given, which the app holds on to and counts
      // against — not a rule the app has an opinion about.
      maxPerDay: "Most in one day",
      maxPerDayPlaceholder: "No limit",
      maxPerDayHint:
        "Optional. Note the number you were given and each day's doses are counted against it, so the sheet can tell you where you stand. It stays your number: the app never sets one, and a dose you did take is always loggable.",
      // The weekday mask. "Every day" is the default and answers itself, so
      // the seven pills stay out of the way until it is switched off — at
      // which point they all start lit and you turn off the days you skip,
      // which is how people describe these schedules out loud ("every day
      // except Tuesday and Thursday").
      days: "Which days",
      daysHint:
        "Every day unless you say otherwise. Turn it off to pick the days — the ones you skip are simply not scheduled.",
      everyDay: "Every day",
      pickDays: "Pick days",
      save: "Save medication",
      nameMissing: "Give it a name first",
    },
    // Stopping vs deleting, and the copy that keeps the difference honest:
    // stopping ends the schedule and keeps the history, deleting rewrites it.
    stop: "Stop this medication",
    stopHint:
      "Ends the schedule today. The history you logged stays, and stopped medications can be started again.",
    resume: "Start again",
    deleteMed: "Delete",
    deleteConfirm: "Delete {name}?",
    deleteHint:
      "Removes it and every dose of it you ever logged. If you are just done taking it, stop it instead — that keeps the history.",
    saved: "Saved",
    stoppedNotice: "{name} stopped",
    resumedNotice: "{name} resumed",
    deletedNotice: "{name} deleted",
  },

  calendar: {
    title: "Calendar",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    // Filled means every dose landed, hollow means the day is still open,
    // and the warning tint is a day that owed doses and got none.
    legend: {
      full: "All doses taken",
      partial: "Partly taken",
      missed: "Missed",
    },
    noMeds:
      "Days colour in once you have medications to take: filled when every dose landed, hollow while a day is part done.",
    // The selected day's card under the grid — where a forgotten evening is
    // logged after the fact.
    dayEmpty: "Nothing was scheduled this day.",
    dayFuture: "{count} doses scheduled.",
    dayProgress: "{taken} of {due} taken",
  },

  history: {
    title: "History",
    // The four tiles. "Adherence" is the honest word for the number — it is
    // doses taken over doses due, not a streak or a feeling.
    last7: "Last 7 days",
    last30: "Last 30 days",
    streak: "Current streak",
    streakDays: "{count} days",
    dosesTaken: "Doses taken",
    noData: "—",
    // The gaps chart: one column per day, so a missed day is a visible notch
    // in an otherwise full row.
    adherenceChart: "Daily adherence",
    adherenceChartDesc:
      "Share of each day's doses you took, over the last {count} days. Gaps are days with nothing scheduled.",
    chart: {
      keyboardHint:
        "Chart. Use the left and right arrow keys to read each day.",
      gap: "Nothing scheduled",
    },
    dayShare: "{percent} taken",
    // Per-med adherence, so one troublesome evening med is findable among
    // three reliable morning ones.
    byMedication: "By medication",
    byMedicationDesc: "Doses taken over the last 30 days.",
    medShare: "{taken} of {due}",
    // The missed list — the gaps, named. Recent only: a missed dose from May
    // is not something anyone acts on in September.
    missed: "Missed doses",
    missedDesc:
      "The last two weeks. A dose can still be logged from the Calendar.",
    missedNone: "No missed doses in the last two weeks.",
    // The one sentence of judgement the screen allows itself, and it is
    // pointed at the good case.
    perfect: "Every scheduled dose taken — keep it up.",
    empty: "Take your meds for a few days and the numbers show up here.",
  },

  settings: {
    title: "Settings",
    appearance: "Appearance",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    // Week start and clock together: both are "how this app writes a date or
    // a time at me", and neither is big enough to be a section of its own.
    dateTime: "Dates and times",
    weekStart: "Week starts on",
    weekStartHint: "The first column of the month grid.",
    monday: "Monday",
    sunday: "Sunday",
    clock: "Time format",
    clockHint:
      "How slots and logged doses are written. What is stored never changes.",
    clockSystem: "Device",
    clock24: "24-hour",
    clock12: "12-hour",
    sync: "Sync",
    syncHint:
      "Your log lives on this device. Connect a cloud account to keep a copy and read it on your other devices.",
    backend: "Where the copy lives",
    connect: "Connect",
    disconnect: "Disconnect",
    connected: "Connected to {name}",
    localOnly: "This device only",
    saveNow: "Save now",
    reload: "Reload from cloud",
    data: "Your data",
    export: "Export a backup",
    exportHint: "Downloads your medications and log as a JSON file.",
    import: "Restore from a backup",
    importHint:
      "Merges the file into what is already here — nothing on this device is dropped.",
    imported: "Backup restored",
    importFailed: "That file could not be read as a backup.",
    deleteAll: "Delete everything",
    deleteAllHint:
      "Removes every medication and every logged dose from this device. This cannot be undone.",
    deleteAllConfirm: "Delete every medication and log on this device?",
    deleted: "Everything deleted",
    developer: "Developer",
    devMode: "Developer mode",
    devModeHint:
      "Shows the demo document, the log capture switch, the app log, and the raw document size.",
    demoData: "Demo data",
    demoDataHint:
      "Swap your log for three invented medications and three months of history — full days, part days and a gap week. It lives in memory only: nothing is saved, nothing is synced, and reloading the page brings your own log back.",
    demoDataOn: "Showing demo data — reload to get yours back",
    demoDataOff: "Back to your own log",
    captureLogs: "Capture console output",
    captureLogsHint: "Records diagnostic lines so the log below can show them.",
    logs: "Logs",
    documentSize: "Document size",
    about: "About",
    version: "Version",
    build: "Build",
    privacy:
      "Everything stays on this device unless you connect a cloud account yourself. There is no server, no account, and no analytics.",
    // Said once, in the smallest print the screen has, because the app must
    // not pretend to be more than a notebook.
    disclaimer:
      "A logbook, not medical advice — changes to what you take belong with your prescriber.",
  },

  sync: {
    detailsTitle: "Sync",
    syncedTo: "Synced to {name}",
  },

  update: {
    available: "A new version is ready",
    reload: "Reload",
  },
} as const;

export type Catalog = typeof en;
