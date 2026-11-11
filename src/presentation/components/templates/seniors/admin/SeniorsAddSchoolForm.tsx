"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const INPUT =
  "mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none";

export function SeniorsAddSchoolForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    schoolName: "",
    schoolCode: "",
    adminName: "School Admin",
    adminEmail: "",
    adminPassword: "demo1234",
  });

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
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setOpen(false);
      setForm({
        schoolName: "",
        schoolCode: "",
        adminName: "School Admin",
        adminEmail: "",
        adminPassword: "demo1234",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Add school
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="font-semibold text-neutral-900">Add school</p>
        <button
          type="button"
          className="text-sm text-neutral-500 hover:text-neutral-800"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-neutral-700">School name</span>
          <input
            required
            className={INPUT}
            value={form.schoolName}
            onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-neutral-700">School code</span>
          <input
            required
            className={INPUT}
            placeholder="e.g. dps-noida"
            value={form.schoolCode}
            onChange={(e) => setForm({ ...form, schoolCode: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-neutral-700">Admin name</span>
          <input
            className={INPUT}
            value={form.adminName}
            onChange={(e) => setForm({ ...form, adminName: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-neutral-700">Admin email</span>
          <input
            required
            type="email"
            className={INPUT}
            value={form.adminEmail}
            onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-neutral-700">Admin password</span>
          <input
            required
            type="text"
            className={INPUT}
            value={form.adminPassword}
            onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
          />
        </label>
      </div>
      {error ? (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
      >
        {saving ? "Creating…" : "Create school"}
      </button>
    </form>
  );
}
