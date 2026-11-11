export const GAMIFICATION_KINDS = [
  "visit",
  "learn",
  "homework",
  "quiz",
  "doubt",
  "exam",
] as const;

export type GamificationKind = (typeof GAMIFICATION_KINDS)[number];

export type GamificationSnapshot = {
  streak: number;
  longestStreak: number;
  coins: number;
  totalCoins: number;
  lastActiveDate: string;
  atRisk: boolean;
  todayActive: boolean;
};

export type GamificationPingResult = GamificationSnapshot & {
  coinsAwarded: number;
  streakIncremented: boolean;
  kind: GamificationKind;
};

export type LeaderboardEntry = {
  rank: number;
  studentId: string;
  name: string;
  className: string;
  streak: number;
  coins: number;
  isYou: boolean;
};

export function istDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function shiftIsoDate(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  return dt.toISOString().slice(0, 10);
}

export function effectiveStreak(
  currentStreak: number,
  lastActiveDate: string,
  today = istDateString(),
) {
  if (!lastActiveDate || currentStreak <= 0) return 0;
  const yesterday = shiftIsoDate(today, -1);
  if (lastActiveDate === today || lastActiveDate === yesterday) return currentStreak;
  return 0;
}
