# InTandem — Couple Schedule Planner

A beautiful schedule planning app for couples, built with Expo and React Native. Ready for App Store deployment via EAS Build.

## Features

### Calendar
- Monthly calendar view with colored dots for events on each date
- Tap any date to view, add, edit, or delete scheduled events
- Events categorized by fitness, entertainment, productivity, and personal care

### Plans & Ideas
- Dropdown to switch between:
  - **Weekly Checklist** — shared tasks and routines
  - **Date Ideas** — save date night inspiration
  - **Travel Ideas** — dream destinations and trips
  - **Enrichment Ideas** — books, courses, hobbies
- Check off items, add new ones, long-press to delete

### Stats
- Breakdown of all scheduled activities:
  - **Fitness**: Chest, Back, Legs, Hike
  - **Entertainment**: Dates, Travel, Eating Out / Takeout
  - **Productivity**: Career / Work, Study
  - **Personal Care**: Hair, Face Care, Skincare, Other
- Progress bars showing distribution within each category

### Profile
- Set both partner names, anniversary, and bio
- Quick stats overview
- All data stored locally on device

## Getting Started

```bash
cd couple-planner
npm install
npm start
```

Then press `i` for iOS simulator, `a` for Android, or scan the QR code with Expo Go.

## App Store Deployment

1. Install EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login`
3. Configure: `eas build:configure`
4. Build for iOS: `eas build --platform ios`
5. Submit: `eas submit --platform ios`

You'll need an Apple Developer account ($99/year) and to update the bundle identifier in `app.json` to your own.

## Tech Stack

- Expo SDK 56 + React Native
- Expo Router (file-based tabs)
- AsyncStorage for local persistence
- date-fns for calendar logic
- TypeScript
