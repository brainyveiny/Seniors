import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { getPlatformOverview } from "@/application/seniors/seniors-product-admin";
import { requireSuperAdminPage } from "@/infrastructure/auth/super-admin-guard";
import { SeniorsProductAdminShell } from "@/presentation/components/templates/seniors/admin/SeniorsProductAdminShell";
import {
  SaCard,
  SaSchoolAvatar,
  SaStat,
  SaStatusBadge,
  auditActionLabel,
  formatRelativeTime,
} from "@/presentation/components/templates/seniors/admin/SuperAdminUi";
import { seniorsProductAdminPath } from "@/shared/lib/seniors-platform-urls";

export const dynamic = "force-dynamic";

export default async function SeniorsProductAdminHomePage() {
  const admin = await requireSuperAdminPage();
  const { schools, totals, daily, recentActivity } = await getPlatformOverview();
  const maxDaily = Math.max(1, ...daily.map((d) => d.logins));

  const attention = schools
    .map((s) => {
      const reasons: string[] = [];
      if (s.status === "suspended") reasons.push("Suspended");
      if (s.status === "active" && s.logins30d === 0) reasons.push("No logins in 30 days");
      if (s.status === "active" && s.admins === 0) reasons.push("No school admin");
      if (s.status === "active" && s.coverage.complete < 25) reasons.push(`Content ${s.coverage.complete}% complete`);
      return { school: s, reasons };
    })
    .filter((row) => row.reasons.length > 0)
    .slice(0, 6);

  const newest = [...schools]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <SeniorsProductAdminShell title="Overview">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">
            Welcome back, {admin.fullName.split(" ")[0]}
          </h2>
          <p className="text-sm text-neutral-500">Here is how schools on Seniors are doing.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SaStat
            label="Schools"
            value={totals.schools}
            hint={`${totals.active} active · ${totals.suspended} suspended`}
          />
          <SaStat label="Students" value={totals.students.toLocaleString("en-IN")} />
          <SaStat
            label="Teachers · Parents"
            value={`${totals.teachers} · ${totals.parents}`}
          />
          <SaStat
            label="Active users (7 days)"
            value={totals.activeUsers7d.toLocaleString("en-IN")}
            hint={`${totals.logins30d.toLocaleString("en-IN")} logins in 30 days`}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <SaCard title="Logins, last 14 days" className="lg:col-span-2">
            <div className="flex h-40 items-end gap-1.5">
              {daily.map((d) => (
                <div key={d.day} className="group flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] text-neutral-500 opacity-0 transition group-hover:opacity-100">
                    {d.logins}
                  </span>
                  <div
                    className="w-full rounded-t bg-neutral-900/80 transition group-hover:bg-neutral-900"
                    style={{ height: `${Math.max(3, (d.logins / maxDaily) * 100)}%` }}
                    title={`${d.day}: ${d.logins} logins`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-neutral-400">
              <span>{new Date(daily[0]!.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              <span>Today</span>
            </div>
          </SaCard>

          <SaCard title="Needs attention" bodyClassName="p-0">
            {attention.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-neutral-500">All schools look healthy.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {attention.map(({ school, reasons }) => (
                  <li key={school.id}>
                    <Link
                      href={seniorsProductAdminPath(`schools/${school.id}`)}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-neutral-50"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-900">{school.name}</p>
                        <p className="text-xs text-neutral-500">{reasons.join(" · ")}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SaCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <SaCard
            title="Newest schools"
            bodyClassName="p-0"
            action={
              <Link
                href={seniorsProductAdminPath("schools")}
                className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:underline"
              >
                All schools <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {newest.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-neutral-500">
                No schools yet. Open Schools and click Add school.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {newest.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={seniorsProductAdminPath(`schools/${s.id}`)}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50"
                    >
                      <SaSchoolAvatar name={s.name} logoUrl={s.logoUrl} brandHex={s.brandHex} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900">{s.name}</p>
                        <p className="text-xs text-neutral-500">
                          {s.slug} · {s.students} students
                        </p>
                      </div>
                      <SaStatusBadge status={s.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SaCard>

          <SaCard
            title="Recent activity"
            bodyClassName="p-0"
            action={
              <Link
                href={seniorsProductAdminPath("activity")}
                className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:underline"
              >
                Full log <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {recentActivity.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-neutral-500">
                Actions you take on schools will appear here.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {recentActivity.map((entry) => (
                  <li key={entry.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-neutral-900">{auditActionLabel(entry.action)}</p>
                      <span className="shrink-0 text-xs text-neutral-400">{formatRelativeTime(entry.createdAt)}</span>
                    </div>
                    <p className="truncate text-xs text-neutral-500">
                      {entry.summary} · {entry.actorEmail}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SaCard>
        </div>
      </div>
    </SeniorsProductAdminShell>
  );
}
