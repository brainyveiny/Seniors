"use client";

import { useRef, useState } from "react";
import { BookOpen, Home, ImagePlus, Loader2, Megaphone, Trash2, Users } from "lucide-react";
import type { SeniorsSchoolDetail } from "@/application/seniors/seniors-product-admin";
import { resolveAcademyImageUrl } from "@/shared/lib/academy-media-url";
import { ACADEMY_IMAGE_ACCEPT } from "@/shared/lib/academy-image-limits";
import {
  SENIORS_BRAND_PRESETS,
  brandContrastWarning,
  normalizeHex,
  resolveSchoolBrandHex,
  seniorsBrandCssVars,
} from "@/shared/lib/seniors-brand";
import { cn } from "@/shared/lib/utils";
import { saRequest, schoolApi } from "./super-admin-api";
import { SA_BTN_PRIMARY, SA_BTN_SECONDARY, SA_INPUT, SA_LABEL, SaCard, SaNotice } from "./SuperAdminUi";

export function SuperAdminBrandingEditor({
  school,
  onSaved,
}: {
  school: SeniorsSchoolDetail;
  onSaved: (school: SeniorsSchoolDetail) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ ...school.branding });
  const [hexDraft, setHexDraft] = useState(school.branding.primaryColor);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const dirty =
    form.schoolName !== school.branding.schoolName ||
    form.logoUrl !== school.branding.logoUrl ||
    form.primaryColor !== school.branding.primaryColor ||
    form.tagline !== school.branding.tagline;
  const warning = brandContrastWarning(form.primaryColor);

  function setColor(value: string) {
    setHexDraft(value);
    const hex = normalizeHex(value);
    if (hex) setForm((f) => ({ ...f, primaryColor: hex }));
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch(schoolApi(school.id, "/logo"), { method: "POST", body });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
      setForm((f) => ({ ...f, logoUrl: json.url! }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const json = await saRequest<{ school: SeniorsSchoolDetail }>(schoolApi(school.id), {
        method: "PATCH",
        body: { branding: form },
      });
      onSaved(json.school);
      setForm({ ...json.school.branding });
      setHexDraft(json.school.branding.primaryColor);
      setMessage("Branding saved. Every panel of this school now uses it.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <SaCard
        title="School branding"
        description="Shown on the school's login pages, browser tab and in the admin, teacher, student and parent panels."
      >
        <div className="space-y-5">
          <div>
            <span className={SA_LABEL}>Logo</span>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                {form.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveAcademyImageUrl(form.logoUrl)}
                    alt="School logo"
                    className="h-full w-full object-contain p-1.5"
                  />
                ) : (
                  <span className="text-2xl font-bold text-neutral-300">
                    {(form.schoolName.trim()[0] || "S").toUpperCase()}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={SA_BTN_SECONDARY}
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {uploading ? "Uploading…" : form.logoUrl ? "Replace" : "Upload logo"}
                  </button>
                  {form.logoUrl ? (
                    <button
                      type="button"
                      className={SA_BTN_SECONDARY}
                      onClick={() => setForm((f) => ({ ...f, logoUrl: "" }))}
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  ) : null}
                </div>
                <p className="text-xs text-neutral-500">Square PNG with transparent background works best. Max 5 MB.</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept={ACADEMY_IMAGE_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadLogo(file);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <label className="block">
            <span className={SA_LABEL}>School name</span>
            <input
              className={SA_INPUT}
              value={form.schoolName}
              maxLength={120}
              onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
            />
          </label>

          <label className="block">
            <span className={SA_LABEL}>Tagline</span>
            <input
              className={SA_INPUT}
              value={form.tagline}
              maxLength={160}
              placeholder="e.g. Excellence in learning since 1985"
              onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
            />
            <span className="mt-1 block text-xs text-neutral-500">Shown on the school&apos;s login pages.</span>
          </label>

          <div>
            <span className={SA_LABEL}>Brand colour</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {SENIORS_BRAND_PRESETS.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  title={preset.label}
                  aria-label={preset.label}
                  onClick={() => setColor(preset.hex)}
                  className={cn(
                    "h-8 w-8 rounded-full ring-offset-2 transition",
                    form.primaryColor === preset.hex ? "ring-2 ring-neutral-900" : "hover:scale-110",
                  )}
                  style={{ backgroundColor: preset.hex }}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="color"
                className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-neutral-200 bg-white p-1"
                value={resolveSchoolBrandHex(form.primaryColor)}
                onChange={(e) => setColor(e.target.value.toUpperCase())}
                aria-label="Pick a custom colour"
              />
              <input
                className={cn(SA_INPUT, "mt-0 w-36 font-mono uppercase")}
                value={hexDraft}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Hex colour"
              />
            </div>
            {warning ? <p className="mt-2 text-xs text-amber-700">{warning}</p> : null}
          </div>

          {error ? <SaNotice tone="error">{error}</SaNotice> : null}
          {message ? <SaNotice tone="success">{message}</SaNotice> : null}

          <div className="flex gap-2">
            <button
              type="button"
              className={SA_BTN_PRIMARY}
              disabled={!dirty || saving || uploading}
              onClick={() => void save()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save branding
            </button>
            {dirty ? (
              <button
                type="button"
                className={SA_BTN_SECONDARY}
                onClick={() => {
                  setForm({ ...school.branding });
                  setHexDraft(school.branding.primaryColor);
                }}
              >
                Discard changes
              </button>
            ) : null}
          </div>
        </div>
      </SaCard>

      <BrandPreview
        name={form.schoolName || "School name"}
        logoUrl={form.logoUrl}
        hex={form.primaryColor}
        tagline={form.tagline}
      />
    </div>
  );
}

function BrandPreview({
  name,
  logoUrl,
  hex,
  tagline,
}: {
  name: string;
  logoUrl: string;
  hex: string;
  tagline: string;
}) {
  const logo = resolveAcademyImageUrl(logoUrl);
  const mark = logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" className="h-8 w-8 shrink-0 object-contain" />
  ) : (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
      style={{ backgroundColor: "var(--sp-brand)", color: "var(--sp-on-brand)" }}
    >
      {(name.trim()[0] || "S").toUpperCase()}
    </span>
  );

  return (
    <div className="space-y-4" style={seniorsBrandCssVars(hex, false)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Live preview</p>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-[#f5f5f7] shadow-sm">
        <div className="flex">
          <div className="w-44 shrink-0 border-r border-neutral-200 p-3">
            <div className="mb-4 flex items-center gap-2">
              {mark}
              <span className="line-clamp-2 text-xs font-bold leading-tight text-neutral-900">{name}</span>
            </div>
            {[
              { label: "Dashboard", Icon: Home, active: true },
              { label: "Students", Icon: Users },
              { label: "Content", Icon: BookOpen },
              { label: "Announcements", Icon: Megaphone },
            ].map(({ label, Icon, active }) => (
              <div
                key={label}
                className={cn(
                  "mb-1 flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[11px] font-medium",
                  active ? "bg-white shadow-sm" : "text-neutral-500",
                )}
                style={active ? { color: "var(--sp-brand-text)" } : undefined}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-1 bg-white p-4">
            <p className="text-sm font-bold text-neutral-900">Good morning, Priya</p>
            <p className="text-[11px] text-neutral-500">Here is what is happening at {name} today.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg p-2.5" style={{ backgroundColor: "var(--sp-brand-soft)" }}>
                <p className="text-[10px] text-neutral-500">Homework due</p>
                <p className="text-lg font-bold" style={{ color: "var(--sp-brand-text)" }}>
                  4
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-2.5">
                <p className="text-[10px] text-neutral-500">Attendance</p>
                <p className="text-lg font-bold text-neutral-900">96%</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className="rounded-lg px-3 py-1.5 text-[11px] font-semibold"
                style={{ backgroundColor: "var(--sp-brand)", color: "var(--sp-on-brand)" }}
              >
                Primary button
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: "var(--sp-brand-soft-2)", color: "var(--sp-brand-text)" }}
              >
                New
              </span>
              <span className="text-[11px] font-medium underline" style={{ color: "var(--sp-brand-text)" }}>
                View all
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="grid grid-cols-2">
          <div className="p-4">
            <div className="flex items-center gap-2">
              {mark}
              <span className="text-xs font-bold text-neutral-900">{name}</span>
            </div>
            <p className="mt-4 text-sm font-bold text-neutral-900">Student login</p>
            <div className="mt-2 h-7 rounded-md border border-neutral-200" />
            <div className="mt-1.5 h-7 rounded-md border border-neutral-200" />
            <div
              className="mt-2.5 flex h-7 items-center justify-center rounded-md text-[11px] font-semibold"
              style={{ backgroundColor: "var(--sp-brand)", color: "var(--sp-on-brand)" }}
            >
              Sign in
            </div>
          </div>
          <div
            className="flex flex-col justify-center p-4"
            style={{
              background: "linear-gradient(135deg, var(--sp-brand) 0%, var(--sp-brand-hover) 100%)",
              color: "var(--sp-on-brand)",
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Welcome to</p>
            <p className="mt-1 text-sm font-bold leading-tight">{name}</p>
            {tagline ? <p className="mt-1 text-[11px] opacity-90">{tagline}</p> : null}
          </div>
        </div>
      </div>
      <p className="text-xs text-neutral-500">
        Dark mode uses lighter tints of the same colour automatically.
      </p>
    </div>
  );
}
