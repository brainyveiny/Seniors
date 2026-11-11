import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSeniorsJoinRequestSessionFromRequest } from "@/infrastructure/auth/seniors-auth-session";
import { getPrismaClient, isDatabaseConfigured } from "@/infrastructure/database/prisma";

export async function GET(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const session = await getSeniorsJoinRequestSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "No active join request session" }, { status: 401 });
  }

  const prisma = getPrismaClient();
  const joinRequest = await prisma.seniorsJoinRequest.findFirst({
    where: { id: session.requestId },
    include: {
      tenant: { select: { slug: true, platformName: true } },
    },
  });

  if (!joinRequest || joinRequest.tenant.slug !== session.tenant) {
    return NextResponse.json({ error: "Join request not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    request: {
      id: joinRequest.id,
      status: joinRequest.status,
      role: joinRequest.role,
      fullName: joinRequest.fullName,
      email: joinRequest.email,
      phone: joinRequest.phone,
      requestedClassLabel: joinRequest.requestedClassLabel,
      rollNumber: joinRequest.rollNumber,
      requestedSubject: joinRequest.requestedSubject,
      rejectionReason: joinRequest.rejectionReason,
      schoolName: joinRequest.tenant.platformName,
      schoolCode: joinRequest.tenant.slug,
      reviewedAt: joinRequest.reviewedAt,
      createdAt: joinRequest.createdAt,
    },
  });
}
