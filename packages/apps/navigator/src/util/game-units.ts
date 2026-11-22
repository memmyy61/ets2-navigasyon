import type { ExtraTelemetry } from '@truckermudgeon/navigation/types';
import { observable, runInAction } from 'mobx';

/**
 * ETS2 Navigasyon: the game world is scaled down (ETS2 ~1:19, ATS ~1:20), and
 * game time runs faster than real time by the same factor. Route distances
 * and durations computed from the map are "real" (what you actually drive);
 * the game's own numbers (job distance, route advisor, clock) are scaled.
 *
 * - Totals (remaining km, duration, arrival) are shown in game units by
 *   default, like the game does.
 * - Distances to the next turn stay real, because they're used while driving
 *   at the (real) speed shown on the speedometer.
 */
export type TimeMode = 'game' | 'real';

export function mapScale(map: 'usa' | 'europe'): number {
  return map === 'usa' ? 20 : 19;
}

const storageKey = 'ets2nav-time-mode';

function loadTimeMode(): TimeMode {
  try {
    return localStorage.getItem(storageKey) === 'real' ? 'real' : 'game';
  } catch {
    return 'game';
  }
}

/** display preferences shared by components that show route totals. */
export const displayPrefs = observable({
  map: 'europe' as 'usa' | 'europe',
  timeMode: loadTimeMode(),
});

export function toggleTimeMode() {
  runInAction(() => {
    displayPrefs.timeMode = displayPrefs.timeMode === 'game' ? 'real' : 'game';
  });
  try {
    localStorage.setItem(storageKey, displayPrefs.timeMode);
  } catch {
    // ignore
  }
}

/** meters actually driven -> game-scale meters (what the game would show). */
export function toGameMeters(meters: number, map = displayPrefs.map): number {
  return meters * mapScale(map);
}

/** real seconds -> game seconds. */
export function toGameSeconds(seconds: number, map = displayPrefs.map): number {
  return seconds * mapScale(map);
}

/**
 * Seconds to show for a route duration, given the current time mode.
 */
export function toDisplaySeconds(realSeconds: number): number {
  return displayPrefs.timeMode === 'game'
    ? toGameSeconds(realSeconds)
    : realSeconds;
}

const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

/**
 * Formats a game clock value (minutes since Day 0, which is a Monday 00:00).
 */
export function formatGameClock(totalMinutes: number): {
  day: string;
  time: string;
} {
  const m = Math.max(0, Math.floor(totalMinutes));
  const day = days[Math.floor(m / 1440) % 7];
  const minuteOfDay = m % 1440;
  const hh = Math.floor(minuteOfDay / 60);
  const mm = minuteOfDay % 60;
  return {
    day,
    time: `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`,
  };
}

export function formatRealClock(date: Date): string {
  return new Intl.DateTimeFormat('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** "5 sa 20 dk" / "45 dk" */
export function formatHoursMinutes(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return h > 0 ? `${h} sa ${mins} dk` : `${mins} dk`;
}

/**
 * The game's own route advisor estimate (distance in game meters, time in
 * game seconds), if available.
 */
export function gameGpsEstimate(
  extra: ExtraTelemetry | undefined,
): { meters: number; seconds: number } | undefined {
  const d = extra?.navigation?.distance;
  const t = extra?.navigation?.time;
  if (d == null || t == null || d < 100 || t <= 0) {
    return undefined;
  }
  return { meters: d, seconds: t };
}
