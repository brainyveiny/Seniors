"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { saRequest } from "./super-admin-api";
import {
  SA_BTN_PRIMARY,
  SA_BTN_SECONDARY,
  SA_INPUT,
  SA_LABEL,
  SaCard,
  SaNotice,
  formatDate,
  formatRelativeTime,
} from "./SuperAdminUi";

type SuperAdminRow = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

export function SuperAdminTeam({
  initialAdmins,
  currentAdminId,
}: {
  initialAdmins: SuperAdminRow[];
  currentAdminId: string;
}) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const json = await saRequest<{ admins: SuperAdminRow[] }>("/api/seniors/super-admin/team", {
        method: "POST",
        body: form,
      });
      setAdmins(json.admins);
      setMessage(`${form.email} can now sign in at /seniors/th-admin/login.`);
      setForm({ fullName: "", email: "", password: "" });
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function setActive(admin: SuperAdminRow, isActive: boolean) {
    setError("");
    setMessage("");
    try {
      const json = await saRequest<{ admins: SuperAdminRow[] }>(`/api/seniors/super-admin/team/${admin.id}`, {
        method: "PATCH",
        body: { isActive },
      });
      setAdmins(json.admins);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <SaCard
        title="Super admins"
        description="People who can manage every school on Seniors. Deactivated accounts are signed out immediately."
        bodyClassName="p-0"
        action={
          <button type="button" className={SA_BTN_PRIMARY} onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add super admin
          </button>
        }
      >
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-3 py-3 font-medium">Email</th>
              <th className="px-3 py-3 font-medium">Added</th>
              <th className="px-3 py-3 font-medium">Last login</th>
              <th className="px-5 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-5 py-3 font-medium text-neutral-900">
                  {admin.fullName}
                  {admin.id === currentAdminId ? (
                    <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-normal text-neutral-600">You</span>
                  ) : null}
                  {!admin.isActive ? (
                    <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs font-normal text-red-700">Deactivated</span>
                  ) : null}
                </td>
                <td className="px-3 py-3 text-neutral-700">{admin.email}</td>
                <td className="px-3 py-3 text-neutral-600">{formatDate(admin.createdAt)}</td>
                <td className="px-3 py-3 text-neutral-600" suppressHydrationWarning>
                  {formatRelativeTime(admin.lastLoginAt)}
                </td>
                <td className="px-5 py-3 text-right">
                  {admin.id !== currentAdminId ? (
                    <button
                      type="button"
                      className="text-sm font-medium text-neutral-700 hover:underline"
                      onClick={() => void setActive(admin, !admin.isActive)}
                    >
                      {admin.isActive ? "Deactivate" : "Activate"}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SaCard>

      {error ? <SaNotice tone="error">{error}</SaNotice> : null}
      {message ? <SaNotice tone="success">{message}</SaNotice> : null}

      {adding ? (
        <SaCard title="Add super admin">
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className={SA_LABEL}>Full name</span>
              <input
                required
                className={SA_INPUT}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </label>
            <label className="block">
              <span className={SA_LABEL}>Email</span>
              <input
                required
                type="email"
                className={SA_INPUT}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label className="block">
              <span className={SA_LABEL}>Temporary password</span>
              <input
                required
                minLength={8}
                className={SA_INPUT}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </label>
            <div className="flex gap-2 sm:col-span-3">
              <button type="submit" className={SA_BTN_PRIMARY} disabled={busy}>
                {busy ? "Adding…" : "Add super admin"}
              </button>
              <button type="button" className={SA_BTN_SECONDARY} onClick={() => setAdding(false)}>
                Cancel
              </button>
            </div>
          </form>
        </SaCard>
      ) : null}
    </div>
  );
}
