# StayHub Mobile App

React Native + Expo mobile app for the StayHub student hostel portal.

## Quick Start

```bash
npm install

npm start

npm run android

npm run ios
```

## Configuration

1. Copy `.env.example` to `.env` and set:
   - `API_BASE_URL`
   - `PAYSTACK_PUBLIC_KEY`
   - `EXPO_EAS_PROJECT_ID`

2. Backend URL:
   - use `localhost` for emulator-only testing
   - use your computer's LAN IP (for example `192.168.1.x`) for a physical device

3. Push notifications:
   - `expo-notifications` is installed and enabled in `app.config.js`
   - rebuild the native app after package changes with `npm run android` or an EAS build
   - `EXPO_EAS_PROJECT_ID` is required for reliable Expo push token generation in builds

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
npm install -g eas-cli

eas login
eas build:configure

eas build --platform android --profile preview

eas build --platform android --profile production
```
