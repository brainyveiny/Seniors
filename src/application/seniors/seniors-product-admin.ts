import { getPrismaClient } from "@/infrastructure/database/prisma";
import { resolveSchoolBrandHex } from "@/shared/lib/seniors-brand";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SeniorsSchoolStatus = "active" | "suspended";

export type SeniorsSchoolSummary = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  brandHex: string;
  status: SeniorsSchoolStatus;
  city: string;
  createdAt: string;
  students: number;
  teachers: number;
  parents: number;
  admins: number;
  coverage: { complete: number; inProgress: number; missing: number };
  logins30d: number;
  lastActiveAt: string | null;
};

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toStatus(value: string): SeniorsSchoolStatus {
  return value === "suspended" ? "suspended" : "active";
}

function percentages(counts: { complete: number; in_progress: number; missing: number }) {
  const total = counts.complete + counts.in_progress + counts.missing;
  if (total === 0) return { complete: 0, inProgress: 0, missing: 0 };
  return {
    complete: Math.round((counts.complete / total) * 100),
    inProgress: Math.round((counts.in_progress / total) * 100),
    missing: Math.round((counts.missing / total) * 100),
  };
}

/** Real Seniors schools only -must have school settings. */
export async function listSeniorsSchools(): Promise<SeniorsSchoolSummary[]> {
  const prisma = getPrismaClient();
  const tenants = await prisma.tenant.findMany({
    where: {
      activeTemplateId: "seniors-platform",
      seniorsSchoolSettings: { isNot: null },
    },
    select: {
      id: true,
      slug: true,
      platformName: true,
      status: true,
      city: true,
      createdAt: true,
      seniorsSchoolSettings: {
        select: { schoolName: true, logoUrl: true, primaryColor: true },
      },
    },
    orderBy: { platformName: "asc" },
  });
  if (tenants.length === 0) return [];

  const ids = tenants.map((t) => t.id);
  const since30 = new Date(Date.now() - 30 * DAY_MS);
  const [userCounts, topicCounts, loginCounts, lastLogins] = await Promise.all([
    prisma.platformUser.groupBy({
      by: ["tenantId", "userType"],
      where: { tenantId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.seniorsTopic.groupBy({
      by: ["tenantId", "contentStatus"],
      where: { tenantId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.seniorsAnalyticsEvent.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: ids }, eventType: "login", createdAt: { gte: since30 } },
      _count: { _all: true },
    }),
    prisma.platformUser.groupBy({
      by: ["tenantId"],
      where: { tenantId: { in: ids } },
      _max: { lastLoginAt: true },
    }),
  ]);

  const usersBy = new Map<string, Record<string, number>>();
  for (const row of userCounts) {
    const entry = usersBy.get(row.tenantId) ?? {};
    entry[row.userType] = row._count._all;
    usersBy.set(row.tenantId, entry);
  }
  const topicsBy = new Map<string, { complete: number; in_progress: number; missing: number }>();
  for (const row of topicCounts) {
    const entry = topicsBy.get(row.tenantId) ?? { complete: 0, in_progress: 0, missing: 0 };
    if (row.contentStatus === "complete" || row.contentStatus === "in_progress" || row.contentStatus === "missing") {
      entry[row.contentStatus] += row._count._all;
    }
    topicsBy.set(row.tenantId, entry);
  }
  const loginsBy = new Map(loginCounts.map((row) => [row.tenantId, row._count._all]));
  const lastBy = new Map(lastLogins.map((row) => [row.tenantId, row._max.lastLoginAt]));

  return tenants.map((t) => {
    const users = usersBy.get(t.id) ?? {};
    const last = lastBy.get(t.id);
    return {
      id: t.id,
      slug: t.slug,
      name: t.seniorsSchoolSettings?.schoolName || t.platformName || t.slug,
      logoUrl: t.seniorsSchoolSettings?.logoUrl ?? "",
      brandHex: resolveSchoolBrandHex(t.seniorsSchoolSettings?.primaryColor),
      status: toStatus(t.status),
      city: t.city,
      createdAt: t.createdAt.toISOString(),
      students: users.student ?? 0,
      teachers: users.teacher ?? 0,
      parents: users.parent ?? 0,
      admins: users["school-admin"] ?? 0,
      coverage: percentages(topicsBy.get(t.id) ?? { complete: 0, in_progress: 0, missing: 0 }),
      logins30d: loginsBy.get(t.id) ?? 0,
      lastActiveAt: last ? last.toISOString() : null,
    };
  });
}

export type PlatformAuditEntry = {
  id: string;
  actorEmail: string;
  action: string;
  tenantId: string | null;
  tenantSlug: string;
  summary: string;
  createdAt: string;
};

export async function listPlatformAuditLog(options: { tenantId?: string; take?: number } = {}) {
  const rows = await getPrismaClient().platformAuditLog.findMany({
    where: options.tenantId ? { tenantId: options.tenantId } : {},
    orderBy: { createdAt: "desc" },
    take: options.take ?? 20,
  });
  return rows.map(
    (row): PlatformAuditEntry => ({
      id: row.id,
      actorEmail: row.actorEmail,
      action: row.action,
      tenantId: row.tenantId,
      tenantSlug: row.tenantSlug,
      summary: row.summary,
      createdAt: row.createdAt.toISOString(),
    }),
  );
}

export async function getPlatformOverview() {
  const prisma = getPrismaClient();
  const schools = await listSeniorsSchools();
  const ids = schools.map((s) => s.id);
  const since14 = new Date(Date.now() - 13 * DAY_MS);
  since14.setHours(0, 0, 0, 0);
  const since7 = new Date(Date.now() - 7 * DAY_MS);
  const since30 = new Date(Date.now() - 30 * DAY_MS);

  const [loginEvents, activeUsers7d, recentActivity] = await Promise.all([
    ids.length
      ? prisma.seniorsAnalyticsEvent.findMany({
          where: { tenantId: { in: ids }, eventType: "login", createdAt: { gte: since14 } },
          select: { createdAt: true },
        })
      : Promise.resolve([]),
    ids.length
      ? prisma.platformUser.count({
          where: { tenantId: { in: ids }, lastLoginAt: { gte: since7 } },
        })
      : Promise.resolve(0),
    listPlatformAuditLog({ take: 8 }),
  ]);

  const daily: { day: string; logins: number }[] = [];
  for (let i = 0; i < 14; i++) {
    daily.push({ day: localDayKey(new Date(since14.getTime() + i * DAY_MS)), logins: 0 });
  }
  const dayIndex = new Map(daily.map((d, i) => [d.day, i]));
  for (const ev of loginEvents) {
    const idx = dayIndex.get(localDayKey(ev.createdAt));
    if (idx !== undefined) daily[idx]!.logins += 1;
  }

  return {
    schools,
    totals: {
      schools: schools.length,
      active: schools.filter((s) => s.status === "active").length,
      suspended: schools.filter((s) => s.status === "suspended").length,
      newSchools30d: schools.filter((s) => new Date(s.createdAt) >= since30).length,
      students: schools.reduce((n, s) => n + s.students, 0),
      teachers: schools.reduce((n, s) => n + s.teachers, 0),
      parents: schools.reduce((n, s) => n + s.parents, 0),
      logins30d: schools.reduce((n, s) => n + s.logins30d, 0),
      activeUsers7d,
    },
    daily,
    recentActivity,
  };
}

export type SeniorsSchoolAdminAccount = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  joinedAt: string;
  lastLoginAt: string | null;
};

export async function listSchoolAdminAccounts(tenantId: string): Promise<SeniorsSchoolAdminAccount[]> {
  const rows = await getPrismaClient().platformUser.findMany({
    where: { tenantId, userType: "school-admin" },
    select: { id: true, fullName: true, email: true, phone: true, joinedAt: true, lastLoginAt: true },
    orderBy: { joinedAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    phone: r.phone,
    joinedAt: r.joinedAt.toISOString(),
    lastLoginAt: r.lastLoginAt ? r.lastLoginAt.toISOString() : null,
  }));
}

export async function getSeniorsSchoolDetail(tenantId: string) {
  const prisma = getPrismaClient();
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, activeTemplateId: "seniors-platform" },
    include: { seniorsSchoolSettings: true },
  });
  if (!tenant) return null;

  const since30 = new Date(Date.now() - 30 * DAY_MS);
  const [userCounts, topicCounts, classes, quizzes, assignments, announcements, events, activeUsers, admins, audit] =
    await Promise.all([
      prisma.platformUser.groupBy({
        by: ["userType"],
        where: { tenantId },
        _count: { _all: true },
      }),
      prisma.seniorsTopic.groupBy({
        by: ["contentStatus"],
        where: { tenantId },
        _count: { _all: true },
      }),
      prisma.seniorsClass.count({ where: { tenantId } }),
      prisma.seniorsQuiz.count({ where: { tenantId } }),
      prisma.seniorsAssignment.count({ where: { tenantId } }),
      prisma.seniorsAnnouncement.count({ where: { tenantId } }),
      prisma.seniorsAnalyticsEvent.groupBy({
        by: ["eventType"],
        where: { tenantId, createdAt: { gte: since30 } },
        _count: { _all: true },
      }),
      prisma.platformUser.count({ where: { tenantId, lastLoginAt: { gte: since30 } } }),
      listSchoolAdminAccounts(tenantId),
      listPlatformAuditLog({ tenantId, take: 15 }),
    ]);

  const users = Object.fromEntries(userCounts.map((r) => [r.userType, r._count._all])) as Record<string, number>;
  const topics = { complete: 0, in_progress: 0, missing: 0 };
  for (const row of topicCounts) {
    if (row.contentStatus === "complete" || row.contentStatus === "in_progress" || row.contentStatus === "missing") {
      topics[row.contentStatus] += row._count._all;
    }
  }
  const settings = tenant.seniorsSchoolSettings;

  return {
    id: tenant.id,
    slug: tenant.slug,
    status: toStatus(tenant.status),
    suspendedReason: tenant.suspendedReason,
    createdAt: tenant.createdAt.toISOString(),
    profile: {
      contactName: tenant.contactName,
      contactEmail: tenant.contactEmail,
      contactPhone: tenant.contactPhone,
      city: tenant.city,
      state: tenant.state,
      address: tenant.address,
      internalNotes: tenant.internalNotes,
    },
    branding: {
      schoolName: settings?.schoolName || tenant.platformName,
      logoUrl: settings?.logoUrl ?? "",
      primaryColor: resolveSchoolBrandHex(settings?.primaryColor),
      tagline: settings?.tagline ?? "",
    },
    stats: {
      students: users.student ?? 0,
      teachers: users.teacher ?? 0,
      parents: users.parent ?? 0,
      admins: users["school-admin"] ?? 0,
      classes,
      topics: topics.complete + topics.in_progress + topics.missing,
      coverage: percentages(topics),
      quizzes,
      assignments,
      announcements,
      activeUsers30d: activeUsers,
      events30d: Object.fromEntries(events.map((e) => [e.eventType, e._count._all])) as Record<string, number>,
    },
    admins,
    audit,
  };
}

