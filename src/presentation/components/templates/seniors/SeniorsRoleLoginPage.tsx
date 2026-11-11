"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { enterSeniorsApp } from "@/application/services/seniors-session";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { SiteContext } from "@/application/hooks/use-site-context";
import type { SeniorsRole } from "@/infrastructure/auth/auth-constants";
import {
  SENIORS_AUTH_INPUT,
  SeniorsAuthShell,
  type SeniorsAuthSchoolBrand,
} from "@/presentation/components/templates/seniors/SeniorsAuthShell";
import { useTenantServerSiteSnapshot } from "@/presentation/components/tenant/TenantServerSiteProvider";
import {
  SENIORS_PLATFORM_LOGIN_PATHS,
  seniorsTenantPortalPath,
} from "@/shared/lib/seniors-platform-urls";

const ROLE_META: Record<
  SeniorsRole,
  { title: string; subtitle: string; badge: string }
> = {
  student: {
    title: "Student login",
    subtitle: "Access your syllabus, homework, quizzes, and progress.",
    badge: "Student",
  },
  parent: {
    title: "Parent login",
    subtitle: "Track your child's progress, alerts, and school updates.",
    badge: "Parent",
  },
  teacher: {
    title: "Teacher login",
    subtitle: "Upload content, create assignments, and review submissions.",
    badge: "Teacher",
  },
  "school-admin": {
    title: "School login",
    subtitle: "Manage teachers, students, parents, and school settings.",
    badge: "School",
  },
};

const ROLE_LINKS: { role: SeniorsRole; label: string }[] = [
  { role: "student", label: "Student" },
  { role: "parent", label: "Parent" },
  { role: "teacher", label: "Teacher" },
  { role: "school-admin", label: "School" },
];

function loginSegment(role: SeniorsRole) {
  return role === "school-admin" ? "school" : role;
}

function roleLoginHref(ctx: SiteContext | null | undefined, role: SeniorsRole, platformMode: boolean) {
  if (ctx) return ctx.sitePath(`login/${loginSegment(role)}`);
  if (platformMode) return "/seniors/login";
  return SENIORS_PLATFORM_LOGIN_PATHS[role];
}

function safeLoginNext(
  nextParam: string | null,
  role: SeniorsRole,
  tenantSlug: string,
): string | null {
  if (!nextParam || nextParam.startsWith("/seniors/")) return null;
  if (!tenantSlug || !nextParam.startsWith(`/${tenantSlug}/`)) return null;
  const area = role === "school-admin" ? "school-admin" : role;
  if (!nextParam.includes(`/${area}/`) && !(area === "school-admin" && nextParam.includes("/school-admin/"))) {
    return null;
  }
  return nextParam;
}

const INPUT = SENIORS_AUTH_INPUT;

/** Branding of the school whose login page this is, or null on platform pages. */
function useSchoolBrand(ctx: SiteContext | null | undefined): SeniorsAuthSchoolBrand | null {
  const snapshot = useTenantServerSiteSnapshot();
  if (!ctx || !snapshot || snapshot.tenant !== ctx.tenant) return null;
  return {
    name: snapshot.academyName,
    logoUrl: snapshot.logoUrl,
    tagline: snapshot.tagline,
    brandHex: snapshot.brandHex,
  };
}

type Step =
  | "credentials"
  | "forgot-email"
  | "forgot-otp"
  | "forgot-reset";

