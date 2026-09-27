# Sources

The app is a logbook: it records what you took and does arithmetic over it.
Two things in it come from somebody else, and **Settings → About and
sources** lists where:

- **The adherence figure** on the History screen is the standard measure of
  taking a medicine as prescribed — the share of the doses your schedule
  asked for that you marked as taken — from the consensus taxonomy that
  defines it. The same taxonomy is why stopping a medicine ends its schedule
  and keeps its history.
- **The suggestions** in the medication form — names and their usual
  strengths — come from the Swedish Medical Products Agency's public records
  of approved medicines. They only help you type: a medicine that is not on
  the list works exactly the same.

Each source is listed under the tab it serves, the strongest evidence first,
and each one says:

- what kind of evidence it is, and when it was published;
- its title, and its authors or publisher;
- one line on what in the app rests on it;
- **What the app took from it** — the source's own words, in its own
  language, with the page or table they are on, so you can check the app
  against where it came from rather than take its word for it;
- a link to the paper's DOI or the page itself, which opens in your browser
  and is the only thing on the screen that reaches the internet — and only
  when you tap it. The list itself is part of the app and works offline.

The screen also carries the app's disclaimer: it is a logbook, not medical
advice, and changes to what you take belong with your prescriber.

The list is the app's references registry, `docs/references.json`, the same
file the code cites by id beside every definition it uses — so a source is on
this screen the moment the code rests on it. See
[Where the figures come from](../architecture.md#where-the-figures-come-from).
