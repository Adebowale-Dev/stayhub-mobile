# StayHub Mobile App

React Native + Expo mobile app for the StayHub student hostel portal.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on Android emulator
npm run android

# Run on iOS simulator (Mac only)
npm run ios
```

## Configuration

1. Open `constants/config.ts` and set your backend URL:
   - `localhost` for emulator
   - Your computer's LAN IP (e.g. `192.168.1.x`) for physical device

2. Set your Paystack public key in `constants/config.ts` and `.env`.

## Project Structure

```
app/
  (auth)/         Login, forgot password
  (student)/      Dashboard, hostels, rooms, reservation, payment, profile
  _layout.tsx     Root layout with auth gate
  index.tsx       Entry redirect

components/
  ui/             Button, Card, Input, Badge
  HostelCard      Hostel list item
  RoomCard        Room list item
  ReservationCard Reservation summary
  LoadingSpinner  Loading indicator
  EmptyState      Empty list placeholder

services/api.ts   Axios API client (auth, student, payment)
store/authStore   Zustand auth state
hooks/useAsync    Async operation helper
types/index.ts    Shared TypeScript types
constants/config  API base URL & Paystack key
```

## Build (Production)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login and configure
eas login
eas build:configure

# Build APK (Android)
eas build --platform android --profile preview

# Build AAB for Play Store
eas build --platform android --profile production
```
