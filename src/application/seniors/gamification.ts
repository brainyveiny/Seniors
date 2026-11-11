import { getPrismaClient } from "@/infrastructure/database/prisma";
import {
  GAMIFICATION_KINDS,
  effectiveStreak,
  istDateString,
  shiftIsoDate,
  type GamificationKind,
  type GamificationPingResult,
  type GamificationSnapshot,
  type LeaderboardEntry,
} from "@/domain/seniors/gamification-types";

export type {
  GamificationKind,
  GamificationPingResult,
  GamificationSnapshot,
  LeaderboardEntry,
} from "@/domain/seniors/gamification-types";

const COINS_BY_KIND: Record<GamificationKind, number> = {
  visit: 5,
  learn: 12,
  exam: 10,
  doubt: 10,
  homework: 20,
  quiz: 25,
};

type GamificationRow = {
  id: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  coins: number;
  totalCoins: number;
};

type LeaderboardRow = {
  studentId: string;
  fullName: string;
  className: string | null;
  classSection: string | null;
  currentStreak: number | null;
  lastActiveDate: string | null;
  coins: number | null;
};

function formatClassLabel(name: string | null, section: string | null) {
  const n = (name || "").trim();
  const s = (section || "").trim();
  if (!n) return "Unassigned";
  return s ? `${n} ${s}` : n;
}

function isKind(value: string): value is GamificationKind {
  return (GAMIFICATION_KINDS as readonly string[]).includes(value);
}

function snapshotFromRow(
  row: Pick<GamificationRow, "currentStreak" | "longestStreak" | "coins" | "totalCoins" | "lastActiveDate">,
  today = istDateString(),
): GamificationSnapshot {
  const streak = effectiveStreak(row.currentStreak, row.lastActiveDate, today);
  const yesterday = shiftIsoDate(today, -1);
  return {
    streak,
    longestStreak: row.longestStreak,
    coins: row.coins,
    totalCoins: row.totalCoins,
    lastActiveDate: row.lastActiveDate,
    todayActive: row.lastActiveDate === today,
    atRisk: Boolean(row.lastActiveDate) && row.lastActiveDate === yesterday && streak > 0,
  };
}

