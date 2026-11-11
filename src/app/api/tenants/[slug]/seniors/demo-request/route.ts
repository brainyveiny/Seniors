import { NextResponse } from "next/server";
import { findTenantBySlug } from "@/infrastructure/database/tenant-repository";
import { getPrismaClient, isDatabaseConfigured } from "@/infrastructure/database/prisma";

const MAX_FIELD_LENGTH = 500;

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_FIELD_LENGTH) : "";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { slug } = await params;
  const tenant = await findTenantBySlug(slug);
  if (!tenant) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  let body: { eventType?: unknown; lead?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const lead = body.lead ?? {};
  const fullName = clean(lead.fullName);
  if (!fullName) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await getPrismaClient().seniorsAnalyticsEvent.create({
    data: {
      tenantId: tenant.id,
      eventType: clean(body.eventType) || "seniors_demo_booking",
      metadata: {
        fullName,
        email: clean(lead.email),
        phone: clean(lead.phone),
        source: clean(lead.source),
        schoolName: clean(lead.courseInterest),
        notes: clean(lead.notes),
      },
    },
  });

  return NextResponse.json({ ok: true });
}
