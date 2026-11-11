import Link from "next/link";
import { listSeniorsSchools } from "@/application/seniors/seniors-product-admin";
import { SeniorsProductAdminShell } from "@/presentation/components/templates/seniors/admin/SeniorsProductAdminShell";
import { SeniorsAddSchoolForm } from "@/presentation/components/templates/seniors/admin/SeniorsAddSchoolForm";

export const dynamic = "force-dynamic";

export default async function SeniorsProductAdminSchoolsPage() {
  const schools = await listSeniorsSchools();

  return (
    <SeniorsProductAdminShell title="Schools">
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-neutral-600">
            Schools under Seniors. Share the school code + login link with each school admin.
          </p>
          <SeniorsAddSchoolForm />
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-5 py-3 font-medium">School</th>
                <th className="px-3 py-3 font-medium">School code</th>
                <th className="px-3 py-3 font-medium">Students</th>
                <th className="px-3 py-3 font-medium">Teachers</th>
                <th className="px-3 py-3 font-medium">Parents</th>
                <th className="px-3 py-3 font-medium">Content</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-neutral-900">{s.name}</td>
                  <td className="px-3 py-3">
                    <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">{s.slug}</code>
                  </td>
                  <td className="px-3 py-3">{s.students}</td>
                  <td className="px-3 py-3">{s.teachers}</td>
                  <td className="px-3 py-3">{s.parents}</td>
                  <td className="px-3 py-3 text-green-700">{s.coverage.complete}%</td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/${s.slug}/login/school`}
                      className="text-sm font-medium text-neutral-700 hover:underline"
                    >
                      School login
                    </Link>
                  </td>
                </tr>
              ))}
              {schools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-neutral-500">
                    No schools yet. Use Add school above.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </SeniorsProductAdminShell>
  );
}
