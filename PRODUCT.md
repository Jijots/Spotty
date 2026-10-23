# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Self-directed lifters of every level, from beginners to advanced, who are tired of paying subscriptions and juggling several apps with different exercise selections. They open the app in two situations:

- **In the gym, mid-workout:** logging weight, reps and reps-in-reserve between sets, one-handed, glancing at a rest timer, sometimes swapping an exercise because a machine is taken.
- **Out of the gym:** choosing, generating or editing a training program, logging food and bodyweight, and reviewing progress.

Beginners should get sensible defaults and a generated program without having to understand the options. Experienced users should be able to build custom programs and see the detail (RIR, volume per muscle, adaptive calories).

## Product Purpose

A free, open-source workout and nutrition tracker for iOS and Android that replaces paid training apps: structured programs plus adaptive calorie and macro targets in one place. Success means someone can train and eat to a plan for months without paying, creating an account, or needing a second app.

## Positioning

Free and open source, with all data stored locally on the device and no account. It combines two things normally sold separately: program-based training (generated or hand-built, with progression, warm-ups, RIR, PRs and exercise swaps) and a nutrition tracker whose calorie target is learned from the user's own intake and weight trend. Its suggestions come from explicit rules, not an opaque model.

## Operating Context

- Used standing in a gym, often with chalky or sweaty hands, short attention windows between sets, and variable connectivity.
- Weights are stored in kg and shown in kg or lb at the user's choice.
- Exercise library: 876 exercises with photos and instructions from free-exercise-db (public domain). Photos load from GitHub and need a connection the first time.
- Work in progress: tested by type-check, unit tests and an Android bundle build only; not yet exercised on a physical device.

## Capabilities and Constraints

- Built with Expo / React Native + TypeScript, expo-router, local SQLite (expo-sqlite). One codebase for iOS and Android.
- Working today: onboarding and settings (units, profile, goal rate, equipment, rest durations); exercise library with search, filters and custom exercises; programs (hand-built or rule-based generated from goal, days per week, experience, session length, equipment, priority muscles); workout logging with double-progression weight suggestions, rest timer, warm-up ramp, RIR, PR detection and exercise swap; food and macro logging with adaptive expenditure estimate; weigh-ins with trend; workout history.
- Terminology in use: working set, warm-up set (W), RIR (reps in reserve), PR, e1RM, program, day, split, double progression, TDEE.
- Not built yet: weekly planner, deloads and multi-week periodization, food database and barcode scanning, charts, data export and backup, background rest-timer notification, AI-assisted program building (considered as an optional bring-your-own-key add-on).
- No backend, no accounts, no analytics.

## Brand Commitments

Undecided. The app is called Spotty, after the spotter who speaks up only when it helps. It has no logo, voice or identity commitments.

## Evidence on Hand

- Exercise data and images: free-exercise-db, Unlicense (public domain), bundled at `src/data/library.json`.
- Competitive reference confirmed by the user: MacroFactor Workouts (paid, rule-based progression, generated programs) and FitFo (creator programs, import from social video, planner, recovery). Neither is copied; they define the feature gap the product aims to fill for free.
- No user testimonials, usage data, store listings or real-device screenshots exist. Do not fabricate them.

## Product Principles

1. **Built for the set, not the screen.** Logging during a workout must work one-handed, at a glance, in seconds; everything else yields to that.
2. **Free, local, no gates.** Nothing is paywalled, nothing needs an account or a network to function, and the user's data stays on the device.
3. **Explainable rules, not black boxes.** Suggested weights, generated programs and calorie targets can always be traced to a stated rule, and the app shows how confident it is.
4. **Simple by default, deep on demand.** Beginners get a working plan from a few choices; advanced controls (RIR, custom programs, volume per muscle) are present but never required.
5. **Honest about uncertainty.** Estimates are labelled as estimates and improve visibly as the user logs more.

## Accessibility & Inclusion

No product-specific standard established yet. Baseline expectation for a gym-floor app: large tap targets, readable text at increased system font sizes, and sufficient contrast in bright or dim environments. Units (kg/lb) are user-selectable.
