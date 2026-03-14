import type { Href } from 'expo-router';

export const toMobileNotificationRoute = (
  destination?: string,
  fallback: Href = '/(student)/notifications'
): Href => {
  if (!destination) return fallback;

  const [basePath] = destination.split('?');

  if (basePath.startsWith('/student/profile')) return '/(student)/profile';
  if (basePath.startsWith('/student/payment')) return '/(student)/payment';
  if (basePath.startsWith('/student/hostels')) return '/(student)/hostels';
  if (basePath.startsWith('/student/reservation')) return '/(student)/reservation';

  return fallback;
};
