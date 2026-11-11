"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { SeniorsSchoolSummary } from "@/application/seniors/seniors-product-admin";
import { seniorsProductAdminPath } from "@/shared/lib/seniors-platform-urls";
import { cn } from "@/shared/lib/utils";
import {
  SA_INPUT,
  SaSchoolAvatar,
  SaStatusBadge,
  formatRelativeTime,
} from "./SuperAdminUi";

type SortKey = "name" | "students" | "activity" | "newest";

export function SuperAdminSchoolsTable({ schools }: { schools: SeniorsSchoolSummary[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [sort, setSort] = useState<SortKey>("name");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = schools.filter((s) => {
      if (status !== "all" && s.status !== status) return false;
      if (!q) return true;
      return [s.name, s.slug, s.city].some((v) => v.toLowerCase().includes(q));
    });
    return filtered.sort((a, b) => {
      if (sort === "students") return b.students - a.students;
      if (sort === "activity") return b.logins30d - a.logins30d;
      if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
      return a.name.localeCompare(b.name);
    });
  }, [schools, query, status, sort]);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-neutral-100 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            className={cn(SA_INPUT, "mt-0 pl-9")}
            placeholder="Search by name, code or city"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            className={cn(SA_INPUT, "mt-0 w-auto")}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <select
            className={cn(SA_INPUT, "mt-0 w-auto")}
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort schools"
          >
            <option value="name">Name A-Z</option>
            <option value="students">Most students</option>
            <option value="activity">Most active</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-5 py-3 font-medium">School</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium">Students</th>
              <th className="px-3 py-3 font-medium">Teachers</th>
              <th className="px-3 py-3 font-medium">Parents</th>
              <th className="px-3 py-3 font-medium">Content</th>
              <th className="px-3 py-3 font-medium">Logins (30d)</th>
              <th className="px-5 py-3 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-5 py-3">
                  <Link
                    href={seniorsProductAdminPath(`schools/${s.id}`)}
                    className="flex items-center gap-3"
                  >
                    <SaSchoolAvatar name={s.name} logoUrl={s.logoUrl} brandHex={s.brandHex} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-neutral-900 hover:underline">{s.name}</span>
                      <span className="block text-xs text-neutral-500">
                        {s.slug}
                        {s.city ? ` · ${s.city}` : ""}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <SaStatusBadge status={s.status} />
                </td>
                <td className="px-3 py-3 tabular-nums">{s.students}</td>
                <td className="px-3 py-3 tabular-nums">{s.teachers}</td>
                <td className="px-3 py-3 tabular-nums">{s.parents}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${s.coverage.complete}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-neutral-600">{s.coverage.complete}%</span>
                  </div>
                </td>
                <td className="px-3 py-3 tabular-nums">{s.logins30d}</td>
                <td className="px-5 py-3 text-neutral-600" suppressHydrationWarning>
                  {formatRelativeTime(s.lastActiveAt)}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-neutral-500">
                  {schools.length === 0 ? "No schools yet. Use Add school above." : "No schools match your filters."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
