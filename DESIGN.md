---
name: Spotty
description: A free, open-source training partner: a calm blue logbook that follows your phone's light or dark setting and lights up for the wins.
colors:
  sky-wash: "#E3F2FD"
  paper-white: "#FFFFFF"
  blue-rim: "#90CAF9"
  harbor-ink: "#0A2A52"
  slate-blue: "#44608A"
  deep-blue: "#0D47A1"
  signal-blue: "#2196F3"
  record-amber: "#FFB300"
  brick-red: "#C62828"
  night-ground: "#0A0C10"
  night-card: "#232A36"
  night-rim: "#3A4658"
  frost-ink: "#EAF1F8"
  mist-gray: "#9AA8BA"
  glow-blue: "#64B5F6"
  night-amber: "#FFC107"
  night-red: "#FF8A94"
typography:
  display:
    fontFamily: "Manrope ExtraBold, system sans-serif"
    fontSize: "26px"
    fontWeight: 800
    letterSpacing: "-0.6px"
  headline:
    fontFamily: "Manrope Bold, system sans-serif"
    fontSize: "17px"
    fontWeight: 700
    letterSpacing: "-0.2px"
  data:
    fontFamily: "System (SF Pro on iOS, Roboto on Android), tabular figures"
    fontSize: "20px"
    fontWeight: 600
  body:
    fontFamily: "System (SF Pro on iOS, Roboto on Android)"
    fontSize: "15px"
    fontWeight: 400
  label:
    fontFamily: "System (SF Pro on iOS, Roboto on Android), tabular figures"
    fontSize: "13px"
    fontWeight: 400
  action:
    fontFamily: "System (SF Pro on iOS, Roboto on Android), tabular figures"
    fontSize: "15px"
    fontWeight: 600
  countdown:
    fontFamily: "System (SF Pro on iOS, Roboto on Android), tabular figures"
    fontSize: "26px"
    fontWeight: 700
rounded:
  input: "10px"
  card: "14px"
  hero: "24px"
  sheet: "28px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  card-pad: "14px"
components:
  button-primary:
    backgroundColor: "{colors.deep-blue}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.pill}"
    height: "52px"
    padding: "12px 28px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.harbor-ink}"
    rounded: "{rounded.pill}"
    height: "48px"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.harbor-ink}"
    rounded: "{rounded.pill}"
    height: "48px"
  chip-active:
    backgroundColor: "{colors.deep-blue}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.pill}"
    height: "48px"
  card:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.harbor-ink}"
    rounded: "{rounded.card}"
    padding: "14px"
  hero-card:
    backgroundColor: "{colors.deep-blue}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.hero}"
    padding: "18px"
  input:
    backgroundColor: "{colors.sky-wash}"
    textColor: "{colors.harbor-ink}"
    rounded: "{rounded.input}"
    height: "48px"
  set-check:
    backgroundColor: "{colors.deep-blue}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.pill}"
    size: "48px"
---

# Design System: Spotty

## Overview

**Creative North Star: "The Training Partner"**

The app is a partner that keeps you training, built from three roles that never compete. The **logbook** is the base: flat, numbers first, nothing between you and the next set. The **spotter** is the voice: quiet while you work, speaking up only when it helps (the rest is over, a warm-up ramp, a swap that fits). The **scoreboard** is the payoff: a personal record or a finished workout gets the one warm color in the system, amber, and the screen lets you feel it.

The structure follows how a day actually goes. **Today** is a short summary of what is up: the next workout with one Start button, the week, and which muscles are recovered. **Programs** is the shelf. Starting a workout opens a full-screen **session** with a running clock and rest timers, and nothing else competes for the screen. In the session the system is calm, dense and utilitarian. Warmth shows on the summary screens and at the wins, never mid-set.

It follows the phone's light or dark setting and nothing else. Both themes are blue: a pale sky ground with white cards by day, a near-black ground with clearly lighter cards by night. It is designed for use standing in a gym, one-handed, with chalk or sweat on the fingers, so targets are large and forgiving by intent.

**Key Characteristics:**
- One blue family carries everything: action, selection, charts and the body figure. Amber appears only for records and red only for danger.
- Flat. Depth comes from tone and 1px borders, never shadows.
- Pill buttons and chips, softly rounded cards, a large rounded hero card for the one thing to do next.
- Manrope for headings, the system face with tabular figures for every number.
- The body figure (front and back) is the data display: muscles shaded by recovery or by weekly volume.

