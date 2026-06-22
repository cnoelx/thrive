// Pure helpers for the Rhythm vertical. Times are stored as minutes since local midnight (e.g.
// 23:30 → 1410, 07:00 → 420). Sleep is logged the morning you wake: `bed` is last night, `wake` is
// this morning, so a bed time after the wake time means you went to bed before midnight.

export interface CircadianDay {
  bed?: number;
  wake?: number;
  quality?: 'good' | 'ok' | 'poor';
  morningLight?: boolean;
  eveningLight?: boolean;
}

/** Minutes slept from bed → wake, wrapping past midnight when bed is the previous evening. */
export function sleepDuration(bed: number, wake: number): number {
  return wake >= bed ? wake - bed : wake + (1440 - bed);
}

/** "7h 30m" from a minute count. */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Minutes-since-midnight → friendly 12-hour clock, e.g. 1410 → "11:30 pm", 420 → "7:00 am". */
export function formatClock(min: number): string {
  const total = ((min % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const period = h24 < 12 ? 'am' : 'pm';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** A gentle, non-judgmental read on how regular recent bedtimes have been (regularity matters for the
 *  body clock as much as duration). Needs ≥3 nights; null otherwise. Late-night times are wrapped so
 *  11pm and 1am cluster together rather than looking 22 hours apart. */
export function sleepConsistency(beds: number[]): { steady: boolean; text: string } | null {
  if (beds.length < 3) return null;
  const adj = beds.map((b) => (b < 12 * 60 ? b + 1440 : b));
  const mean = adj.reduce((a, b) => a + b, 0) / adj.length;
  const sd = Math.sqrt(adj.reduce((a, b) => a + (b - mean) ** 2, 0) / adj.length);
  if (sd <= 35) return { steady: true, text: 'Your sleep times have been steady — great for your body clock.' };
  if (sd <= 70) return { steady: true, text: 'Your sleep times have been fairly consistent.' };
  return { steady: false, text: 'Your bedtime’s been drifting — a steadier time helps you sleep.' };
}

export interface WeekSummary {
  nights: number;
  avgSleepMin: number | null;
  morningLight: number;
  eveningLight: number;
}

/** Descriptive roll-up of recent days (avg sleep over logged nights, light-day counts). No scores. */
export function weekSummary(days: (CircadianDay | undefined)[]): WeekSummary {
  let total = 0;
  let nights = 0;
  let m = 0;
  let e = 0;
  for (const d of days) {
    if (!d) continue;
    if (d.bed !== undefined && d.wake !== undefined) {
      total += sleepDuration(d.bed, d.wake);
      nights++;
    }
    if (d.morningLight) m++;
    if (d.eveningLight) e++;
  }
  return { nights, avgSleepMin: nights ? Math.round(total / nights) : null, morningLight: m, eveningLight: e };
}
