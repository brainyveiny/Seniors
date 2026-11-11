import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireSchoolAdminApi } from "@/infrastructure/seniors/seniors-api-auth";
import {
  reviewLeaveRequest,
  reviewServiceSelection,
  reviewTransportUpdate,
  upsertFeeRecord,
  upsertServiceCatalog,
  upsertTransportRoute,
  type CatalogType,
} from "@/infrastructure/seniors/seniors-parent-services";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireSchoolAdminApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = await request.json();
    const action = String(body.action ?? "").trim();

    if (action === "review_leave") {
      await reviewLeaveRequest(
        auth.tenantId,
        String(body.id),
        body.status === "approved" ? "approved" : "rejected",
        String(body.adminNote ?? ""),
        auth.session.userId,
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "review_transport") {
      await reviewTransportUpdate(
        auth.tenantId,
        String(body.id),
        body.status === "approved" ? "approved" : "rejected",
        String(body.adminNote ?? ""),
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "review_order") {
      await reviewServiceSelection(
        auth.tenantId,
        String(body.id),
        body.status === "confirmed" ? "confirmed" : "cancelled",
        String(body.adminNote ?? ""),
      );
      return NextResponse.json({ ok: true });
    }

    if (action === "create_fee") {
      const title = String(body.title ?? "").trim();
      if (!title) {
        return NextResponse.json({ error: "Fee title is required" }, { status: 400 });
      }
      const row = await upsertFeeRecord(auth.tenantId, {
        studentId: String(body.studentId),
        title,
        category: String(body.category ?? "tuition"),
        amount: Number(body.amount) || 0,
        isOptional: Boolean(body.isOptional),
        paymentLink: String(body.paymentLink ?? ""),
        status: "due",
      });
      return NextResponse.json({ ok: true, id: row.id, fee: row });
    }

    if (action === "create_route") {
      const row = await upsertTransportRoute(auth.tenantId, {
        name: String(body.name),
        vehicleNo: String(body.vehicleNo ?? ""),
        driverName: String(body.driverName ?? ""),
        driverPhone: String(body.driverPhone ?? ""),
        stops: Array.isArray(body.stops) ? body.stops : [],
        feePaymentLink: String(body.feePaymentLink ?? ""),
      });
      return NextResponse.json({ ok: true, id: row.id });
    }

    if (action === "create_catalog") {
      const row = await upsertServiceCatalog(auth.tenantId, {
        type: String(body.type) as CatalogType,
        title: String(body.title),
        academicYear: String(body.academicYear ?? ""),
        description: String(body.description ?? ""),
        items: Array.isArray(body.items) ? body.items : [],
        isOpen: true,
      });
      return NextResponse.json({ ok: true, id: row.id });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
