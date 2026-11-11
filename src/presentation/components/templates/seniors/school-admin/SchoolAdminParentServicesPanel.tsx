"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import { SeniorsCard } from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import { formatDate } from "@/shared/lib/format-date";
import { loadSeniorsCachedJson } from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";
import type { CatalogType } from "@/infrastructure/seniors/seniors-parent-services";

export type ParentServicesAdminData = {
  section: "parent-services";
  leaveRequests: {
    id: string;
    studentName: string;
    fromDate: Date | string;
    toDate: Date | string;
    reason: string;
    status: string;
  }[];
  transportUpdates: {
    id: string;
    studentName: string;
    stopName: string;
    note: string;
    status: string;
  }[];
  fees: {
    id: string;
    studentId: string;
    studentName: string;
    title: string;
    category: string;
    amount: number;
    status: string;
    isOptional: boolean;
  }[];
  routes: {
    id: string;
    name: string;
    vehicleNo: string;
    feePaymentLink: string;
    isActive: boolean;
  }[];
  catalogs: {
    id: string;
    type: string;
    title: string;
    academicYear: string;
    isOpen: boolean;
  }[];
  selections: {
    id: string;
    studentName: string;
    type: string;
    catalogTitle: string;
    totalAmount: number;
    status: string;
  }[];
  students: { id: string; fullName: string }[];
};

const TABS = ["requests", "fees", "transport", "catalogs", "orders"] as const;
type Tab = (typeof TABS)[number];

const CREATE_BTN =
  "inline-flex items-center gap-1.5 rounded-lg bg-[#111827] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1F2937] disabled:opacity-60";

