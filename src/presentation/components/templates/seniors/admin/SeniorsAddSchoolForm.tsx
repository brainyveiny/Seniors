"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { SENIORS_BRAND_PRESETS, SENIORS_DEFAULT_BRAND_HEX } from "@/shared/lib/seniors-brand";
import { seniorsProductAdminPath } from "@/shared/lib/seniors-platform-urls";
import { cn } from "@/shared/lib/utils";
import { SA_BTN_PRIMARY, SA_INPUT, SaNotice } from "./SuperAdminUi";

const EMPTY_FORM = {
  schoolName: "",
  schoolCode: "",
  city: "",
  contactPhone: "",
  adminName: "School Admin",
  adminEmail: "",
  adminPassword: "demo1234",
  primaryColor: SENIORS_DEFAULT_BRAND_HEX as string,
};

export function SeniorsAddSchoolForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/seniors/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json()) as { error?: string; school?: { id: string } };
      if (!res.ok || !json.school) throw new Error(json.error || "Failed");
      setOpen(false);
      setForm(EMPTY_FORM);
      router.push(seniorsProductAdminPath(`schools/${json.school.id}?tab=branding`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={SA_BTN_PRIMARY}>
        <Plus className="h-4 w-4" />
        Add school
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-neutral-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-neutral-900">Add school</p>
            <p className="text-sm text-neutral-500">
              Creates the school, its first admin account, an academic year and a starter class.
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-neutral-500 hover:text-neutral-800"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">School</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-neutral-700">School name</span>
            <input
              required
              className={SA_INPUT}
              value={form.schoolName}
              onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-neutral-700">School code</span>
            <input
              required
              className={SA_INPUT}
              placeholder="e.g. dps-noida"
              value={form.schoolCode}
              onChange={(e) => setForm({ ...form, schoolCode: e.target.value })}
            />
            <span className="mt-1 block text-xs text-neutral-500">
              Used in login links. Lowercase letters, numbers and dashes.
            </span>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-neutral-700">City</span>
            <input
              className={SA_INPUT}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-neutral-700">School phone</span>
            <input
              className={SA_INPUT}
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
            />
          </label>
          <div className="sm:col-span-2">
            <span className="text-sm font-medium text-neutral-700">Brand colour</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {SENIORS_BRAND_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  title={preset.label}
                  aria-label={preset.label}
                  onClick={() => setForm({ ...form, primaryColor: preset.hex })}
                  className={cn(
                    "h-7 w-7 rounded-full ring-offset-2 transition",
                    form.primaryColor === preset.hex ? "ring-2 ring-neutral-900" : "hover:scale-110",
                  )}
                  style={{ backgroundColor: preset.hex }}
                />
              ))}
              <span className="ml-1 text-xs text-neutral-500">
                Logo and more branding can be set on the next screen.
              </span>
            </div>
          </div>
        </div>

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          First school admin
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-neutral-700">Admin name</span>
            <input
              className={SA_INPUT}
              value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-neutral-700">Admin email</span>
            <input
              required
              type="email"
              className={SA_INPUT}
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-neutral-700">Admin password</span>
            <input
              required
              type="text"
              minLength={6}
              className={SA_INPUT}
              value={form.adminPassword}
              onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
            />
          </label>
        </div>

        {error ? (
          <div className="mt-4">
            <SaNotice tone="error">{error}</SaNotice>
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="submit" disabled={saving} className={SA_BTN_PRIMARY}>
            {saving ? "Creating…" : "Create school"}
          </button>
        </div>
      </form>
    </div>
  );
}
