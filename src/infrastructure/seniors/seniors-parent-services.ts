import { getPrismaClient } from "@/infrastructure/database/prisma";
import { revalidateTag } from "next/cache";
import { seniorsDashboardsTag } from "@/infrastructure/seniors/seniors-dashboard-cache";

export const CATALOG_TYPES = {
  hobby_club: "hobby_club",
  books_stationery: "books_stationery",
  language_elective: "language_elective",
  uniform: "uniform",
} as const;

export type CatalogType = (typeof CATALOG_TYPES)[keyof typeof CATALOG_TYPES];

export type CatalogItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  sizes?: string[];
  maxSlots?: number;
};

export type SelectionLine = {
  itemId: string;
  name: string;
  qty: number;
  size?: string;
  price: number;
};

function parseItems(raw: unknown): CatalogItem[] {
  if (!Array.isArray(raw)) return [];
  const items: CatalogItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = String(row.id ?? "").trim();
    const name = String(row.name ?? "").trim();
    if (!id || !name) continue;
    items.push({
      id,
      name,
      description: String(row.description ?? "").trim() || undefined,
      price: Number(row.price) || 0,
      sizes: Array.isArray(row.sizes)
        ? row.sizes.map((s) => String(s).trim()).filter(Boolean)
        : undefined,
      maxSlots: row.maxSlots != null ? Number(row.maxSlots) : undefined,
    });
  }
  return items;
}

function parseSelections(raw: unknown): SelectionLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: SelectionLine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const itemId = String(row.itemId ?? "");
    const name = String(row.name ?? "");
    if (!itemId || !name) continue;
    lines.push({
      itemId,
      name,
      qty: Math.max(1, Number(row.qty) || 1),
      size: row.size ? String(row.size) : undefined,
      price: Number(row.price) || 0,
    });
  }
  return lines;
}

function bumpCache(tenantId: string) {
  revalidateTag(seniorsDashboardsTag(tenantId), { expire: 0 });
}

export async function assertParentChild(
  tenantId: string,
  parentId: string,
  studentId: string,
) {
  const prisma = getPrismaClient();
  const link = await prisma.seniorsParentChild.findFirst({
    where: { tenantId, parentId, studentId },
  });
  if (!link) throw new Error("Child not linked to your account");
}

