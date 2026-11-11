"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut, User, X } from "lucide-react";
import type { SiteContext } from "@/application/hooks/use-site-context";
import type { SeniorsRole } from "@/infrastructure/auth/auth-constants";
import { logoutSeniorsRoleAndGoHome } from "@/application/services/seniors-session";
import { useSeniorsConfirm } from "@/presentation/components/templates/seniors/shared/SeniorsConfirmProvider";
import {
  getCachedProfile,
  loadProfile,
  type SeniorsProfilePayload,
} from "@/presentation/components/templates/seniors/shared/seniors-profile-cache";
import { useSeniorsTheme } from "@/presentation/components/templates/seniors/shared/SeniorsTheme";
import { cn } from "@/shared/lib/utils";

export type { SeniorsProfilePayload };

const ROLE_LABELS: Record<SeniorsRole, string> = {
  student: "Student",
  teacher: "Teacher",
  parent: "Parent",
  "school-admin": "School Admin",
};

export function SeniorsProfileDrawer({
  ctx,
  role,
  open,
  onClose,
  fallbackName,
  fallbackSubtitle,
}: {
  ctx: SiteContext;
  role: SeniorsRole;
  open: boolean;
  onClose: () => void;
  fallbackName?: string;
  fallbackSubtitle?: string;
}) {
  const cached = getCachedProfile(ctx.tenant, role);
  const [profile, setProfile] = useState<SeniorsProfilePayload | null>(cached);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const { theme, brandStyle } = useSeniorsTheme();
  const { confirm } = useSeniorsConfirm();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const warm = getCachedProfile(ctx.tenant, role);
    if (warm) setProfile(warm);
    setError("");
    let cancelled = false;
    void loadProfile(ctx.tenant, role)
      .then((next) => {
        if (!cancelled) setProfile(next);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load profile");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, ctx.tenant, role]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  async function logout() {
    const shouldLogout = await confirm({
      title: "Log out?",
      message: "Do you want to log out?",
      confirmLabel: "Log out",
      cancelLabel: "Cancel",
    });
    if (!shouldLogout) return;
    await logoutSeniorsRoleAndGoHome(ctx.tenant, role);
  }

  const name = profile?.fullName || fallbackName || "Account";
  const initial = (name.trim()[0] || "S").toUpperCase();
  const roleLabel =
    profile?.roleLabel || fallbackSubtitle || ROLE_LABELS[role];
  const schoolName = profile?.schoolName || ctx.academyName || ctx.tenant;
  const schoolLogo = profile?.schoolLogoUrl?.trim() || ctx.logoUrl?.trim() || "";
  const details = profile?.details ?? [];

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn(
        "seniors-theme-layer fixed inset-0 z-[60] flex items-center justify-center p-4 transition",
        open ? "pointer-events-auto" : "pointer-events-none",
        theme === "dark" && "seniors-dark",
      )}
      data-theme={theme}
      style={brandStyle}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={cn(
          "absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity",
          open ? "opacity-100" : "opacity-0",
        )}
        aria-label="Close profile"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative flex max-h-[min(90vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl transition-all duration-200",
          open ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
        style={{
          backgroundColor: "var(--sp-surface, #ffffff)",
          borderColor: "var(--sp-border, #E8EEF5)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Profile"
      >
        <div
          className="flex items-center justify-between border-b px-4 py-3"
          style={{ borderColor: "var(--sp-border, #E8EEF5)" }}
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-[var(--sp-brand-text)]" />
            <p
              className="text-sm font-bold"
              style={{ color: "var(--sp-text-strong, #111827)" }}
            >
              Profile
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 transition hover:bg-[var(--sp-surface-2,#F3F6FB)]"
            style={{ color: "var(--sp-muted, #6B7280)" }}
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="flex flex-col items-center text-center">
            {schoolLogo ? (
              <div
                className="mb-3 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border p-1.5"
                style={{
                  borderColor: "var(--sp-border, #E5E7EB)",
                  backgroundColor: "var(--sp-surface, #ffffff)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={schoolLogo} alt={schoolName} className="h-full w-full object-contain" />
              </div>
            ) : null}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--sp-brand-soft)] text-2xl font-bold text-[var(--sp-brand-text)] ring-4 ring-[var(--sp-brand-border)]">
              {initial}
            </div>
            <p
              className="mt-3 text-lg font-bold"
              style={{ color: "var(--sp-text-strong, #111827)" }}
            >
              {name}
            </p>
            <p className="mt-0.5 text-sm" style={{ color: "var(--sp-muted, #6B7280)" }}>
              {roleLabel}
            </p>
            {schoolName ? (
              <p className="mt-1 text-xs" style={{ color: "var(--sp-muted-2, #9CA3AF)" }}>
                {schoolName}
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="mt-6 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
              {error}
            </p>
          ) : null}

          {details.length > 0 ? (
            <div className="mt-6 space-y-3">
              {details.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border px-3.5 py-3"
                  style={{
                    borderColor: "var(--sp-border, #E5E7EB)",
                    backgroundColor: "var(--sp-surface-2, #F9FAFB)",
                  }}
                >
                  <p
                    className="text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: "var(--sp-muted-2, #9CA3AF)" }}
                  >
                    {row.label}
                  </p>
                  <p
                    className="mt-1 break-words text-sm font-medium"
                    style={{ color: "var(--sp-text, #1F2937)" }}
                  >
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div
          className="border-t p-4"
          style={{ borderColor: "var(--sp-border, #E8EEF5)" }}
        >
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEF2F2] px-4 py-2.5 text-sm font-semibold text-[#B91C1C] transition hover:bg-[#FEE2E2]"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