async function loadRow(
  prisma: ReturnType<typeof getPrismaClient>,
  tenantId: string,
  studentId: string,
) {
  const rows = await prisma.$queryRaw<GamificationRow[]>`
    SELECT id, "currentStreak", "longestStreak", "lastActiveDate", coins, "totalCoins"
    FROM "SeniorsStudentGamification"
    WHERE "tenantId" = ${tenantId} AND "studentId" = ${studentId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getStudentGamification(
  tenantId: string,
  studentId: string,
): Promise<GamificationSnapshot> {
  const prisma = getPrismaClient();
  const row = await loadRow(prisma, tenantId, studentId);
  if (!row) {
    return {
      streak: 0,
      longestStreak: 0,
      coins: 0,
      totalCoins: 0,
      lastActiveDate: "",
      atRisk: false,
      todayActive: false,
    };
  }
  return snapshotFromRow(row);
}

export async function pingStudentGamification(input: {
  tenantId: string;
  studentId: string;
  kind: string;
}): Promise<GamificationPingResult> {
  if (!isKind(input.kind)) {
    throw new Error("Unknown activity");
  }
  const kind = input.kind;
  const today = istDateString();
  const yesterday = shiftIsoDate(today, -1);
  const coinsForKind = COINS_BY_KIND[kind];
  const prisma = getPrismaClient();

  return prisma.$transaction(async (tx) => {
    let row = await loadRow(tx as unknown as ReturnType<typeof getPrismaClient>, input.tenantId, input.studentId);
    if (!row) {
      await tx.$executeRaw`
        INSERT INTO "SeniorsStudentGamification"
          (id, "tenantId", "studentId", "currentStreak", "longestStreak", "lastActiveDate", coins, "totalCoins", "createdAt", "updatedAt")
        VALUES
          (${crypto.randomUUID()}, ${input.tenantId}, ${input.studentId}, 0, 0, ${""}, 0, 0, NOW(), NOW())
        ON CONFLICT ("tenantId", "studentId") DO NOTHING
      `;
      row = await loadRow(tx as unknown as ReturnType<typeof getPrismaClient>, input.tenantId, input.studentId);
      if (!row) throw new Error("Could not create streak");
    }

    const inserted = await tx.$queryRaw<{ coins: number }[]>`
      INSERT INTO "SeniorsGamificationEvent"
        (id, "tenantId", "studentId", day, kind, coins, "createdAt")
      VALUES
        (${crypto.randomUUID()}, ${input.tenantId}, ${input.studentId}, ${today}, ${kind}, ${coinsForKind}, NOW())
      ON CONFLICT ("tenantId", "studentId", day, kind) DO NOTHING
      RETURNING coins
    `;
    const coinsAwarded = inserted[0]?.coins ?? 0;

    let nextStreak = effectiveStreak(row.currentStreak, row.lastActiveDate, today);
    let streakIncremented = false;
    let nextLastActive = row.lastActiveDate;

    if (row.lastActiveDate !== today) {
      nextStreak = row.lastActiveDate === yesterday ? Math.max(1, row.currentStreak) + 1 : 1;
      streakIncremented = true;
      nextLastActive = today;
    }

    const nextLongest = Math.max(row.longestStreak, nextStreak);
    const nextCoins = row.coins + coinsAwarded;
    const nextTotal = row.totalCoins + coinsAwarded;

    await tx.$executeRaw`
      UPDATE "SeniorsStudentGamification"
      SET
        "currentStreak" = ${nextStreak},
        "longestStreak" = ${nextLongest},
        "lastActiveDate" = ${nextLastActive},
        coins = ${nextCoins},
        "totalCoins" = ${nextTotal},
        "updatedAt" = NOW()
      WHERE id = ${row.id}
    `;

    return {
      ...snapshotFromRow(
        {
          currentStreak: nextStreak,
          longestStreak: nextLongest,
          lastActiveDate: nextLastActive,
          coins: nextCoins,
          totalCoins: nextTotal,
        },
        today,
      ),
      coinsAwarded,
      streakIncremented,
      kind,
    };
  });
}

export async function getSchoolLeaderboard(input: {
  tenantId: string;
  studentId: string;
}): Promise<{ entries: LeaderboardEntry[]; me: LeaderboardEntry | null; total: number }> {
  const prisma = getPrismaClient();
  const today = istDateString();

  const rows = await prisma.$queryRaw<LeaderboardRow[]>`
    SELECT
      p."studentId",
      u."fullName",
      c.name AS "className",
      c.section AS "classSection",
      g."currentStreak",
      g."lastActiveDate",
      g.coins
    FROM "SeniorsStudentProfile" p
    JOIN "PlatformUser" u ON u.id = p."studentId"
    JOIN "SeniorsClass" c ON c.id = p."classId"
    LEFT JOIN "SeniorsStudentGamification" g
      ON g."studentId" = p."studentId" AND g."tenantId" = p."tenantId"
    WHERE p."tenantId" = ${input.tenantId}
  `;

  const ranked = rows
    .map((row) => ({
      studentId: row.studentId,
      name: (row.fullName || "Student").trim() || "Student",
      className: formatClassLabel(row.className, row.classSection),
      streak: effectiveStreak(row.currentStreak ?? 0, row.lastActiveDate ?? "", today),
      coins: row.coins ?? 0,
    }))
    .sort((a, b) => {
      if (b.streak !== a.streak) return b.streak - a.streak;
      if (b.coins !== a.coins) return b.coins - a.coins;
      const classCmp = a.className.localeCompare(b.className, "en-IN");
      if (classCmp !== 0) return classCmp;
      return a.name.localeCompare(b.name, "en-IN");
    });

  const withRank: LeaderboardEntry[] = ranked.map((row, index) => ({
    ...row,
    rank: index + 1,
    isYou: row.studentId === input.studentId,
  }));

  const me = withRank.find((row) => row.isYou) ?? null;
  return { entries: withRank, me, total: withRank.length };
}