export async function loadParentLeaveData(
  tenantId: string,
  parentId: string,
  studentId: string,
) {
  const prisma = getPrismaClient();
  const requests = await prisma.seniorsLeaveRequest.findMany({
    where: { tenantId, studentId, parentId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return requests.map((r) => ({
    id: r.id,
    fromDate: r.fromDate,
    toDate: r.toDate,
    reason: r.reason,
    status: r.status,
    adminNote: r.adminNote,
    reviewedAt: r.reviewedAt,
    createdAt: r.createdAt,
  }));
}

export async function submitLeaveRequest(input: {
  tenantId: string;
  parentId: string;
  studentId: string;
  fromDate: Date;
  toDate: Date;
  reason: string;
}) {
  await assertParentChild(input.tenantId, input.parentId, input.studentId);
  const prisma = getPrismaClient();
  if (input.toDate < input.fromDate) throw new Error("End date must be after start date");
  const row = await prisma.seniorsLeaveRequest.create({
    data: {
      tenantId: input.tenantId,
      parentId: input.parentId,
      studentId: input.studentId,
      fromDate: input.fromDate,
      toDate: input.toDate,
      reason: input.reason.trim(),
      status: "pending",
    },
  });
  bumpCache(input.tenantId);
  return row;
}

export async function loadParentFeesData(tenantId: string, studentId: string) {
  const prisma = getPrismaClient();
  const fees = await prisma.seniorsFeeRecord.findMany({
    where: { tenantId, studentId },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
  const dueTotal = fees
    .filter((f) => f.status === "due")
    .reduce((sum, f) => sum + f.amount, 0);
  return {
    dueTotal,
    fees: fees.map((f) => ({
      id: f.id,
      title: f.title,
      category: f.category,
      amount: f.amount,
      dueDate: f.dueDate,
      status: f.status,
      paidAt: f.paidAt,
      receiptNo: f.receiptNo,
      paymentLink: f.paymentLink,
      isOptional: f.isOptional,
    })),
  };
}

export async function loadParentTransportData(tenantId: string, studentId: string) {
  const prisma = getPrismaClient();
  const [assignment, routes, updateRequests] = await Promise.all([
    prisma.seniorsStudentTransport.findFirst({
      where: { tenantId, studentId },
      include: { route: true },
    }),
    prisma.seniorsTransportRoute.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.seniorsTransportUpdateRequest.findMany({
      where: { tenantId, studentId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const stops = assignment?.route?.stops;
  const routeStops = Array.isArray(stops)
    ? stops.map((s) => {
        const row = s as Record<string, unknown>;
        return {
          name: String(row.name ?? ""),
          time: String(row.time ?? ""),
        };
      })
    : [];

  return {
    assignment: assignment
      ? {
          routeId: assignment.routeId,
          routeName: assignment.route.name,
          vehicleNo: assignment.route.vehicleNo,
          driverName: assignment.route.driverName,
          driverPhone: assignment.route.driverPhone,
          stopName: assignment.stopName,
          pickupTime: assignment.pickupTime,
          feePaymentLink: assignment.route.feePaymentLink,
          stops: routeStops,
        }
      : null,
    routes: routes.map((r) => ({
      id: r.id,
      name: r.name,
      feePaymentLink: r.feePaymentLink,
    })),
    updateRequests: updateRequests.map((r) => ({
      id: r.id,
      stopName: r.stopName,
      note: r.note,
      status: r.status,
      adminNote: r.adminNote,
      createdAt: r.createdAt,
    })),
  };
}

export async function submitTransportUpdateRequest(input: {
  tenantId: string;
  parentId: string;
  studentId: string;
  routeId?: string;
  stopName: string;
  note?: string;
}) {
  await assertParentChild(input.tenantId, input.parentId, input.studentId);
  const prisma = getPrismaClient();
  const row = await prisma.seniorsTransportUpdateRequest.create({
    data: {
      tenantId: input.tenantId,
      parentId: input.parentId,
      studentId: input.studentId,
      routeId: input.routeId?.trim() || null,
      stopName: input.stopName.trim(),
      note: input.note?.trim() ?? "",
      status: "pending",
    },
  });
  bumpCache(input.tenantId);
  return row;
}

export async function loadParentCatalogData(
  tenantId: string,
  type: CatalogType,
  studentId: string,
  parentId: string,
) {
  const prisma = getPrismaClient();
  const [catalogs, selections] = await Promise.all([
    prisma.seniorsServiceCatalog.findMany({
      where: { tenantId, type, isOpen: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.seniorsServiceSelection.findMany({
      where: { tenantId, studentId, parentId, type },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { catalog: { select: { title: true, academicYear: true } } },
    }),
  ]);

  return {
    catalogs: catalogs.map((c) => ({
      id: c.id,
      type: c.type,
      academicYear: c.academicYear,
      title: c.title,
      description: c.description,
      items: parseItems(c.items),
      isOpen: c.isOpen,
    })),
    selections: selections.map((s) => ({
      id: s.id,
      catalogTitle: s.catalog.title,
      academicYear: s.catalog.academicYear,
      selections: parseSelections(s.selections),
      totalAmount: s.totalAmount,
      status: s.status,
      adminNote: s.adminNote,
      createdAt: s.createdAt,
    })),
  };
}

export async function submitCatalogSelection(input: {
  tenantId: string;
  parentId: string;
  studentId: string;
  catalogId: string;
  type: CatalogType;
  selections: SelectionLine[];
}) {
  await assertParentChild(input.tenantId, input.parentId, input.studentId);
  const prisma = getPrismaClient();
  const catalog = await prisma.seniorsServiceCatalog.findFirst({
    where: { id: input.catalogId, tenantId: input.tenantId, type: input.type, isOpen: true },
  });
  if (!catalog) throw new Error("Catalog not found or closed");

  const items = parseItems(catalog.items);
  const valid = input.selections.filter((s) =>
    items.some((item) => item.id === s.itemId),
  );
  if (valid.length === 0) throw new Error("Select at least one valid item");

  const totalAmount = valid.reduce((sum, line) => sum + line.price * line.qty, 0);
  const row = await prisma.seniorsServiceSelection.create({
    data: {
      tenantId: input.tenantId,
      parentId: input.parentId,
      studentId: input.studentId,
      catalogId: catalog.id,
      type: input.type,
      selections: valid,
      totalAmount,
      status: "submitted",
    },
  });
  bumpCache(input.tenantId);
  return row;
}

export async function loadSchoolAdminParentServices(tenantId: string) {
  const prisma = getPrismaClient();
  const [
    leaveRequests,
    transportUpdates,
    fees,
    routes,
    catalogs,
    selections,
    students,
  ] = await Promise.all([
    prisma.seniorsLeaveRequest.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.seniorsTransportUpdateRequest.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.seniorsFeeRecord.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.seniorsTransportRoute.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.seniorsServiceCatalog.findMany({
      where: { tenantId },
      orderBy: [{ type: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.seniorsServiceSelection.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { catalog: { select: { title: true } } },
    }),
    prisma.platformUser.findMany({
      where: { tenantId, userType: "student" },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const studentMap = new Map(students.map((s) => [s.id, s.fullName]));

  return {
    leaveRequests: leaveRequests.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: studentMap.get(r.studentId) ?? "Student",
      fromDate: r.fromDate,
      toDate: r.toDate,
      reason: r.reason,
      status: r.status,
      adminNote: r.adminNote,
      createdAt: r.createdAt,
    })),
    transportUpdates: transportUpdates.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: studentMap.get(r.studentId) ?? "Student",
      stopName: r.stopName,
      note: r.note,
      status: r.status,
      adminNote: r.adminNote,
      createdAt: r.createdAt,
    })),
    fees: fees.map((f) => ({
      id: f.id,
      studentId: f.studentId,
      studentName: studentMap.get(f.studentId) ?? "Student",
      title: f.title,
      category: f.category,
      amount: f.amount,
      status: f.status,
      isOptional: f.isOptional,
      paymentLink: f.paymentLink,
      dueDate: f.dueDate,
      createdAt: f.createdAt,
    })),
    routes: routes.map((r) => ({
      id: r.id,
      name: r.name,
      vehicleNo: r.vehicleNo,
      driverName: r.driverName,
      driverPhone: r.driverPhone,
      stops: r.stops,
      feePaymentLink: r.feePaymentLink,
      isActive: r.isActive,
    })),
    catalogs: catalogs.map((c) => ({
      id: c.id,
      type: c.type,
      academicYear: c.academicYear,
      title: c.title,
      description: c.description,
      items: parseItems(c.items),
      isOpen: c.isOpen,
    })),
    selections: selections.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      studentName: studentMap.get(s.studentId) ?? "Student",
      type: s.type,
      catalogTitle: s.catalog.title,
      selections: parseSelections(s.selections),
      totalAmount: s.totalAmount,
      status: s.status,
      adminNote: s.adminNote,
      createdAt: s.createdAt,
    })),
    students,
  };
}

export async function reviewLeaveRequest(
  tenantId: string,
  id: string,
  status: "approved" | "rejected",
  adminNote: string,
  reviewedById: string,
) {
  const prisma = getPrismaClient();
  const row = await prisma.seniorsLeaveRequest.update({
    where: { id },
    data: { status, adminNote, reviewedById, reviewedAt: new Date() },
  });
  if (row.tenantId !== tenantId) throw new Error("Not found");
  bumpCache(tenantId);
  return row;
}

export async function reviewTransportUpdate(
  tenantId: string,
  id: string,
  status: "approved" | "rejected",
  adminNote: string,
) {
  const prisma = getPrismaClient();
  const request = await prisma.seniorsTransportUpdateRequest.findFirst({
    where: { id, tenantId },
  });
  if (!request) throw new Error("Request not found");

  await prisma.seniorsTransportUpdateRequest.update({
    where: { id },
    data: { status, adminNote, reviewedAt: new Date() },
  });

  if (status === "approved") {
    let routeId = request.routeId;
    if (!routeId) {
      const fallback = await prisma.seniorsTransportRoute.findFirst({
        where: { tenantId, isActive: true },
        orderBy: { name: "asc" },
      });
      routeId = fallback?.id ?? null;
    }
    if (routeId) {
      await prisma.seniorsStudentTransport.upsert({
        where: { studentId: request.studentId },
        create: {
          tenantId,
          studentId: request.studentId,
          routeId,
          stopName: request.stopName,
        },
        update: {
          routeId,
          stopName: request.stopName,
        },
      });
    }
  }

  bumpCache(tenantId);
}

export async function upsertFeeRecord(
  tenantId: string,
  input: {
    id?: string;
    studentId: string;
    title: string;
    category: string;
    amount: number;
    dueDate?: Date | null;
    isOptional?: boolean;
    paymentLink?: string;
    status?: string;
    receiptNo?: string;
  },
) {
  const prisma = getPrismaClient();
  if (input.id) {
    return prisma.seniorsFeeRecord.update({
      where: { id: input.id },
      data: {
        title: input.title,
        category: input.category,
        amount: input.amount,
        dueDate: input.dueDate,
        isOptional: input.isOptional ?? false,
        paymentLink: input.paymentLink ?? "",
        status: input.status ?? "due",
        receiptNo: input.receiptNo ?? "",
        paidAt: input.status === "paid" ? new Date() : null,
      },
    });
  }
  const row = await prisma.seniorsFeeRecord.create({
    data: {
      tenantId,
      studentId: input.studentId,
      title: input.title,
      category: input.category,
      amount: input.amount,
      dueDate: input.dueDate,
      isOptional: input.isOptional ?? false,
      paymentLink: input.paymentLink ?? "",
      status: input.status ?? "due",
      receiptNo: input.receiptNo ?? "",
    },
  });
  bumpCache(tenantId);
  return row;
}

export async function upsertTransportRoute(
  tenantId: string,
  input: {
    id?: string;
    name: string;
    vehicleNo?: string;
    driverName?: string;
    driverPhone?: string;
    stops?: { name: string; time?: string }[];
    feePaymentLink?: string;
    isActive?: boolean;
  },
) {
  const prisma = getPrismaClient();
  const data = {
    name: input.name.trim(),
    vehicleNo: input.vehicleNo?.trim() ?? "",
    driverName: input.driverName?.trim() ?? "",
    driverPhone: input.driverPhone?.trim() ?? "",
    stops: input.stops ?? [],
    feePaymentLink: input.feePaymentLink?.trim() ?? "",
    isActive: input.isActive ?? true,
  };
  if (input.id) {
    return prisma.seniorsTransportRoute.update({ where: { id: input.id }, data });
  }
  const row = await prisma.seniorsTransportRoute.create({ data: { tenantId, ...data } });
  bumpCache(tenantId);
  return row;
}

export async function upsertServiceCatalog(
  tenantId: string,
  input: {
    id?: string;
    type: CatalogType;
    academicYear?: string;
    title: string;
    description?: string;
    items?: CatalogItem[];
    isOpen?: boolean;
  },
) {
  const prisma = getPrismaClient();
  const data = {
    type: input.type,
    academicYear: input.academicYear?.trim() ?? "",
    title: input.title.trim(),
    description: input.description?.trim() ?? "",
    items: input.items ?? [],
    isOpen: input.isOpen ?? true,
  };
  if (input.id) {
    return prisma.seniorsServiceCatalog.update({ where: { id: input.id }, data });
  }
  const row = await prisma.seniorsServiceCatalog.create({ data: { tenantId, ...data } });
  bumpCache(tenantId);
  return row;
}

export async function reviewServiceSelection(
  tenantId: string,
  id: string,
  status: "confirmed" | "cancelled",
  adminNote: string,
) {
  const prisma = getPrismaClient();
  const row = await prisma.seniorsServiceSelection.update({
    where: { id },
    data: { status, adminNote },
  });
  if (row.tenantId !== tenantId) throw new Error("Not found");
  bumpCache(tenantId);
  return row;
}

export async function countPendingParentServiceRequests(tenantId: string) {
  const prisma = getPrismaClient();
  const [leave, transport, orders] = await Promise.all([
    prisma.seniorsLeaveRequest.count({ where: { tenantId, status: "pending" } }),
    prisma.seniorsTransportUpdateRequest.count({ where: { tenantId, status: "pending" } }),
    prisma.seniorsServiceSelection.count({ where: { tenantId, status: "submitted" } }),
  ]);
  return leave + transport + orders;
}