export function SchoolAdminParentServicesPanel({ data }: { data: ParentServicesAdminData }) {
  const ctx = useSeniorsSite();
  const [tab, setTab] = useState<Tab>("requests");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [showCatalogForm, setShowCatalogForm] = useState(false);

  const [leaveRequests, setLeaveRequests] = useState(data.leaveRequests);
  const [transportUpdates, setTransportUpdates] = useState(data.transportUpdates);
  const [fees, setFees] = useState(data.fees);
  const [routes, setRoutes] = useState(data.routes);
  const [catalogs, setCatalogs] = useState(data.catalogs);
  const [selections, setSelections] = useState(data.selections);

  const api = `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/school-admin/parent-services`;
  const pageUrl = `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/school-admin/page?view=parent-services`;

  async function refreshData() {
    const fresh = await loadSeniorsCachedJson<ParentServicesAdminData>(pageUrl, true);
    if (!fresh) return;
    setLeaveRequests(fresh.leaveRequests);
    setTransportUpdates(fresh.transportUpdates);
    setFees(fresh.fees);
    setRoutes(fresh.routes);
    setCatalogs(fresh.catalogs);
    setSelections(fresh.selections);
  }

  async function act(body: Record<string, unknown>) {
    setBusy(String(body.action));
    setError("");
    try {
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      await refreshData();
      return json;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      return null;
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
              tab === t ? "bg-[#2563EB] text-white" : "bg-[#F3F4F6] text-[#374151]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
          {error}
        </p>
      ) : null}

      {tab === "requests" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <SeniorsCard className="p-4">
            <h3 className="font-bold">Leave requests</h3>
            <ul className="mt-3 space-y-2">
              {leaveRequests.map((r) => (
                <li key={r.id} className="rounded-lg border px-3 py-2 text-sm">
                  <p className="font-semibold">{r.studentName}</p>
                  <p className="text-[#6B7280]">{formatDate(r.fromDate)} – {formatDate(r.toDate)}</p>
                  <p className="text-xs">{r.reason}</p>
                  {r.status === "pending" ? (
                    <div className="mt-2 flex gap-2">
                      <button type="button" disabled={busy !== ""} onClick={() => act({ action: "review_leave", id: r.id, status: "approved" })} className="text-xs font-semibold text-[#15803D]">Approve</button>
                      <button type="button" disabled={busy !== ""} onClick={() => act({ action: "review_leave", id: r.id, status: "rejected" })} className="text-xs font-semibold text-[#B91C1C]">Reject</button>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs capitalize text-[#6B7280]">{r.status}</p>
                  )}
                </li>
              ))}
            </ul>
          </SeniorsCard>
          <SeniorsCard className="p-4">
            <h3 className="font-bold">Transport updates</h3>
            <ul className="mt-3 space-y-2">
              {transportUpdates.map((r) => (
                <li key={r.id} className="rounded-lg border px-3 py-2 text-sm">
                  <p className="font-semibold">{r.studentName} → {r.stopName}</p>
                  {r.status === "pending" ? (
                    <div className="mt-2 flex gap-2">
                      <button type="button" disabled={busy !== ""} onClick={() => act({ action: "review_transport", id: r.id, status: "approved" })} className="text-xs font-semibold text-[#15803D]">Approve</button>
                      <button type="button" disabled={busy !== ""} onClick={() => act({ action: "review_transport", id: r.id, status: "rejected" })} className="text-xs font-semibold text-[#B91C1C]">Reject</button>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs capitalize text-[#6B7280]">{r.status}</p>
                  )}
                </li>
              ))}
            </ul>
          </SeniorsCard>
        </div>
      ) : null}

      {tab === "fees" ? (
        <SeniorsCard className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold">Fee records</h3>
            <button
              type="button"
              className={CREATE_BTN}
              disabled={busy !== ""}
              onClick={() => setShowFeeForm((v) => !v)}
            >
              <Plus className="h-3.5 w-3.5" />
              {showFeeForm ? "Close" : "Create"}
            </button>
          </div>

          {showFeeForm ? (
            <FeeForm
              students={data.students}
              busy={busy === "create_fee"}
              onSubmit={async (payload) => {
                const result = await act({ action: "create_fee", ...payload });
                if (result) {
                  setShowFeeForm(false);
                }
              }}
            />
          ) : null}

          <ul className="mt-4 space-y-2">
            {fees.length === 0 ? (
              <p className="text-sm text-[#6B7280]">No fee records yet.</p>
            ) : (
              fees.map((f) => (
                <li key={f.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm">
                  <div>
                    <p className="font-semibold text-[#111827]">{f.title}</p>
                    <p className="text-xs text-[#6B7280]">
                      {f.studentName}
                      {f.category ? ` · ${f.category.replace(/_/g, " ")}` : ""}
                      {f.isOptional ? " · optional" : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium text-[#374151]">
                    ₹{f.amount} · {f.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </SeniorsCard>
      ) : null}

      {tab === "transport" ? (
        <SeniorsCard className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold">Transport routes</h3>
            <button
              type="button"
              className={CREATE_BTN}
              disabled={busy !== ""}
              onClick={() => setShowRouteForm((v) => !v)}
            >
              <Plus className="h-3.5 w-3.5" />
              {showRouteForm ? "Close" : "Create"}
            </button>
          </div>

          {showRouteForm ? (
            <RouteForm
              busy={busy === "create_route"}
              onSubmit={async (payload) => {
                const result = await act({ action: "create_route", ...payload });
                if (result) setShowRouteForm(false);
              }}
            />
          ) : null}

          <ul className="mt-4 space-y-2">
            {routes.map((r) => (
              <li key={r.id} className="rounded-lg border px-3 py-2 text-sm">
                <p className="font-semibold">{r.name} {r.vehicleNo ? `· ${r.vehicleNo}` : ""}</p>
                {r.feePaymentLink ? <p className="text-xs text-[#2563EB]">{r.feePaymentLink}</p> : null}
              </li>
            ))}
          </ul>
        </SeniorsCard>
      ) : null}

      {tab === "catalogs" ? (
        <SeniorsCard className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold">Service catalogs</h3>
            <button
              type="button"
              className={CREATE_BTN}
              disabled={busy !== ""}
              onClick={() => setShowCatalogForm((v) => !v)}
            >
              <Plus className="h-3.5 w-3.5" />
              {showCatalogForm ? "Close" : "Create"}
            </button>
          </div>

          {showCatalogForm ? (
            <CatalogForm
              busy={busy === "create_catalog"}
              onSubmit={async (payload) => {
                const result = await act({ action: "create_catalog", ...payload });
                if (result) setShowCatalogForm(false);
              }}
            />
          ) : null}

          <ul className="mt-4 space-y-2">
            {catalogs.map((c) => (
              <li key={c.id} className="rounded-lg border px-3 py-2 text-sm">
                <p className="font-semibold">{c.title}</p>
                <p className="text-xs text-[#6B7280] capitalize">{c.type.replace(/_/g, " ")} · {c.academicYear || "—"} · {c.isOpen ? "Open" : "Closed"}</p>
              </li>
            ))}
          </ul>
        </SeniorsCard>
      ) : null}

      {tab === "orders" ? (
        <SeniorsCard className="p-4">
          <h3 className="font-bold">Parent orders</h3>
          <ul className="mt-3 space-y-2">
            {selections.map((s) => (
              <li key={s.id} className="rounded-lg border px-3 py-2 text-sm">
                <p className="font-semibold">{s.studentName} · {s.catalogTitle}</p>
                <p className="text-[#6B7280]">₹{s.totalAmount} · {s.type.replace(/_/g, " ")}</p>
                {s.status === "submitted" ? (
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={busy !== ""} onClick={() => act({ action: "review_order", id: s.id, status: "confirmed" })} className="text-xs font-semibold text-[#15803D]">Confirm</button>
                    <button type="button" disabled={busy !== ""} onClick={() => act({ action: "review_order", id: s.id, status: "cancelled" })} className="text-xs font-semibold text-[#B91C1C]">Cancel</button>
                  </div>
                ) : (
                  <p className="text-xs capitalize">{s.status}</p>
                )}
              </li>
            ))}
          </ul>
        </SeniorsCard>
      ) : null}
    </div>
  );
}

function FeeForm({
  students,
  onSubmit,
  busy,
}: {
  students: { id: string; fullName: string }[];
  onSubmit: (p: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [isOptional, setIsOptional] = useState(false);

  async function handleSubmit() {
    if (!title.trim()) return;
    await onSubmit({
      studentId,
      title: title.trim(),
      amount: Number(amount),
      paymentLink,
      isOptional,
      category: isOptional ? "optional" : "tuition",
    });
    setTitle("");
    setAmount("");
    setPaymentLink("");
    setIsOptional(false);
  }

  return (
    <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <p className="mb-3 text-sm font-semibold text-[#374151]">New fee record</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <select className="rounded border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          {students.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
        </select>
        <input className="rounded border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm" placeholder="Title (e.g. Term 1 tuition)" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="rounded border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className="rounded border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm" placeholder="Payment link (optional)" value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={isOptional} onChange={(e) => setIsOptional(e.target.checked)} />
          Optional payment
        </label>
        <button
          type="button"
          disabled={busy || !title.trim() || !studentId}
          onClick={handleSubmit}
          className="rounded bg-[#2563EB] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2 sm:w-fit"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save fee"}
        </button>
      </div>
    </div>
  );
}

function RouteForm({
  onSubmit,
  busy,
}: {
  onSubmit: (p: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const [name, setName] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [feePaymentLink, setFeePaymentLink] = useState("");
  const [stops, setStops] = useState("");

  async function handleSubmit() {
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      vehicleNo,
      feePaymentLink,
      stops: stops.split("\n").map((line) => {
        const [n, t] = line.split("|").map((s) => s.trim());
        return { name: n, time: t ?? "" };
      }).filter((s) => s.name),
    });
    setName("");
    setVehicleNo("");
    setFeePaymentLink("");
    setStops("");
  }

  return (
    <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <p className="mb-3 text-sm font-semibold text-[#374151]">New transport route</p>
      <div className="grid gap-2">
        <input className="rounded border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm" placeholder="Route name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="rounded border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm" placeholder="Vehicle number" value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} />
        <input className="rounded border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm" placeholder="Transport fee payment link" value={feePaymentLink} onChange={(e) => setFeePaymentLink(e.target.value)} />
        <textarea className="rounded border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm" placeholder="Stops (one per line: Stop name | 7:30 AM)" rows={3} value={stops} onChange={(e) => setStops(e.target.value)} />
        <button type="button" disabled={busy || !name.trim()} onClick={handleSubmit} className="rounded bg-[#2563EB] px-3 py-1.5 text-sm font-semibold text-white w-fit disabled:opacity-60">
          {busy ? "Saving…" : "Save route"}
        </button>
      </div>
    </div>
  );
}

function CatalogForm({
  onSubmit,
  busy,
}: {
  onSubmit: (p: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const [type, setType] = useState<CatalogType>("uniform");
  const [title, setTitle] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [itemsText, setItemsText] = useState("");

  async function handleSubmit() {
    if (!title.trim()) return;
    await onSubmit({
      type,
      title: title.trim(),
      academicYear,
      items: itemsText.split("\n").map((line, i) => {
        const [name, price, sizes] = line.split("|").map((s) => s.trim());
        if (!name) return null;
        return {
          id: `item-${i}`,
          name,
          price: Number(price) || 0,
          sizes: sizes ? sizes.split(",").map((s) => s.trim()) : undefined,
        };
      }).filter(Boolean),
    });
    setTitle("");
    setItemsText("");
  }

  return (
    <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
      <p className="mb-3 text-sm font-semibold text-[#374151]">New catalog</p>
      <div className="grid gap-2">
        <select className="rounded border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm" value={type} onChange={(e) => setType(e.target.value as CatalogType)}>
          <option value="uniform">Uniform</option>
          <option value="books_stationery">Books & Stationery</option>
          <option value="hobby_club">Hobby Club</option>
          <option value="language_elective">Language Elective</option>
        </select>
        <input className="rounded border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm" placeholder="Catalog title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="rounded border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm" placeholder="Academic year" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
        <textarea className="rounded border border-[#E5E7EB] bg-white px-2 py-1.5 text-sm" placeholder="Items (one per line: Name | Price | S,M,L)" rows={4} value={itemsText} onChange={(e) => setItemsText(e.target.value)} />
        <button type="button" disabled={busy || !title.trim()} onClick={handleSubmit} className="rounded bg-[#2563EB] px-3 py-1.5 text-sm font-semibold text-white w-fit disabled:opacity-60">
          {busy ? "Saving…" : "Save catalog"}
        </button>
      </div>
    </div>
  );
}