export type SeniorsSchoolDetail = NonNullable<Awaited<ReturnType<typeof getSeniorsSchoolDetail>>>;

export async function listSuperAdmins() {
  const rows = await getPrismaClient().platformSuperAdmin.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, fullName: true, email: true, isActive: true, createdAt: true, lastLoginAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    lastLoginAt: r.lastLoginAt ? r.lastLoginAt.toISOString() : null,
  }));
}

export type PlatformBroadcast = {
  id: string;
  title: string;
  body: string;
  schoolCount: number;
  audienceRoles: string[];
  actorEmail: string;
  createdAt: string;
};

export async function listPlatformBroadcasts(take = 30): Promise<PlatformBroadcast[]> {
  const rows = await getPrismaClient().platformAuditLog.findMany({
    where: { action: "broadcast.send" },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((row) => {
    const meta = (row.metadata ?? {}) as {
      title?: string;
      body?: string;
      schoolCount?: number;
      audienceRoles?: string[];
    };
    return {
      id: row.id,
      title: meta.title ?? row.summary,
      body: meta.body ?? "",
      schoolCount: meta.schoolCount ?? 0,
      audienceRoles: meta.audienceRoles ?? [],
      actorEmail: row.actorEmail,
      createdAt: row.createdAt.toISOString(),
    };
  });
}
