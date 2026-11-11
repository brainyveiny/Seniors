"use client";

import { useState } from "react";
import {
  Bus,
  CreditCard,
  Loader2,
  Package,
  Shirt,
  BookMarked,
  Languages,
  Palmtree,
} from "lucide-react";
import type { SiteContext } from "@/application/hooks/use-site-context";
import type { CatalogType } from "@/infrastructure/seniors/seniors-parent-services";
import { SeniorsCard, SeniorsEmptyState } from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import { formatDate } from "@/shared/lib/format-date";
import { ParentChildShell, type ParentChildOption } from "./ParentChildShell";

type BaseData = {
  session: { fullName: string };
  children: ParentChildOption[];
  activeChildId?: string | null;
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#FEF3C7", text: "#B45309" },
  submitted: { bg: "#FEF3C7", text: "#B45309" },
  approved: { bg: "#DCFCE7", text: "#15803D" },
  confirmed: { bg: "#DCFCE7", text: "#15803D" },
  rejected: { bg: "#FEE2E2", text: "#B91C1C" },
  cancelled: { bg: "#F3F4F6", text: "#6B7280" },
  due: { bg: "#FEE2E2", text: "#B91C1C" },
  paid: { bg: "#DCFCE7", text: "#15803D" },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {status}
    </span>
  );
}

function useParentServiceApi(ctx: SiteContext) {
  return `/api/tenants/${encodeURIComponent(ctx.tenant)}/seniors/parent/services`;
}

