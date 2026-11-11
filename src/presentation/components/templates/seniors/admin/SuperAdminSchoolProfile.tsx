"use client";

import { useState } from "react";
import type { SeniorsSchoolDetail } from "@/application/seniors/seniors-product-admin";
import { saRequest, schoolApi } from "./super-admin-api";
import { SA_BTN_PRIMARY, SA_INPUT, SA_LABEL, SaCard, SaNotice } from "./SuperAdminUi";

const FIELDS: { key: keyof SeniorsSchoolDetail["profile"]; label: string; type?: string; wide?: boolean }[] = [
  { key: "contactName", label: "Contact person" },
  { key: "contactEmail", label: "Contact email", type: "email" },
  { key: "contactPhone", label: "Contact phone" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "address", label: "Address", wide: true },
];

export function SuperAdminSchoolProfile({
  school,
  onSaved,
}: {
  school: SeniorsSchoolDetail;
  onSaved: (school: SeniorsSchoolDetail) => void;
}) {
  const [form, setForm] = useState({ ...school.profile });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const json = await saRequest<{ school: SeniorsSchoolDetail }>(schoolApi(school.id), {
        method: "PATCH",
        body: { profile: form },
      });
      onSaved(json.school);
      setMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-2">
      <SaCard title="School contact" description="Who to reach at the school for billing and support.">
        <div className="grid gap-3 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <label key={field.key} className={field.wide ? "block sm:col-span-2" : "block"}>
              <span className={SA_LABEL}>{field.label}</span>
              {field.wide ? (
                <textarea
                  rows={2}
                  className={SA_INPUT}
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                />
              ) : (
                <input
                  type={field.type ?? "text"}
                  className={SA_INPUT}
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                />
              )}
            </label>
          ))}
        </div>
      </SaCard>

      <SaCard title="Internal notes" description="Only visible to Seniors super admins. The school never sees these.">
        <textarea
          rows={9}
          className={SA_INPUT}
          placeholder="Contract details, onboarding status, support history…"
          value={form.internalNotes}
          onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
        />
      </SaCard>

      <div className="space-y-3 lg:col-span-2">
        {error ? <SaNotice tone="error">{error}</SaNotice> : null}
        {message ? <SaNotice tone="success">{message}</SaNotice> : null}
        <button type="submit" className={SA_BTN_PRIMARY} disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
