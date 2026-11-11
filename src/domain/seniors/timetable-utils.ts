import type { SeniorsTimetablePeriod } from "@/domain/seniors/types";

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date = new Date()) {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

export function weekdayLabel(dayOfWeek: number) {
  return ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][
    dayOfWeek
  ] ?? "";
}

export function periodsForDay(periods: SeniorsTimetablePeriod[], dayOfWeek: number) {
  return periods.filter((p) => p.dayOfWeek === dayOfWeek);
}

/** Parse "HH:MM" to minutes since midnight. */
export function timeToMinutes(value: string) {
  const [h, m] = value.split(":").map((n) => Number(n));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function findCurrentOrNextPeriod(
  periods: SeniorsTimetablePeriod[],
  now = new Date(),
) {
  const day = isoWeekday(now);
  const todayAll = periodsForDay(periods, day);
  const todayLessons = todayAll.filter((p) => !p.isBreak);
  if (todayLessons.length === 0) {
    return { current: null, next: null, today: todayAll };
  }

  const mins = now.getHours() * 60 + now.getMinutes();
  let current: SeniorsTimetablePeriod | null = null;
  let next: SeniorsTimetablePeriod | null = null;

  for (const p of todayLessons) {
    const start = timeToMinutes(p.startTime);
    const end = timeToMinutes(p.endTime);
    if (mins >= start && mins < end) {
      current = p;
    } else if (mins < start && !next) {
      next = p;
    }
  }

  return { current, next, today: todayAll };
}
