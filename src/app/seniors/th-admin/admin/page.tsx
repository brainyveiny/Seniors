import Link from "next/link";
import { listSeniorsSchools } from "@/application/seniors/seniors-product-admin";
import { SeniorsProductAdminShell } from "@/presentation/components/templates/seniors/admin/SeniorsProductAdminShell";

export const dynamic = "force-dynamic";

export default async function SeniorsProductAdminHomePage() {
  const schools = await listSeniorsSchools();
  const totalStudents = schools.reduce((s, x) => s + x.students, 0);
  const totalTeachers = schools.reduce((s, x) => s + x.teachers, 0);

  return (
    <SeniorsProductAdminShell title="Overview">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Schools", value: schools.length },
            { label: "Students", value: totalStudents },
            { label: "Teachers", value: totalTeachers },
            { label: "Live sites", value: schools.length },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Links you share
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-neutral-600">Seniors website</span>
              <code className="rounded bg-neutral-100 px-2 py-1 text-neutral-900">/seniors</code>
            </li>
            <li className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-neutral-600">School portal login</span>
              <code className="rounded bg-neutral-100 px-2 py-1 text-neutral-900">
                /seniors/login/school
              </code>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <h2 className="font-semibold text-neutral-900">Your schools</h2>
            <Link
              href="/seniors/th-admin/admin/schools"
              className="text-sm font-medium text-neutral-700 hover:underline"
            >
              Manage schools →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-neutral-50 text-neutral-500">
                <tr>
                  <th className="px-5 py-3 font-medium">School</th>
                  <th className="px-3 py-3 font-medium">Code</th>
                  <th className="px-3 py-3 font-medium">Students</th>
                  <th className="px-3 py-3 font-medium">Content</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {schools.slice(0, 8).map((s) => (
                  <tr key={s.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-5 py-3 font-medium text-neutral-900">{s.name}</td>
                    <td className="px-3 py-3 text-neutral-600">{s.slug}</td>
                    <td className="px-3 py-3 text-neutral-600">{s.students}</td>
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
                    <td colSpan={5} className="px-5 py-10 text-center text-neutral-500">
                      No schools yet. Open Schools and click Add school.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SeniorsProductAdminShell>
  );
}
