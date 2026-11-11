import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getStudentSessionFromRequest } from "@/infrastructure/auth/session";

export async function GET(request: NextRequest) {
  const tenant = request.nextUrl.searchParams.get("tenant")?.trim();
  if (!tenant) {
    return NextResponse.json({ error: "tenant query is required" }, { status: 400 });
  }

  const session = await getStudentSessionFromRequest(request);
  if (!session || session.tenant !== tenant || session.role !== "student") {
    return NextResponse.json({ session: null });
  }

  return NextResponse.json({
    session: {
      studentId: session.userId,
      fullName: session.fullName,
      email: session.email,
      tenant: session.tenant,
    },
  });
}
