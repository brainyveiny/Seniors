import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isApiError, requireParentApi } from "@/infrastructure/seniors/seniors-api-auth";
import {
  CATALOG_TYPES,
  submitCatalogSelection,
  submitLeaveRequest,
  submitTransportUpdateRequest,
  type CatalogType,
} from "@/infrastructure/seniors/seniors-parent-services";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params;
  const auth = await requireParentApi(request, slug);
  if (isApiError(auth)) return auth;

  try {
    const body = await request.json();
    const action = String(body.action ?? "").trim();
    const childId = String(body.childId ?? "").trim();
    if (!childId) {
      return NextResponse.json({ error: "childId is required" }, { status: 400 });
    }

    if (action === "apply_leave") {
      const fromDate = new Date(String(body.fromDate));
      const toDate = new Date(String(body.toDate));
      const reason = String(body.reason ?? "").trim();
      if (!reason) {
        return NextResponse.json({ error: "Reason is required" }, { status: 400 });
      }
      const row = await submitLeaveRequest({
        tenantId: auth.tenantId,
        parentId: auth.session.userId,
        studentId: childId,
        fromDate,
        toDate,
        reason,
      });
      return NextResponse.json({ ok: true, id: row.id });
    }

    if (action === "transport_update") {
      const row = await submitTransportUpdateRequest({
        tenantId: auth.tenantId,
        parentId: auth.session.userId,
        studentId: childId,
        routeId: body.routeId ? String(body.routeId) : undefined,
        stopName: String(body.stopName ?? ""),
        note: body.note ? String(body.note) : undefined,
      });
      return NextResponse.json({ ok: true, id: row.id });
    }

    if (action === "catalog_selection") {
      const catalogType = String(body.catalogType ?? "") as CatalogType;
      if (!Object.values(CATALOG_TYPES).includes(catalogType)) {
        return NextResponse.json({ error: "Invalid catalog type" }, { status: 400 });
      }
      const row = await submitCatalogSelection({
        tenantId: auth.tenantId,
        parentId: auth.session.userId,
        studentId: childId,
        catalogId: String(body.catalogId ?? ""),
        type: catalogType,
        selections: Array.isArray(body.selections) ? body.selections : [],
      });
      return NextResponse.json({ ok: true, id: row.id });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
