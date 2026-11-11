import { getPrismaClient } from "@/infrastructure/database/prisma";
import { hashPassword } from "@/infrastructure/auth/password";

export type SeniorsJoinRequestRole = "student" | "teacher";
export type SeniorsJoinRequestStatus = "pending" | "approved" | "rejected";

function newUserId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function submitSeniorsJoinRequest(
  tenantId: string,
  input: {
    role: SeniorsJoinRequestRole;
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    requestedClassLabel?: string;
    rollNumber?: string;
    requestedSubject?: string;
  },
) {
  const prisma = getPrismaClient();
  const email = input.email.trim().toLowerCase();

  const existingUser = await prisma.platformUser.findFirst({
    where: { tenantId, email, userType: input.role },
  });
  if (existingUser) {
    throw new Error("An account already exists for this email at this school");
  }

  const passwordHash = await hashPassword(input.password);
  const data = {
    fullName: input.fullName.trim(),
    phone: input.phone?.trim() ?? "",
    passwordHash,
    requestedClassLabel: input.requestedClassLabel?.trim() ?? "",
    rollNumber: input.rollNumber?.trim() ?? "",
    requestedSubject: input.requestedSubject?.trim() ?? "",
    status: "pending" as const,
    rejectionReason: "",
    reviewedById: null,
    reviewedAt: null,
    approvedUserId: null,
  };

  const existingRequest = await prisma.seniorsJoinRequest.findFirst({
    where: {
      tenantId,
      email,
      role: input.role,
      status: { in: ["pending", "rejected"] },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (existingRequest) {
    return prisma.seniorsJoinRequest.update({
      where: { id: existingRequest.id },
      data,
    });
  }

  return prisma.seniorsJoinRequest.create({
    data: {
      tenantId,
      role: input.role,
      email,
      ...data,
    },
  });
}

export async function rejectSeniorsJoinRequest(
  tenantId: string,
  requestId: string,
  reviewerId: string,
  rejectionReason: string,
) {
  const prisma = getPrismaClient();
  const reason = rejectionReason.trim();
  if (!reason) throw new Error("Rejection reason is required");

  const request = await prisma.seniorsJoinRequest.findFirst({
    where: { id: requestId, tenantId, status: "pending" },
  });
  if (!request) throw new Error("Enquiry not found or already reviewed");

  return prisma.seniorsJoinRequest.update({
    where: { id: request.id },
    data: {
      status: "rejected",
      rejectionReason: reason,
      reviewedById: reviewerId,
      reviewedAt: new Date(),
    },
  });
}

export async function approveSeniorsJoinRequest(
  tenantId: string,
  requestId: string,
  reviewerId: string,
  input: {
    classId?: string;
    rollNumber?: string;
    teacherAssignments?: { classId: string; subjectId: string }[];
  },
) {
  const prisma = getPrismaClient();

  return prisma.$transaction(async (tx) => {
    const request = await tx.seniorsJoinRequest.findFirst({
      where: { id: requestId, tenantId, status: "pending" },
    });
    if (!request) throw new Error("Enquiry not found or already reviewed");

    const existingUser = await tx.platformUser.findFirst({
      where: { tenantId, email: request.email, userType: request.role },
    });
    if (existingUser) {
      throw new Error("A user account already exists for this enquiry");
    }

    if (request.role === "student") {
      if (!input.classId) throw new Error("Class is required to approve a student");
      const cls = await tx.seniorsClass.findFirst({
        where: { id: input.classId, tenantId },
      });
      if (!cls) throw new Error("Class not found");
    }

    if (request.role === "teacher") {
      if (!input.teacherAssignments?.length) {
        throw new Error("At least one class and subject assignment is required");
      }
      const unique = new Map<string, { classId: string; subjectId: string }>();
      for (const row of input.teacherAssignments) {
        if (!row.classId || !row.subjectId) continue;
        unique.set(`${row.classId}:${row.subjectId}`, row);
      }
      const rows = [...unique.values()];
      if (!rows.length) {
        throw new Error("At least one class and subject assignment is required");
      }
      for (const row of rows) {
        const subject = await tx.seniorsSubject.findFirst({
          where: { id: row.subjectId, tenantId, classId: row.classId },
        });
        if (!subject) {
          throw new Error("Subject does not belong to the selected class");
        }
      }
    }

    const user = await tx.platformUser.create({
      data: {
        id: newUserId(request.role.slice(0, 3)),
        tenantId,
        fullName: request.fullName,
        email: request.email,
        passwordHash: request.passwordHash,
        phone: request.phone,
        userType: request.role,
        source: "self-signup",
        emailVerified: true,
        joinedAt: new Date(),
      },
    });

    if (request.role === "student" && input.classId) {
      await tx.seniorsStudentProfile.create({
        data: {
          tenantId,
          classId: input.classId,
          studentId: user.id,
          rollNumber: input.rollNumber?.trim() || request.rollNumber || "",
        },
      });
    }

    if (request.role === "teacher" && input.teacherAssignments?.length) {
      const unique = new Map<string, { classId: string; subjectId: string }>();
      for (const row of input.teacherAssignments) {
        if (!row.classId || !row.subjectId) continue;
        unique.set(`${row.classId}:${row.subjectId}`, row);
      }
      const rows = [...unique.values()];
      if (rows.length) {
        await tx.seniorsTeacherAssignment.createMany({
          data: rows.map((row) => ({
            tenantId,
            teacherId: user.id,
            classId: row.classId,
            subjectId: row.subjectId,
          })),
        });
      }
    }

    const updated = await tx.seniorsJoinRequest.update({
      where: { id: request.id },
      data: {
        status: "approved",
        rejectionReason: "",
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        approvedUserId: user.id,
      },
    });

    return { user, request: updated };
  });
}

export async function findJoinRequestForLogin(
  email: string,
  password: string,
  role?: SeniorsJoinRequestRole,
  tenantSlug?: string,
) {
  const prisma = getPrismaClient();
  const requests = await prisma.seniorsJoinRequest.findMany({
    where: {
      email: email.trim().toLowerCase(),
      ...(role ? { role } : { role: { in: ["student", "teacher"] } }),
      status: { in: ["pending", "rejected", "approved"] },
      tenant: {
        activeTemplateId: "seniors-platform",
        ...(tenantSlug ? { slug: tenantSlug.trim().toLowerCase() } : {}),
      },
    },
    include: {
      tenant: { select: { id: true, slug: true, platformName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const { verifyPassword } = await import("@/infrastructure/auth/password");
  for (const request of requests) {
    if (await verifyPassword(password, request.passwordHash)) {
      return request;
    }
  }
  return null;
}