## Colors

A blue-on-blue system with two themes of equal standing. Contrast is checked, not assumed: text pairs are at least 4.5:1 and fills and outlines at least 3:1.

### Primary
- **Deep Blue** (#0D47A1, light theme) / **Signal Blue** (#2196F3, dark theme): the action color. Fills the main button, the hero card, a selected chip, a finished set and the current-set outline. Placed text is Paper White in light and a near-black navy (#06122A) in dark.
- **Glow Blue** (#64B5F6, dark) / **Signal Blue** (#2196F3, light): the second, lighter blue for focus, chart marks, body-figure highlights and the selected-tab underline.

### Secondary
- **Record Amber** (#FFB300 light, #FFC107 dark): personal records only. Text on it is near-black (#1A1200).
- **Brick Red** (#C62828, light) / **Night Red** (#FF8A94, dark): danger and errors only.

### Neutral
- **Sky Wash** (#E3F2FD) / **Night Ground** (#0A0C10): the screen ground, and the fill inside input fields.
- **Paper White** (#FFFFFF) / **Night Card** (#232A36): cards. In dark, the card sits 1.36:1 above the ground so every card separates at a glance.
- **Blue Rim** (#90CAF9) / **Night Rim** (#3A4658): 1px borders, inactive controls and the neutral body figure.
- **Harbor Ink** (#0A2A52) / **Frost Ink** (#EAF1F8): primary text.
- **Slate Blue** (#44608A) / **Mist Gray** (#9AA8BA): secondary text, units and column headers.

Both themes also carry a five-step blue ramp for data, ordered from least to most, with steps that differ in lightness and not only hue. Muscle shading uses four blends of the neutral figure toward Glow Blue.

### Named Rules
**The Earned Amber Rule.** Amber marks a personal record and nothing else. If amber appears on something that is not a record, remove it.

**The One Family Rule.** New states use a step of the blue ramp, weight, border or copy before a new hue. Red is for danger only.

**The Never-Alone Rule.** Effort tint on a set number, muscle shading and recovery shading are hints. The exact value (RIR, hours, set count) always appears as text beside them.

## Typography

**Heading Font:** Manrope (ExtraBold for screen titles, Bold for section headings), falling back to the system face until it loads.
**Number and Body Font:** the platform system font (SF Pro on iOS, Roboto on Android) with tabular figures, so weight, reps and timer columns line up.

**Character:** headings carry the personality; numbers stay neutral and exact. The system face follows the user's text-size setting.

### Hierarchy
- **Display** (Manrope 800, 26px, -0.6 tracking): screen titles and the big card title ("Upper A").
- **Headline** (Manrope 700, 17px): card and section headings.
- **Data** (600, 20px, tabular): weight, reps, RIR and the stats you read and edit mid-set.
- **Body** (400, 15px): instructions, rows, input text.
- **Label** (400, 13px, muted): units, targets ("3 × 8–12 · RIR 2"), hints.
- **Action** (600, 15px): chip, link and button-adjacent labels. Primary button text is 700, 16px.
- **Countdown** (700, 26px, tabular): the rest timer and the session clock.

### Named Rules
**The Two Weights Rule.** Emphasis is 600 or 700 and regular text is 400. Never light or thin weights, which wash out in bright gym light.

## Layout

A single-column, vertically stacked layout for phones in portrait, with a 16px gutter and 12px between stacked blocks. Cards use 14px internal padding with 8px between rows inside them. Controls in a row sit 6 to 8px apart, and every tappable control is at least 48dp.

Navigation is five bottom tabs with icons and labels (Today, Programs, Nutrition, Progress, Library) plus a settings gear in the header. The tab bar adds the system bottom inset so it never sits under the Android navigation buttons. The session is a full-screen route above the tabs with no tab bar, entered from the bottom and left only by an explicit chevron or by finishing. Detail screens (program, exercise, workout) use a blue header with a back arrow and a rounded sheet below it, with a pinned primary action at the bottom.

Nutrition is a "Coming soon" screen and body details are hidden from Settings until tracking ships.

There is no tablet or landscape adaptation yet.

## Elevation & Depth

Flat by default. Depth is tone (ground, then card, one step lighter) and a 1px border, never shadow. Things that float are the rest-timer bar above the tab bar, the toast above the tab bar, and the pinned action bar on detail screens, each with a border or a ground-colored fill. The detail sheet overlaps its blue header by rounding its top corners (28px).

### Named Rules
**The Flat-By-Default Rule.** No drop shadows, gradients or glass. A state change moves a border or a fill color.

## Shapes

Buttons and chips are fully pill-shaped whatever their height. Cards are 14px, the hero card 24px, the detail sheet 28px at its top corners, inputs 10px. Set numbers and the done check are circles. Progress bars are 6 to 8px with fully rounded ends, and the legend strip is 8px tall. Borders are always 1px, except the selected day card and the selected tab underline, which are 2 to 3px in Signal Blue.

## Components

The family is flat, rounded and blue. Fills are reserved for the action color, and emphasis comes from tone and weight.

### Buttons
- **Primary:** Deep Blue (light) or Signal Blue (dark) pill, 52px tall, 16px/700 label. One per screen: Start, Resume, Finish, Save, Done.
- **On-accent pill:** on the hero card the Start button inverts, with a Paper White fill and a Deep Blue label, so it reads as the one thing to press.
- **Ghost:** pill, 1px border, 48px tall, ink label. Secondary actions ("Quick workout", "Edit program").
- **Text actions:** accent-text links ("View all", "Make active"); destructive ones in danger red.

### Chips
- **Style:** pill, 48px tall, 1px border, ink label.
- **State:** selected fills with the action color; used for filters, units, goals, equipment and rest times.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** card tone with a 1px border, 14px padding.
- **Hero card:** the one thing to do next (Up next, In progress), filled with the action color at 24px radius.
- **Day cards:** 132px wide, with the day name, the exercise count and up to four thumbnails; the selected one has a 2px Signal Blue outline.

### Inputs / Fields
- **Style:** ground-colored fill, 1px border, 10px radius, 48px tall, with the label always visible above it and the unit beside it.
- **Focus:** accent caret and selection color; the keyboard matches the theme.
- **Error:** danger-colored text below the form saying which field and what range, announced to screen readers.

### Navigation
- **Style:** bottom tab bar on the card tone with a top border; accent text for the active tab, muted for inactive; 11px/600 labels with 24px Ionicons. Header on the ground color with the ink title and a settings gear.

### Set Row (signature)
One line per set: a 24px circle with the set number (a "W" for warm-ups), weight, reps, RIR, and a 48px circular check. After RIR is entered, the number circle is tinted from the blue ramp, from very easy to all-out; warm-ups stay untinted. The active set gets a 1px accent outline and ± buttons for weight and reps. Completing a set fills the check and starts the rest timer. Long-press the number to remove the set. A record shows an amber pill.

### Body Map (signature)
A front and back figure that shades muscles in four steps of blue, with a High–Low or Ready–Recovering legend strip. Used for recovery on Today, weekly volume on Progress, and the muscles worked on each exercise (as a small framed tile in lists and a large figure on the exercise screen). It is decoration: the same information is always written beside it.

### Exercise Motion
The exercise screen flips between the start and end photos about every 0.9 seconds. Tap to pause or play; it starts paused when the phone's reduce-motion setting is on.

### Rest Timer (signature)
A floating bar above the bottom of the screen showing the countdown, with −15s, +15s and Skip, and a thin progress line. At zero it reads "Go!", the border takes the accent, and the phone vibrates.

## Do's and Don'ts

### Do:
- **Do** follow the phone's light or dark setting and design both themes at equal quality.
- **Do** use amber only for records and red only for danger (The Earned Amber Rule).
- **Do** keep surfaces flat: ground, card, 1px border, no shadows.
- **Do** make every tappable control at least 48dp with 6dp or more between neighbors, so it works with chalk or sweat on the fingers.
- **Do** put headings in Manrope and every number in the tabular system face.
- **Do** write the real value beside any color or shading that encodes it (The Never-Alone Rule).
- **Do** label estimates as estimates and keep copy short and plain, with warmth reserved for the summary screens and wins.
- **Do** put an explicit way out on every full-screen flow and a visible error that names the field and the range.

### Don't:
- **Don't** add another accent hue; use a blue-ramp step, weight or copy first.
- **Don't** add shadows, gradients or glass effects.
- **Don't** put motivation into the interface while a set is in progress.
- **Don't** pause the session clock or hide the rest timer behind other UI.
- **Don't** rely on color alone for state (set done, record, effort, recovery).
- **Don't** create module-level style constants from the theme; read `colors`, `type` and `ui` at render time so a theme change takes effect.
- **Don't** ship light-weight (300 or below) type.
