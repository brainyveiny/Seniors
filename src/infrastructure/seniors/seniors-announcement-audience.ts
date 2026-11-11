export type AnnouncementAudienceRole = "student" | "teacher" | "parent";

export type AnnouncementAudienceFields = {
  audienceType?: string | null;
  audienceRoles?: unknown;
  targetClassIds?: unknown;
  targetUserIds?: unknown;
};

export function asIdList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))];
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return asIdList(parsed);
    } catch {
      // comma-separated fallback
    }
    return [...new Set(value.split(/[,;]/).map((item) => item.trim()).filter(Boolean))];
  }
  return [];
}

export function isAnnouncementVisibleTo(
  announcement: AnnouncementAudienceFields,
  viewer: {
    role: AnnouncementAudienceRole;
    userId: string;
    classIds?: string[];
  },
): boolean {
  const type = announcement.audienceType?.trim() || "all";
  if (type === "all") return true;

  if (type === "people") {
    return asIdList(announcement.targetUserIds).includes(viewer.userId);
  }

  const roles = asIdList(announcement.audienceRoles) as AnnouncementAudienceRole[];
  if (roles.length > 0 && !roles.includes(viewer.role)) return false;

  if (viewer.role === "teacher") return true;

  const classIds = asIdList(announcement.targetClassIds);
  if (classIds.length === 0) return true;
  return (viewer.classIds ?? []).some((id) => classIds.includes(id));
}

export function announcementAudienceLabel(
  announcement: AnnouncementAudienceFields,
  directory?: {
    classes?: { id: string; name: string; section?: string }[];
    people?: { id: string; fullName: string }[];
  },
): string {
  const type = announcement.audienceType?.trim() || "all";
  if (type === "all") return "Everyone";

  if (type === "people") {
    const ids = asIdList(announcement.targetUserIds);
    if (ids.length === 0) return "Particular people";
    const names = ids
      .map((id) => directory?.people?.find((p) => p.id === id)?.fullName)
      .filter(Boolean);
    if (names.length > 0 && names.length <= 3) return names.join(", ");
    return `${ids.length} particular ${ids.length === 1 ? "person" : "people"}`;
  }

  const roles = asIdList(announcement.audienceRoles);
  const roleLabel =
    roles.length === 0
      ? "Selected roles"
      : roles.length === 1 && roles[0] === "student"
        ? "Students"
        : roles
            .map((role) =>
              role === "student" ? "Students" : role === "teacher" ? "Teachers" : "Parents",
            )
            .join(", ");
  const classIds = asIdList(announcement.targetClassIds);
  if (classIds.length === 0) {
    return roles.length === 1 && roles[0] === "student" ? "All students" : roleLabel;
  }
  const classNames = classIds
    .map((id) => {
      const klass = directory?.classes?.find((c) => c.id === id);
      return klass ? `${klass.name} ${klass.section ?? ""}`.trim() : null;
    })
    .filter(Boolean);
  const classPart =
    classNames.length > 0 ? classNames.join(", ") : `${classIds.length} classes`;
  return `${roleLabel} · ${classPart}`;
}