export function SeniorsRoleLoginPage({
  ctx,
  role,
  platformMode = false,
}: {
  ctx?: SiteContext | null;
  role: SeniorsRole;
  /** Login on /seniors -school resolved from account when needed */
  platformMode?: boolean;
  mode?: "login" | "signup";
}) {
  const searchParams = useSearchParams();
  const meta = ROLE_META[role];
  const homeHref = platformMode || !ctx ? "/seniors" : ctx.sitePath("");
  const school = useSchoolBrand(platformMode ? null : ctx);

  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [schoolCode, setSchoolCode] = useState(
    () => searchParams.get("school")?.trim().toLowerCase() ?? ctx?.tenant ?? "",
  );
  const [needsLoginSchoolCode, setNeedsLoginSchoolCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInWithPassword() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const tenant = (ctx?.tenant || schoolCode).trim().toLowerCase();
      const res = await fetch("/api/auth/seniors/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role,
          ...(tenant ? { tenant } : {}),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        redirectTo?: string;
        needsSchoolCode?: boolean;
      };
      if (!res.ok) {
        if (data.needsSchoolCode) setNeedsLoginSchoolCode(true);
        throw new Error(data.error ?? "Invalid credentials");
      }
      const nextParam = searchParams.get("next");
      const safeNext = safeLoginNext(nextParam, role, tenant);
      enterSeniorsApp(
        safeNext ??
          data.redirectTo ??
          (tenant ? seniorsTenantPortalPath(tenant, role) : data.redirectTo ?? "/seniors"),
        {
          studentLoginBurst: role === "student",
        },
      );
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function requestForgotOtp() {
    setError(null);
    setSuccess(null);
    setLoading(true);
    setDevOtp(null);
    try {
      const res = await fetch("/api/auth/seniors/forgot-password/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string; devOtp?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send OTP");
      if (data.devOtp) setDevOtp(data.devOtp);
      setStep("forgot-otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function verifyForgotOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/seniors/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Invalid OTP");
      setStep("forgot-reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  async function submitForgotReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/seniors/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword,
          schoolCode: schoolCode.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to reset password");
      setSuccess(data.message ?? "Password updated. You can sign in now.");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtp("");
      setStep("credentials");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  const stepTitle =
    step === "credentials"
      ? meta.title
      : step === "forgot-email"
        ? "Forgot password"
        : step === "forgot-otp"
          ? "Enter reset code"
          : "Set new password";

  const stepSubtitle =
    step === "credentials"
      ? "Enter your email and password to sign in."
      : step === "forgot-email"
        ? "Enter your account email -we will send a reset code."
        : step === "forgot-otp"
          ? `Code sent to ${email}`
          : "Choose a new password for your account.";

  const backButton =
    step !== "credentials" ? (
      <button
        type="button"
        onClick={() => {
          setError(null);
          if (step === "forgot-email") setStep("credentials");
          else if (step === "forgot-otp") setStep("forgot-email");
          else if (step === "forgot-reset") setStep("forgot-otp");
        }}
        className="text-sm font-semibold text-[#6B7280] hover:text-[#111827]"
      >
        ← Back
      </button>
    ) : null;

  return (
    <SeniorsAuthShell
      school={school}
      onClose={() => {
        window.location.href = homeHref;
      }}
      headerAction={
        <span className="rounded-full bg-[var(--sp-auth-primary)] px-3 py-1 text-xs font-semibold text-[var(--sp-auth-on-primary)]">
          {meta.badge}
        </span>
      }
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/seniors/signup" className="font-semibold text-[var(--sp-auth-link)] hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      {backButton}
      <div className="mb-6 mt-2">
        <h1 className="text-3xl font-bold text-[#111827]">{stepTitle}</h1>
        <p className="mt-2 text-sm text-[#6B7280]">{stepSubtitle}</p>
      </div>
      <div>

          {step === "credentials" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void signInWithPassword();
              }}
              className="mt-6 space-y-4"
            >
              {success ? (
                <p className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-sm text-[#047857]">
                  {success}
                </p>
              ) : null}
              <label className="block text-sm">
                <span className="font-medium text-[#374151]">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT}
                  autoComplete="username"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[#374151]">Password</span>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${INPUT} pr-10`}
                    autoComplete="current-password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </label>
              {needsLoginSchoolCode ? (
                <label className="block text-sm">
                  <span className="font-medium text-[#374151]">School code</span>
                  <input
                    required
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value)}
                    className={INPUT}
                    placeholder="e.g. greenwood"
                    autoComplete="organization"
                  />
                </label>
              ) : null}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm font-semibold text-[var(--sp-auth-link)] hover:underline"
                  onClick={() => {
                    setError(null);
                    setSuccess(null);
                    setOtp("");
                    setDevOtp(null);
                    setStep("forgot-email");
                  }}
                >
                  Forgot password?
                </button>
              </div>
              {error ? <ErrorText message={error} /> : null}
              <button
                type="submit"
                disabled={
                  loading ||
                  !email.trim() ||
                  password.length < 6 ||
                  (needsLoginSchoolCode && !schoolCode.trim())
                }
                className="w-full rounded-lg py-3 text-sm font-semibold text-[var(--sp-auth-on-primary)] hover:brightness-95 disabled:opacity-60"
                style={{ background: "var(--sp-auth-button)" }}
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          ) : null}

          {step === "forgot-email" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void requestForgotOtp();
              }}
              className="mt-6 space-y-4"
            >
              <label className="block text-sm">
                <span className="font-medium text-[#374151]">Email</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT}
                  autoComplete="username"
                />
              </label>
              {error ? <ErrorText message={error} /> : null}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full rounded-lg py-3 text-sm font-semibold text-[var(--sp-auth-on-primary)] disabled:opacity-60"
                style={{ background: "var(--sp-auth-button)" }}
              >
                {loading ? "Sending code…" : "Send reset code"}
              </button>
            </form>
          ) : null}

          {step === "forgot-otp" ? (
            <form onSubmit={verifyForgotOtp} className="mt-6 space-y-4">
              {devOtp ? (
                <p className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-sm text-[#047857]">
                  Dev OTP: <strong className="tracking-widest">{devOtp}</strong>
                </p>
              ) : null}
              <label className="block text-sm">
                <span className="font-medium text-[#374151]">OTP</span>
                <input
                  required
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className={INPUT}
                  autoComplete="one-time-code"
                />
              </label>
              {error ? <ErrorText message={error} /> : null}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full rounded-lg py-3 text-sm font-semibold text-[var(--sp-auth-on-primary)] disabled:opacity-60"
                style={{ background: "var(--sp-auth-button)" }}
              >
                {loading ? "Verifying…" : "Verify code"}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void requestForgotOtp()}
                className="w-full text-center text-sm font-semibold text-[var(--sp-auth-link)]"
              >
                Resend code
              </button>
            </form>
          ) : null}

          {step === "forgot-reset" ? (
            <form onSubmit={submitForgotReset} className="mt-6 space-y-4">
              <label className="block text-sm">
                <span className="font-medium text-[#374151]">
                  School code (if multiple schools)
                </span>
                <input
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  className={INPUT}
                  placeholder="e.g. greenwood"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[#374151]">New password</span>
                <div className="relative">
                  <input
                    required
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${INPUT} pr-10`}
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-[#374151]">Confirm password</span>
                <div className="relative">
                  <input
                    required
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${INPUT} pr-10`}
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#4B5563]"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </label>
              {error ? <ErrorText message={error} /> : null}
              <button
                type="submit"
                disabled={loading || newPassword.length < 6 || confirmPassword.length < 6}
                className="w-full rounded-lg py-3 text-sm font-semibold text-[var(--sp-auth-on-primary)] disabled:opacity-60"
                style={{ background: "var(--sp-auth-button)" }}
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          ) : null}

      <div className="mt-8 border-t border-[#E5E7EB] pt-4">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">
          Switch login
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {ROLE_LINKS.filter((r) => r.role !== role).map((r) => (
            <Link
              key={r.role}
              href={roleLoginHref(ctx, r.role, platformMode)}
              className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-semibold text-[#374151] hover:border-[var(--sp-auth-accent)]/30 hover:bg-[#F9FAFB]"
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>
      </div>
    </SeniorsAuthShell>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
      {message}
    </p>
  );
}

export function SeniorsLoginHub({ ctx }: { ctx?: SiteContext | null }) {
  const school = useSchoolBrand(ctx);
  return (
    <SeniorsAuthShell
      wide
      school={school}
      onClose={() => {
        window.location.href = "/seniors";
      }}
      footer={
        <>
          New to Seniors?{" "}
          <Link href="/seniors/signup" className="font-semibold text-[var(--sp-auth-link)] hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#111827]">Sign in</h1>
        <p className="mt-2 text-sm text-[#6B7280]">
          Choose your role to continue with email and password.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {ROLE_LINKS.map((r) => (
          <Link
            key={r.role}
            href={roleLoginHref(ctx, r.role, !ctx)}
            className="rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm transition hover:border-[var(--sp-auth-accent)]/40 hover:shadow-[0_8px_24px_rgba(85,33,181,0.1)]"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sp-auth-link)]">
              {ROLE_META[r.role].badge}
            </p>
            <p className="mt-1 font-semibold text-[#1F2937]">{ROLE_META[r.role].title}</p>
            <p className="mt-1 text-sm text-[#6B7280]">{ROLE_META[r.role].subtitle}</p>
          </Link>
        ))}
      </div>
    </SeniorsAuthShell>
  );
}
