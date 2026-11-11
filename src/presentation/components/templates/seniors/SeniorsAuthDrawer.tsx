"use client";

import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  GraduationCap,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SiteContext } from "@/application/hooks/use-site-context";
import type { SeniorsRole } from "@/infrastructure/auth/auth-constants";
import { enterSeniorsApp } from "@/application/services/seniors-session";
import {
  SENIORS_AUTH_GRADIENT,
  SENIORS_AUTH_INPUT,
  SENIORS_AUTH_PRIMARY,
  SeniorsAuthShell,
} from "@/presentation/components/templates/seniors/SeniorsAuthShell";
import { seniorsTenantPortalPath } from "@/shared/lib/seniors-platform-urls";
import { cn } from "@/shared/lib/utils";

const SENIORS_ACCENT = SENIORS_AUTH_PRIMARY;

const ROLES: {
  role: SeniorsRole;
  title: string;
  description: string;
  Icon: typeof GraduationCap;
  tint: string;
}[] = [
  {
    role: "student",
    title: "Student",
    description:
      "Redefining your learning experience with live class, tests, homework, study material and a lot more",
    Icon: GraduationCap,
    tint: "bg-[#EFF6FF] text-[#2563EB]",
  },
  {
    role: "teacher",
    title: "Teacher",
    description:
      "Create your own classroom and get the flexibility to teach anytime, anywhere",
    Icon: UserRound,
    tint: "bg-[#F0FDF4] text-[#16A34A]",
  },
  {
    role: "school-admin",
    title: "School",
    description: "Manage and keep a track of your students and teachers with a click",
    Icon: Building2,
    tint: "bg-[#FFF7ED] text-[#EA580C]",
  },
  {
    role: "parent",
    title: "Parent",
    description:
      "Keep track of your child's progress and evaluate their performance easily",
    Icon: Users,
    tint: "bg-[#FDF2F8] text-[#DB2777]",
  },
];

type Step =
  | "credentials"
  | "otp"
  | "roles"
  | "details"
  | "forgot-email"
  | "forgot-otp"
  | "forgot-reset";

const INPUT = SENIORS_AUTH_INPUT;