export function ParentLeavePage({
  ctx,
  data,
}: {
  ctx: SiteContext;
  data: BaseData & {
    requests: {
      id: string;
      fromDate: Date | string;
      toDate: Date | string;
      reason: string;
      status: string;
      adminNote: string;
      createdAt: Date | string;
    }[];
  };
}) {
  const api = useParentServiceApi(ctx);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    if (!data.activeChildId || !fromDate || !toDate || !reason.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply_leave",
          childId: data.activeChildId,
          fromDate,
          toDate,
          reason,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setMessage("Leave request submitted. School admin will review it.");
      setFromDate("");
      setToDate("");
      setReason("");
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ParentChildShell
      ctx={ctx}
      title="Apply Leave"
      sessionName={data.session.fullName}
      activeChildId={data.activeChildId}
      childOptions={data.children}
      basePath="parent/leave"
    >
      <SeniorsCard className="p-5">
        <h3 className="font-bold text-[#111827]">New leave request</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-[#6B7280]">From</span>
            <input type="date" className="mt-1 w-full rounded-lg border px-3 py-2" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="text-[#6B7280]">To</span>
            <input type="date" className="mt-1 w-full rounded-lg border px-3 py-2" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
        </div>
        <label className="mt-3 block text-sm">
          <span className="text-[#6B7280]">Reason</span>
          <textarea className="mt-1 w-full rounded-lg border px-3 py-2" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        <button type="button" onClick={submit} disabled={saving} className="mt-4 rounded-lg bg-[var(--sp-brand)] px-4 py-2 text-sm font-semibold text-[var(--sp-on-brand)] disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
        </button>
        {message ? <p className="mt-3 text-sm text-[#374151]">{message}</p> : null}
      </SeniorsCard>

      <SeniorsCard className="mt-5 p-5">
        <h3 className="font-bold text-[#111827]">Previous requests</h3>
        <ul className="mt-4 space-y-3">
          {data.requests.length === 0 ? (
            <li className="text-sm text-[#6B7280]">No leave requests yet.</li>
          ) : (
            data.requests.map((r) => (
              <li key={r.id} className="rounded-xl border border-[#E5E7EB] px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{formatDate(r.fromDate)} – {formatDate(r.toDate)}</p>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-sm text-[#6B7280]">{r.reason}</p>
                {r.adminNote ? <p className="mt-1 text-xs text-[var(--sp-brand-text)]">School: {r.adminNote}</p> : null}
              </li>
            ))
          )}
        </ul>
      </SeniorsCard>
    </ParentChildShell>
  );
}

export function ParentFeesPage({
  ctx,
  data,
}: {
  ctx: SiteContext;
  data: BaseData & {
    dueTotal: number;
    fees: {
      id: string;
      title: string;
      category: string;
      amount: number;
      dueDate: Date | string | null;
      status: string;
      receiptNo: string;
      paymentLink: string;
      isOptional: boolean;
      paidAt: Date | string | null;
    }[];
  };
}) {
  return (
    <ParentChildShell ctx={ctx} title="Fees & Receipts" sessionName={data.session.fullName} activeChildId={data.activeChildId} childOptions={data.children} basePath="parent/fees">
      <SeniorsCard className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEE2E2] text-[#B91C1C]">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-[#6B7280]">Total fee due</p>
            <p className="text-3xl font-bold text-[#111827]">₹{data.dueTotal.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </SeniorsCard>

      <div className="mt-5 space-y-3">
        {data.fees.length === 0 ? (
          <SeniorsEmptyState title="No fee records" description="Fee dues and receipts will appear here when the school adds them." />
        ) : (
          data.fees.map((fee) => (
            <SeniorsCard key={fee.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#111827]">{fee.title}</p>
                  <p className="text-sm text-[#6B7280] capitalize">
                    {fee.category.replace(/_/g, " ")}
                    {fee.isOptional ? " · Optional" : ""}
                    {fee.dueDate ? ` · Due ${formatDate(fee.dueDate)}` : ""}
                  </p>
                  {fee.receiptNo ? <p className="mt-1 text-xs text-[#6B7280]">Receipt #{fee.receiptNo}</p> : null}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">₹{fee.amount.toLocaleString("en-IN")}</p>
                  <StatusBadge status={fee.status} />
                </div>
              </div>
              {fee.status === "due" && fee.paymentLink ? (
                <a href={fee.paymentLink} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-lg bg-[var(--sp-brand)] px-4 py-2 text-sm font-semibold text-[var(--sp-on-brand)]">
                  Make payment
                </a>
              ) : null}
            </SeniorsCard>
          ))
        )}
      </div>
    </ParentChildShell>
  );
}

export function ParentTransportPage({
  ctx,
  data,
}: {
  ctx: SiteContext;
  data: BaseData & {
    assignment: {
      routeName: string;
      vehicleNo: string;
      driverName: string;
      driverPhone: string;
      stopName: string;
      pickupTime: string;
      feePaymentLink: string;
      stops: { name: string; time: string }[];
    } | null;
    routes: { id: string; name: string; feePaymentLink: string }[];
    updateRequests: { id: string; stopName: string; note: string; status: string; adminNote: string }[];
  };
}) {
  const api = useParentServiceApi(ctx);
  const [routeId, setRouteId] = useState(data.routes[0]?.id ?? "");
  const [stopName, setStopName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    if (!data.activeChildId || !stopName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "transport_update",
          childId: data.activeChildId,
          routeId,
          stopName,
          note,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setMessage("Route update request submitted.");
      setStopName("");
      setNote("");
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ParentChildShell ctx={ctx} title="Transport" sessionName={data.session.fullName} activeChildId={data.activeChildId} childOptions={data.children} basePath="parent/transport">
      {data.assignment ? (
        <SeniorsCard className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#B45309]">
              <Bus className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-[#111827]">{data.assignment.routeName}</p>
              <p className="text-sm text-[#6B7280]">Stop: {data.assignment.stopName || "—"} · {data.assignment.pickupTime || "—"}</p>
              <p className="text-xs text-[#9CA3AF]">{data.assignment.driverName} · {data.assignment.vehicleNo}</p>
            </div>
          </div>
          {data.assignment.feePaymentLink ? (
            <a href={data.assignment.feePaymentLink} target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-lg bg-[#EA580C] px-4 py-2 text-sm font-semibold text-white">
              Transport fee payment
            </a>
          ) : null}
        </SeniorsCard>
      ) : (
        <SeniorsEmptyState title="No transport assigned" description="Your child is not on a bus route yet." />
      )}

      <SeniorsCard className="mt-5 p-5">
        <h3 className="font-bold text-[#111827]">Update route & stop</h3>
        <div className="mt-4 grid gap-3">
          <select className="rounded-lg border px-3 py-2 text-sm" value={routeId} onChange={(e) => setRouteId(e.target.value)}>
            {data.routes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <input className="rounded-lg border px-3 py-2 text-sm" placeholder="Preferred stop name" value={stopName} onChange={(e) => setStopName(e.target.value)} />
          <textarea className="rounded-lg border px-3 py-2 text-sm" placeholder="Note for school admin" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          <button type="button" onClick={submit} disabled={saving} className="rounded-lg bg-[var(--sp-brand)] px-4 py-2 text-sm font-semibold text-[var(--sp-on-brand)] disabled:opacity-60">
            {saving ? "Submitting…" : "Request update"}
          </button>
          {message ? <p className="text-sm text-[#374151]">{message}</p> : null}
        </div>
      </SeniorsCard>

      {data.updateRequests.length > 0 ? (
        <SeniorsCard className="mt-5 p-5">
          <h3 className="font-bold">Update requests</h3>
          <ul className="mt-3 space-y-2">
            {data.updateRequests.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>{r.stopName}</span>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        </SeniorsCard>
      ) : null}
    </ParentChildShell>
  );
}

const CATALOG_META: Record<
  CatalogType,
  { title: string; basePath: string; icon: typeof Package; empty: string }
> = {
  hobby_club: { title: "Hobby Club Selection", basePath: "parent/hobby-club", icon: Palmtree, empty: "No hobby clubs open for selection." },
  books_stationery: { title: "Books & Stationery", basePath: "parent/books", icon: BookMarked, empty: "No books & stationery catalog published." },
  language_elective: { title: "Language Elective", basePath: "parent/elective", icon: Languages, empty: "No elective options published." },
  uniform: { title: "Uniform Order", basePath: "parent/uniform", icon: Shirt, empty: "No uniform catalog published." },
};

export function ParentCatalogPage({
  ctx,
  data,
  catalogType,
}: {
  ctx: SiteContext;
  data: BaseData & {
    catalogs: {
      id: string;
      title: string;
      academicYear: string;
      description: string;
      items: { id: string; name: string; description?: string; price: number; sizes?: string[] }[];
    }[];
    selections: {
      id: string;
      catalogTitle: string;
      selections: { name: string; qty: number; size?: string; price: number }[];
      totalAmount: number;
      status: string;
      adminNote: string;
      createdAt: Date | string;
    }[];
  };
  catalogType: CatalogType;
}) {
  const meta = CATALOG_META[catalogType];
  const api = useParentServiceApi(ctx);
  const catalog = data.catalogs[0];
  const [picked, setPicked] = useState<Record<string, { qty: number; size?: string }>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    if (!data.activeChildId || !catalog) return;
    const selections = catalog.items
      .filter((item) => picked[item.id])
      .map((item) => ({
        itemId: item.id,
        name: item.name,
        qty: picked[item.id]?.qty ?? 1,
        size: picked[item.id]?.size,
        price: item.price,
      }));
    if (selections.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "catalog_selection",
          childId: data.activeChildId,
          catalogId: catalog.id,
          catalogType,
          selections,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setMessage("Order submitted successfully.");
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ParentChildShell ctx={ctx} title={meta.title} sessionName={data.session.fullName} activeChildId={data.activeChildId} childOptions={data.children} basePath={meta.basePath}>
      {!catalog ? (
        <SeniorsEmptyState title="Not available" description={meta.empty} />
      ) : (
        <SeniorsCard className="p-5">
          <div className="flex items-center gap-3">
            <meta.icon className="h-6 w-6 text-[var(--sp-brand-text)]" />
            <div>
              <h3 className="font-bold text-[#111827]">{catalog.title}</h3>
              {catalog.academicYear ? <p className="text-sm text-[#6B7280]">{catalog.academicYear}</p> : null}
            </div>
          </div>
          {catalog.description ? <p className="mt-3 text-sm text-[#6B7280]">{catalog.description}</p> : null}
          <ul className="mt-4 space-y-3">
            {catalog.items.map((item) => (
              <li key={item.id} className="rounded-xl border border-[#E5E7EB] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-[#111827]">{item.name}</p>
                    {item.description ? <p className="text-xs text-[#6B7280]">{item.description}</p> : null}
                  </div>
                  <p className="font-bold text-[#111827]">₹{item.price.toLocaleString("en-IN")}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    type="number"
                    min={0}
                    className="w-16 rounded border px-2 py-1 text-sm"
                    placeholder="Qty"
                    value={picked[item.id]?.qty ?? ""}
                    onChange={(e) =>
                      setPicked((p) => ({
                        ...p,
                        [item.id]: { ...p[item.id], qty: Number(e.target.value) || 0 },
                      }))
                    }
                  />
                  {item.sizes?.length ? (
                    <select
                      className="rounded border px-2 py-1 text-sm"
                      value={picked[item.id]?.size ?? ""}
                      onChange={(e) =>
                        setPicked((p) => ({
                          ...p,
                          [item.id]: { qty: p[item.id]?.qty ?? 1, size: e.target.value },
                        }))
                      }
                    >
                      <option value="">Size</option>
                      {item.sizes.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
          <button type="button" onClick={submit} disabled={saving} className="mt-4 rounded-lg bg-[var(--sp-brand)] px-4 py-2 text-sm font-semibold text-[var(--sp-on-brand)] disabled:opacity-60">
            {saving ? "Submitting…" : "Submit order"}
          </button>
          {message ? <p className="mt-2 text-sm">{message}</p> : null}
        </SeniorsCard>
      )}

      {data.selections.length > 0 ? (
        <SeniorsCard className="mt-5 p-5">
          <h3 className="font-bold">Your orders</h3>
          <ul className="mt-3 space-y-2">
            {data.selections.map((s) => (
              <li key={s.id} className="rounded-lg border px-3 py-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{s.catalogTitle}</span>
                  <StatusBadge status={s.status} />
                </div>
                <p className="text-[#6B7280]">₹{s.totalAmount.toLocaleString("en-IN")} · {formatDate(s.createdAt)}</p>
              </li>
            ))}
          </ul>
        </SeniorsCard>
      ) : null}
    </ParentChildShell>
  );
}
