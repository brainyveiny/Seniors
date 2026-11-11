import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireSchoolAdminApi } from "@/infrastructure/seniors/seniors-api-auth";

type RouteContext = { params: Promise<{ slug: string }> };

/** Attendance marking is done by teachers; school admins view summaries only. */
export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireSchoolAdminApi(request, slug);
  if (isApiError(auth)) return auth;

  return NextResponse.json(
    {
      error:
        "Attendance is marked by teachers. School admins can view attendance summaries in the Attendance section.",
    },
    { status: 403 },
  );
}
