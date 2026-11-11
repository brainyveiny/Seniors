"use client";

import { useState } from "react";
import { saRequest } from "./super-admin-api";
import { SA_BTN_PRIMARY, SA_INPUT, SA_LABEL, SaCard, SaNotice } from "./SuperAdminUi";

export function SuperAdminAccount({ fullName, email }: { fullName: string; email: string }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (form.newPassword !== form.confirm) {
      setError("New passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await saRequest("/api/seniors/super-admin/account/password", {
        method: "POST",
        body: { currentPassword: form.currentPassword, newPassword: form.newPassword },
      });
      setMessage("Password changed.");
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      <SaCard title="Profile">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-neutral-500">Name</dt>
            <dd className="font-medium text-neutral-900">{fullName}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Email</dt>
            <dd className="font-medium text-neutral-900">{email}</dd>
          </div>
        </dl>
      </SaCard>

      <SaCard title="Change password">
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className={SA_LABEL}>Current password</span>
            <input
              required
              type="password"
              autoComplete="current-password"
              className={SA_INPUT}
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={SA_LABEL}>New password</span>
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              className={SA_INPUT}
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={SA_LABEL}>Confirm new password</span>
            <input
              required
              type="password"
              minLength={8}
              autoComplete="new-password"
              className={SA_INPUT}
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </label>
          {error ? <SaNotice tone="error">{error}</SaNotice> : null}
          {message ? <SaNotice tone="success">{message}</SaNotice> : null}
          <button type="submit" className={SA_BTN_PRIMARY} disabled={busy}>
            {busy ? "Saving…" : "Change password"}
          </button>
        </form>
      </SaCard>
    </div>
  );
}
