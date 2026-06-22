// Tapping a Rhythm notification opens the Rhythm screen directly, so logging is one tap from the
// nudge instead of "open app → scroll to find the card". Workout reminders just open the app to home
// (the default), so they need no handling here.

import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export function useNotificationRouting() {
  const router = useRouter();
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const kind = (resp.notification.request.content.data as { kind?: string } | undefined)?.kind;
      if (kind === 'rhythm') router.push('/rhythm');
    });
    return () => sub.remove();
  }, [router]);
}
