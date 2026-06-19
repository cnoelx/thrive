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