function slugifyCode(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function SeniorsAuthDrawer({
  open,
  onClose,
  ctx,
  accent = SENIORS_ACCENT,
  mode = "login",
  platformMode = false,
  initialRole = null,
  onRequestSignup,
  onRequestLogin,
  presentation = "modal",
}: {
  open: boolean;
  onClose: () => void;
  ctx?: SiteContext;
  accent?: string;
  mode?: "login" | "signup";
  platformMode?: boolean;
  initialRole?: SeniorsRole | null;
  onRequestSignup?: () => void;
  onRequestLogin?: () => void;
  presentation?: "modal" | "page";
}) {
  const [step, setStep] = useState<Step>("credentials");
  const [role, setRole] = useState<SeniorsRole | null>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [schoolCode, setSchoolCode] = useState(ctx?.tenant ?? "");
  const [schoolName, setSchoolName] = useState("");
  const [schoolCodeTouched, setSchoolCodeTouched] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [classLabel, setClassLabel] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [childQuery, setChildQuery] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [needsLoginSchoolCode, setNeedsLoginSchoolCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const needsSchoolCode = platformMode || !ctx?.tenant;
  const skipRoleStep = Boolean(initialRole);
  const isSignup = mode === "signup";
  const btnAccent = accent || SENIORS_ACCENT;

  useEffect(() => {
    if (!open && presentation !== "page") return;
    setStep(isSignup ? (initialRole ? "details" : "roles") : "credentials");
    setRole(initialRole);
    setEmail("");
    setPassword("");
    setOtp("");
    setDevOtp(null);
    setSchoolCode(ctx?.tenant ?? "");
    setSchoolName("");
    setSchoolCodeTouched(false);
    setFullName("");
    setPhone("");
    setClassLabel("");
    setRollNumber("");
    setSubject("");
    setChildQuery("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setNeedsLoginSchoolCode(false);
    setError(null);
    setSuccess(null);
  }, [open, mode, initialRole, ctx?.tenant, isSignup, presentation]);

  useEffect(() => {
    if (!open || presentation === "page") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, presentation]);

  const roleMeta = useMemo(
    () => (role ? ROLES.find((r) => r.role === role) : null),
    [role],
  );

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
          ...(tenant ? { tenant } : {}),
          ...(role ? { role } : {}),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        redirectTo?: string;
        needsSchoolCode?: boolean;
      };
      if (!res.ok) {
        if (data.needsSchoolCode) {
          setNeedsLoginSchoolCode(true);
        }
        throw new Error(data.error ?? "Invalid credentials");
      }
      const resolvedRole = role ?? "student";
      enterSeniorsApp(
        data.redirectTo ??
          (tenant ? seniorsTenantPortalPath(tenant, resolvedRole) : "/seniors"),
        {
          studentLoginBurst: resolvedRole === "student",
        },
      );
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function requestOtp() {
    setError(null);
    setLoading(true);
    setDevOtp(null);
    try {
      const res = await fetch("/api/auth/seniors/request-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, mode: "signup" }),
      });
      const data = (await res.json()) as { error?: string; devOtp?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to send OTP");
      if (data.devOtp) setDevOtp(data.devOtp);
      setStep("otp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/seniors/verify-email-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Invalid OTP");
      await finishComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  function selectRole(next: SeniorsRole) {
    setRole(next);
    setStep("details");
    setError(null);
  }

  function detailsReady(): boolean {
    if (!fullName.trim()) return false;
    if (isSignup && (!email.trim() || password.trim().length < 6)) return false;

    if (role === "school-admin" && isSignup) {
      return Boolean(schoolName.trim() && schoolCode.trim());
    }

    if (needsSchoolCode && !schoolCode.trim()) return false;
    if (isSignup && role === "parent" && !childQuery.trim()) return false;
    return true;
  }

  async function onDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    await requestOtp();
  }

  async function finishComplete() {
    if (!role) return;
    const tenant = (ctx?.tenant || schoolCode).trim().toLowerCase();
    if (role !== "school-admin" || !isSignup) {
      if (!tenant) {
        setError("Enter your school code to continue");
        return;
      }
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/seniors/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          schoolCode: tenant || schoolCode.trim().toLowerCase(),
          schoolName: role === "school-admin" ? schoolName : undefined,
          fullName,
          phone,
          classLabel: role === "student" ? classLabel : undefined,
          rollNumber: role === "student" ? rollNumber : undefined,
          subject: role === "teacher" ? subject : undefined,
          childQuery: role === "parent" ? childQuery : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; redirectTo?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      enterSeniorsApp(
        data.redirectTo ?? (tenant ? seniorsTenantPortalPath(tenant, role) : "/seniors"),
        {
          studentLoginBurst: role === "student",
        },
      );
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
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

  if (!open && presentation !== "page") return null;

  function goBack() {
    setError(null);
    setSuccess(null);
    if (step === "forgot-email") {
      setStep("credentials");
      return;
    }
    if (step === "forgot-otp") {
      setStep("forgot-email");
      return;
    }
    if (step === "forgot-reset") {
      setStep("forgot-otp");
      return;
    }
    if (isSignup) {
      if (step === "otp") setStep("details");
      else if (step === "details") {
        if (skipRoleStep) onClose();
        else {
          setRole(null);
          setStep("roles");
        }
      }
    }
  }

  const showBack =
    step !== "credentials" && !(isSignup && step === "roles" && !skipRoleStep);
  const showFooterSwitch =
    step === "roles" ||
    step === "credentials" ||
    step === "details" ||
    step === "forgot-email";


  const isWide =
    step === "roles" || (step === "details" && (role === "school-admin" || role === "student"));

  const backButton = showBack ? (
    <button
      type="button"
      onClick={goBack}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[#475569] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]"
      aria-label="Back"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  ) : null;

  const footerSwitch = showFooterSwitch ? (
    <>
      {mode === "login" || step === "forgot-email" ? (
        <>
          {step === "forgot-email" ? (
            <>
              Remember your password?{" "}
              <button
                type="button"
                className="font-semibold text-[#570080] hover:underline"
                onClick={() => {
                  setStep("credentials");
                  setError(null);
                }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?{" "}
              <button
                type="button"
                className="font-semibold text-[#570080] hover:underline"
                onClick={() => onRequestSignup?.()}
              >
                Sign Up
              </button>
            </>
          )}
        </>
      ) : (
        <>
          Already have an account?{" "}
          <button
            type="button"
            className="font-semibold text-[#570080] hover:underline"
            onClick={() => onRequestLogin?.()}
          >
            Sign In
          </button>
        </>
      )}
    </>
  ) : undefined;

  const shell = (
    <SeniorsAuthShell
      variant={presentation === "page" ? "page" : "embedded"}
      wide={isWide}
      onClose={onClose}
      headerAction={backButton}
      footer={footerSwitch}
    >
      <div className="mb-6">
              {step === "roles" ? (
                <>
                  <h2 className="text-3xl font-bold leading-tight tracking-tight text-[#111827]">
                    Sign up
                  </h2>
                  <p className="mt-2 text-sm text-[#6B7280]">
                    Select the role you would want to proceed with on Seniors.
                  </p>
                </>
              ) : null}
              {step === "details" ? (
                <>
                  <h2 className="text-3xl font-bold leading-tight tracking-tight text-[#111827]">
                    Sign up
                  </h2>
                  {roleMeta ? (
                    <p className="mt-2 text-sm text-[#6B7280]">
                      Create your{" "}
                      <span className="font-semibold text-[#111827]">{roleMeta.title}</span>{" "}
                      account to start learning with Seniors.
                    </p>
                  ) : null}
                </>
              ) : null}
              {step === "credentials" ? (
                <>
                  <h2 className="text-3xl font-bold leading-tight tracking-tight text-[#111827]">
                    Sign in
                  </h2>
                  <p className="mt-2 text-sm text-[#6B7280]">
                    Enter your email and password to access your Seniors account.
                  </p>
                </>
              ) : null}
              {step === "otp" ? (
                <>
                  <h2 className="text-3xl font-bold leading-tight tracking-tight text-[#111827]">
                    Verify email
                  </h2>
                  <p className="mt-2 text-sm text-[#6B7280]">
                    Enter the 6-digit code sent to{" "}
                    <span className="font-medium text-[#111827]">{email}</span>
                  </p>
                </>
              ) : null}
              {step === "forgot-email" ? (
                <>
                  <h2 className="text-3xl font-bold leading-tight tracking-tight text-[#111827]">
                    Forgot password
                  </h2>
                  <p className="mt-2 text-sm text-[#6B7280]">
                    Enter your account email — we will send a reset code.
                  </p>
                </>
              ) : null}
              {step === "forgot-otp" ? (
                <>
                  <h2 className="text-3xl font-bold leading-tight tracking-tight text-[#111827]">
                    Enter reset code
                  </h2>
                  <p className="mt-2 text-sm text-[#6B7280]">
                    Code sent to{" "}
                    <span className="font-medium text-[#111827]">{email}</span>
                  </p>
                </>
              ) : null}
              {step === "forgot-reset" ? (
                <>
                  <h2 className="text-3xl font-bold leading-tight tracking-tight text-[#111827]">
                    Set new password
                  </h2>
                  <p className="mt-2 text-sm text-[#6B7280]">
                    Choose a new password for your Seniors account.
                  </p>
                </>
              ) : null}
      </div>

      <div className="flex-1">
          {step === "roles" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {ROLES.map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => selectRole(item.role)}
                  className="group flex items-start gap-3 rounded-2xl border border-[#E8EEF2] bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-[#570080]/50 hover:shadow-[0_8px_24px_rgba(85,33,181,0.12)]"
                >
                  <span
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#570080]/20",
                      item.tint,
                    )}
                  >
                    <item.Icon className="h-6 w-6" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-bold text-[#0F172A]">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-[13px] leading-snug text-[#64748B]">
                      {item.description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {step === "details" && role ? (
            <form onSubmit={onDetailsSubmit} className="space-y-3">
              <div
                className={cn(
                  "grid gap-3",
                  role === "school-admin" && isSignup ? "sm:grid-cols-2" : "",
                )}
              >
              {role === "school-admin" && isSignup ? (
                <>
                  <input
                    required
                    value={schoolName}
                    onChange={(e) => {
                      const name = e.target.value;
                      setSchoolName(name);
                      if (!schoolCodeTouched) setSchoolCode(slugifyCode(name));
                    }}
                    placeholder="School name"
                    className={INPUT}
                  />
                  <div>
                    <input
                      required
                      value={schoolCode}
                      onChange={(e) => {
                        setSchoolCodeTouched(true);
                        setSchoolCode(slugifyCode(e.target.value));
                      }}
                      placeholder="School code (e.g. dps-noida)"
                      className={INPUT}
                      autoComplete="organization"
                    />
                    <p className="mt-1.5 px-0.5 text-xs text-[#94A3B8]">
                      Students and teachers will use this school code to join you.
                    </p>
                  </div>
                </>
              ) : null}

              {needsSchoolCode && !(role === "school-admin" && isSignup) ? (
                <input
                  required
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  placeholder="School code"
                  className={INPUT}
                  autoComplete="organization"
                />
              ) : null}

              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={role === "school-admin" ? "Admin name" : "Name"}
                className={INPUT}
                autoComplete="name"
              />

              {isSignup ? (
                <>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className={INPUT}
                    autoComplete="username"
                  />
                  <PasswordField
                    value={password}
                    onChange={setPassword}
                    show={showPassword}
                    onToggle={() => setShowPassword((v) => !v)}
                    placeholder="Password (min 6 characters)"
                    autoComplete="new-password"
                  />
                </>
              ) : null}

              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Mobile number"
                className={INPUT}
                autoComplete="tel"
              />

              {role === "student" ? (
                <>
                  <input
                    value={classLabel}
                    onChange={(e) => setClassLabel(e.target.value)}
                    placeholder="Class (optional, e.g. 10-A)"
                    className={INPUT}
                    aria-label="Class (optional)"
                  />
                  <input
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="Roll number (optional)"
                    className={INPUT}
                    aria-label="Roll number (optional)"
                  />
                </>
              ) : null}

              {role === "teacher" ? (
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject (optional)"
                  className={INPUT}
                />
              ) : null}

              {role === "parent" ? (
                <input
                  required={isSignup}
                  value={childQuery}
                  onChange={(e) => setChildQuery(e.target.value)}
                  placeholder="Child student email or name"
                  className={INPUT}
                />
              ) : null}
              </div>

              {error ? <ErrorBox message={error} /> : null}

              <SubmitBtn
                loading={loading}
                accent={btnAccent}
                disabled={!detailsReady()}
                label={
                  loading
                    ? "Please wait…"
                    : role === "school-admin"
                      ? "Create school"
                      : "Sign Up"
                }
              />

              {isSignup ? (
                <p className="pt-1 text-center text-xs leading-relaxed text-[#94A3B8]">
                  By signing up, you agree to our{" "}
                  <span className="font-semibold text-[#570080]">T&amp;C</span> and{" "}
                  <span className="font-semibold text-[#570080]">Privacy Policy</span>
                </p>
              ) : null}
            </form>
          ) : null}

          {step === "credentials" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void signInWithPassword();
              }}
              className="space-y-3"
            >
              {success ? (
                <p className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2.5 text-sm text-[#047857]">
                  {success}
                </p>
              ) : null}
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className={INPUT}
                autoComplete="username"
              />
              <PasswordField
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggle={() => setShowPassword((v) => !v)}
                placeholder="Password"
                autoComplete="current-password"
              />
              {needsLoginSchoolCode ? (
                <input
                  required
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value)}
                  placeholder="School code"
                  className={INPUT}
                  autoComplete="organization"
                />
              ) : null}
              <div className="flex justify-end">
                <button
                  type="button"
                  className="text-sm font-semibold text-[#570080] hover:underline"
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
              {error ? <ErrorBox message={error} /> : null}
              <SubmitBtn
                loading={loading}
                accent={btnAccent}
                disabled={
                  !email.trim() ||
                  password.trim().length < 6 ||
                  (needsLoginSchoolCode && !schoolCode.trim())
                }
                label={loading ? "Signing in…" : "Sign In"}
              />
            </form>
          ) : null}

          {step === "forgot-email" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void requestForgotOtp();
              }}
              className="space-y-3"
            >
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className={INPUT}
                autoComplete="username"
              />
              {error ? <ErrorBox message={error} /> : null}
              <SubmitBtn
                loading={loading}
                accent={btnAccent}
                disabled={!email.trim()}
                label={loading ? "Sending code…" : "Send reset code"}
              />
            </form>
          ) : null}

          {step === "forgot-otp" ? (
            <form onSubmit={verifyForgotOtp} className="space-y-3">
              {devOtp ? (
                <p className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2.5 text-sm text-[#047857]">
                  Dev OTP: <strong className="tracking-widest">{devOtp}</strong>
                </p>
              ) : null}
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter OTP"
                className={cn(INPUT, "text-center text-lg tracking-[0.4em]")}
                autoComplete="one-time-code"
              />
              {error ? <ErrorBox message={error} /> : null}
              <SubmitBtn
                loading={loading}
                accent={btnAccent}
                disabled={otp.length !== 6}
                label={loading ? "Verifying…" : "Verify code"}
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => void requestForgotOtp()}
                className="w-full text-center text-sm font-semibold text-[#570080] hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            </form>
          ) : null}

          {step === "forgot-reset" ? (
            <form onSubmit={submitForgotReset} className="space-y-3">
              <input
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                placeholder="School code (if you have multiple schools)"
                className={INPUT}
                autoComplete="organization"
              />
              <PasswordField
                value={newPassword}
                onChange={setNewPassword}
                show={showNewPassword}
                onToggle={() => setShowNewPassword((v) => !v)}
                placeholder="New password"
                autoComplete="new-password"
              />
              <PasswordField
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((v) => !v)}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
              {error ? <ErrorBox message={error} /> : null}
              <SubmitBtn
                loading={loading}
                accent={btnAccent}
                disabled={newPassword.length < 6 || confirmPassword.length < 6}
                label={loading ? "Updating…" : "Update password"}
              />
            </form>
          ) : null}

          {step === "otp" ? (
            <form onSubmit={verifyOtp} className="space-y-3">
              {devOtp ? (
                <p className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2.5 text-sm text-[#047857]">
                  Dev OTP: <strong className="tracking-widest">{devOtp}</strong>
                </p>
              ) : null}
              <input
                required
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter OTP"
                className={cn(INPUT, "text-center text-lg tracking-[0.4em]")}
                autoComplete="one-time-code"
              />
              {error ? <ErrorBox message={error} /> : null}
              <SubmitBtn
                loading={loading}
                accent={btnAccent}
                disabled={otp.length !== 6}
                label={loading ? "Verifying…" : "Verify & continue"}
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => void requestOtp()}
                className="w-full text-center text-sm font-semibold text-[#570080] hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            </form>
          ) : null}
      </div>
    </SeniorsAuthShell>
  );

  if (presentation === "page") return shell;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8">
      <style>{`@keyframes seniorsAuthIn{from{opacity:0;transform:translateY(14px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#fff9f2_50%,#ffe8f0_100%)]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-4xl"
        style={{ animation: "seniorsAuthIn 0.22s ease-out" }}
      >
        {shell}
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2.5 text-sm text-[#B91C1C]">
      {message}
    </p>
  );
}

function PasswordField({
  value,
  onChange,
  show,
  onToggle,
  placeholder,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <div className="relative">
      <input
        required
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(INPUT, "pr-12")}
        autoComplete={autoComplete}
        minLength={6}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#94A3B8] hover:text-[#475569]"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SubmitBtn({
  loading,
  accent,
  disabled,
  label,
}: {
  loading: boolean;
  accent: string;
  disabled: boolean;
  label: string;
}) {
  const can = !disabled && !loading;
  return (
    <button
      type="submit"
      disabled={!can}
      className={cn(
        "mt-2 w-full rounded-lg py-3.5 text-sm font-bold text-white shadow-sm transition",
        can ? "hover:brightness-95 active:scale-[0.99]" : "cursor-not-allowed bg-[#E2E8F0] text-[#94A3B8] shadow-none",
      )}
      style={can ? { background: accent === SENIORS_AUTH_PRIMARY ? SENIORS_AUTH_GRADIENT : accent } : undefined}
    >
      {label}
    </button>
  );
}
