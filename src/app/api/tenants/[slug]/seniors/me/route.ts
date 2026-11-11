import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isApiError,
  requireSeniorsPortalApi,
} from "@/infrastructure/seniors/seniors-api-auth";
import { getPrismaClient } from "@/infrastructure/database/prisma";

type RouteContext = { params: Promise<{ slug: string }> };

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  teacher: "Teacher",
  parent: "Parent",
  "school-admin": "School Admin",
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const preferredRole = request.nextUrl.searchParams.get("role");
  const auth = await requireSeniorsPortalApi(request, slug, preferredRole);
  if (isApiError(auth)) return auth;

  const { session, tenantId } = auth;
  const role = session.role;
  const prisma = getPrismaClient();

  const [user, school] = await Promise.all([
    prisma.platformUser.findFirst({
      where: { id: session.userId, tenantId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        userType: true,
        joinedAt: true,
        lastLoginAt: true,
        seniorsStudentProfile: {
          select: {
            rollNumber: true,
            class: { select: { name: true, section: true } },
          },
        },
      },
    }),
    prisma.seniorsSchoolSettings.findUnique({
      where: { tenantId },
      select: { schoolName: true, logoUrl: true },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const schoolName = school?.schoolName?.trim() || slug;
  const details: { label: string; value: string }[] = [
    { label: "Email", value: user.email || session.email || "—" },
    { label: "Role", value: ROLE_LABELS[role] ?? String(role) },
    { label: "School", value: schoolName },
  ];

  if (user.phone?.trim()) {
    details.splice(1, 0, { label: "Phone", value: user.phone.trim() });
  }

  if (role === "student") {
    const profile = user.seniorsStudentProfile;
    const className = profile?.class
      ? `${profile.class.name}${profile.class.section ? ` ${profile.class.section}` : ""}`.trim()
      : "Not assigned";
    details.push({ label: "Class", value: className });
    if (profile?.rollNumber?.trim()) {
      details.push({ label: "Roll no.", value: profile.rollNumber.trim() });
    }
  }

  if (role === "teacher") {
    const assignments = await prisma.seniorsTeacherAssignment.findMany({
      where: { tenantId, teacherId: user.id },
      include: {
        class: { select: { name: true, section: true } },
        subject: { select: { name: true } },
      },
      take: 12,
    });
    if (assignments.length > 0) {
      const lines = assignments.map((a) => {
        const cls = `${a.class.name}${a.class.section ? ` ${a.class.section}` : ""}`.trim();
        return `${a.subject.name} · ${cls}`;
      });
      details.push({ label: "Teaching", value: lines.join(", ") });
    } else {
      details.push({ label: "Teaching", value: "No class assigned yet" });
    }
  }

  if (role === "parent") {
    const links = await prisma.seniorsParentChild.findMany({
      where: { tenantId, parentId: user.id },
      include: {
        student: {
          select: {
            fullName: true,
            seniorsStudentProfile: {
              select: {
                class: { select: { name: true, section: true } },
              },
            },
          },
        },
      },
      take: 8,
    });
    if (links.length > 0) {
      details.push({
        label: "Children",
        value: links
          .map((l) => {
            const cls = l.student.seniorsStudentProfile?.class;
            const classLabel = cls
              ? `${cls.name}${cls.section ? ` ${cls.section}` : ""}`.trim()
              : "";
            return classLabel
              ? `${l.student.fullName} (${classLabel})`
              : l.student.fullName;
          })
          .join(", "),
      });
    } else {
      details.push({ label: "Children", value: "No child linked yet" });
    }
  }

  return NextResponse.json({
    profile: {
      id: user.id,
      fullName: user.fullName || session.fullName,
      email: user.email || session.email,
      phone: user.phone || "",
      role,
      roleLabel: ROLE_LABELS[role] ?? String(role),
      schoolName,
      schoolLogoUrl: school?.logoUrl?.trim() || "",
      details,
    },
  });
}
