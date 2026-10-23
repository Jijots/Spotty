---
version: 1
slug: "app-layout-tsx"
primary_target: "app/_layout.tsx"
related_targets: []
---

# Surface brief: app-wide visual direction (Operate)

Scope: the whole app, starting with the Workout screen. Visitor mode: Operate (a person logging sets, one-handed, in a gym). Platform: adaptive.

## Direction contract

**THESIS:** A training partner that is calm while you work and bright when you win. It refuses the category default of cold near-black plus a neon accent.

**OWN-WORLD:** Material Blue from the owner's palette (#E3F2FD, #90CAF9, #2196F3, #0D47A1), extended. Light theme: blue-50 ground, white cards, blue-200 borders, deep blue-900 as the action color with white text. Dark theme: a near-black ground (#0A0C10) with clearly lighter cards (#232A36, 1.36:1 so cards separate at a glance, after the owner's reference screens), blue-50-tinted ink, blue-500 action fill with navy text, blue-200 links. Layout references: big saturated blue regions for the next action, program cards that show their contents, thumbnail exercise rows, tab bar with icons. Follows the phone's setting. Amber is reserved for personal records; red for danger; a five-step blue ramp is for data views (muscle volume, recovery). Manrope (open license) for headings only; system face for numbers. Buttons and chips are full pills; cards 14 px; flat, 1 px borders.

**STORY:** The lifter trusts it mid-set, sees what is next, and gets a short payoff at the end. Inspirations, not templates: MacroFactor Workouts (muscle-volume body map, program as a week grid with thumbnails, effort-coloured sets) and Fitfo (warm energy, muscle recovery, bold headings).

**FIRST VIEWPORT:** Workout tab: day title in Manrope, progress line, current set outlined with +/- steppers, rest bar with the next set. Primary action is one blue pill.

**FORM:** User-pinned from the two inspirations and the palette; no direction roll was run. seed: none (unavailable)

Information architecture, set by the owner: **Today** is a summary (next workout with Start or a Resume card with the running clock, quick workout, this week's days, nutrition snapshot, muscle recovery). **Programs** is the folder; opening one and pressing Start on a day opens a full-screen **session** with a clock that starts at Start, set logging and rest timers. One session at a time; leaving it keeps it running and Today shows Resume.

Pinned by the owner: follow system theme; Manrope headings with system numbers; pills everywhere; palette above; build the body map of weekly volume, the recovery map, the program week grid with thumbnails, and effort-coloured set numbers. Order: foundation, then Workout, then the other tabs, then the new views.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Effort colours for sets must come from the palette's blues and cream, not a new hue.
- Finish review needs screenshots from a phone or emulator; none exist yet.
- DESIGN.md still describes the old green system until the documenter runs at finish.
