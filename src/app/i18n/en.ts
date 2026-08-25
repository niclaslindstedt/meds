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
    calendar: "Calendar",
    weekStart: "Week starts on",
    weekStartHint: "The first column of the month grid.",
    monday: "Monday",
    sunday: "Sunday",
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
