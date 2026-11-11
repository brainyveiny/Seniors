"use client";

import { useState } from "react";
import { KeyRound, LogIn, Pencil, Plus, Trash2 } from "lucide-react";
import type {
  SeniorsSchoolAdminAccount,
  SeniorsSchoolDetail,
} from "@/application/seniors/seniors-product-admin";
import { saRequest, schoolApi } from "./super-admin-api";
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

type Mode =
  | { kind: "none" }
  | { kind: "add" }
  | { kind: "edit"; admin: SeniorsSchoolAdminAccount }
  | { kind: "reset"; admin: SeniorsSchoolAdminAccount };

function randomPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(10);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export function SuperAdminSchoolAdmins({
  school,
  onAdminsChange,
  onOpenAs,
  opening,
}: {
  school: SeniorsSchoolDetail;
  onAdminsChange: (admins: SeniorsSchoolAdminAccount[]) => void;
  onOpenAs: (adminId: string) => void;
  opening: boolean;
}) {
  const [mode, setMode] = useState<Mode>({ kind: "none" });
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function start(next: Mode) {
    setError("");
    setMessage("");
    setMode(next);
    if (next.kind === "add") setForm({ fullName: "", email: "", phone: "", password: randomPassword() });
    if (next.kind === "edit") {
      setForm({ fullName: next.admin.fullName, email: next.admin.email, phone: next.admin.phone, password: "" });
    }
    if (next.kind === "reset") setForm((f) => ({ ...f, password: randomPassword() }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let json: { admins: SeniorsSchoolAdminAccount[] };
      if (mode.kind === "add") {
        json = await saRequest(schoolApi(school.id, "/admins"), { method: "POST", body: form });
        setMessage(`Admin added. Share the password with them: ${form.password}`);
      } else if (mode.kind === "edit") {
        json = await saRequest(schoolApi(school.id, `/admins/${mode.admin.id}`), {
          method: "PATCH",
          body: { fullName: form.fullName, email: form.email, phone: form.phone },
        });
        setMessage("Admin details updated.");
      } else if (mode.kind === "reset") {
        json = await saRequest(schoolApi(school.id, `/admins/${mode.admin.id}`), {
          method: "PATCH",
          body: { password: form.password },
        });
        setMessage(`New password for ${mode.admin.email}: ${form.password}`);
      } else {
        return;
      }
      onAdminsChange(json.admins);
      setMode({ kind: "none" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(admin: SeniorsSchoolAdminAccount) {
    if (!window.confirm(`Remove ${admin.fullName} (${admin.email}) as a school admin?`)) return;
    setError("");
    setMessage("");
    try {
      const json = await saRequest<{ admins: SeniorsSchoolAdminAccount[] }>(
        schoolApi(school.id, `/admins/${admin.id}`),
        { method: "DELETE" },
      );
      onAdminsChange(json.admins);
      setMessage(`${admin.email} removed.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-4">
      <SaCard
        title="School admins"
        description="People who run this school's admin panel."
        bodyClassName="p-0"
        action={
          <button type="button" className={SA_BTN_PRIMARY} onClick={() => start({ kind: "add" })}>
            <Plus className="h-4 w-4" /> Add admin
          </button>
        }
      >
        <div className="overflow-x-auto">
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
              {school.admins.map((admin) => (
                <tr key={admin.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-5 py-3 font-medium text-neutral-900">
                    {admin.fullName}
                    {admin.phone ? <span className="block text-xs font-normal text-neutral-500">{admin.phone}</span> : null}
                  </td>
                  <td className="px-3 py-3 text-neutral-700">{admin.email}</td>
                  <td className="px-3 py-3 text-neutral-600">{formatDate(admin.joinedAt)}</td>
                  <td className="px-3 py-3 text-neutral-600" suppressHydrationWarning>
                    {formatRelativeTime(admin.lastLoginAt)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <IconButton label="Open panel as this admin" onClick={() => onOpenAs(admin.id)} disabled={opening || school.status === "suspended"}>
                        <LogIn className="h-4 w-4" />
                      </IconButton>
                      <IconButton label="Reset password" onClick={() => start({ kind: "reset", admin })}>
                        <KeyRound className="h-4 w-4" />
                      </IconButton>
                      <IconButton label="Edit details" onClick={() => start({ kind: "edit", admin })}>
                        <Pencil className="h-4 w-4" />
                      </IconButton>
                      <IconButton label="Remove admin" onClick={() => void remove(admin)} danger>
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
              {school.admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-neutral-500">
                    This school has no admin. Add one so the school can sign in.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SaCard>

      {error ? <SaNotice tone="error">{error}</SaNotice> : null}
      {message ? <SaNotice tone="success">{message}</SaNotice> : null}

      {mode.kind !== "none" ? (
        <SaCard
          title={
            mode.kind === "add"
              ? "Add school admin"
              : mode.kind === "edit"
                ? `Edit ${mode.admin.fullName}`
                : `Reset password for ${mode.admin.fullName}`
          }
        >
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            {mode.kind !== "reset" ? (
              <>
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
                  <span className={SA_LABEL}>Phone</span>
                  <input
                    className={SA_INPUT}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </label>
              </>
            ) : null}
            {mode.kind !== "edit" ? (
              <label className="block">
                <span className={SA_LABEL}>{mode.kind === "reset" ? "New password" : "Password"}</span>
                <div className="flex gap-2">
                  <input
                    required
                    minLength={6}
                    className={`${SA_INPUT} font-mono`}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    className={`${SA_BTN_SECONDARY} mt-1`}
                    onClick={() => setForm({ ...form, password: randomPassword() })}
                  >
                    Generate
                  </button>
                </div>
              </label>
            ) : null}
            <div className="flex gap-2 sm:col-span-2">
              <button type="submit" className={SA_BTN_PRIMARY} disabled={busy}>
                {busy ? "Saving…" : mode.kind === "reset" ? "Reset password" : "Save"}
              </button>
              <button type="button" className={SA_BTN_SECONDARY} onClick={() => setMode({ kind: "none" })}>
                Cancel
              </button>
            </div>
          </form>
        </SaCard>
      ) : null}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  danger,
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={
        danger
          ? "rounded-lg p-2 text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
          : "rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-40"
      }
    >
      {children}
    </button>
  );
}
