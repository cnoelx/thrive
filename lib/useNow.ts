import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

// A `now` that stays live: re-renders on a fixed interval (default every minute) and immediately when
// the app returns to the foreground — so the Rhythm sky's clock + sun position never freeze at the
// time the screen happened to mount.
export function useNow(intervalMs = 60000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, intervalMs);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [intervalMs]);
  return now;
}
