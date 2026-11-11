"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { enterSeniorsApp } from "@/application/services/seniors-session";
import {
  CheckCircle2,
  Clock3,
  LogOut,
  RefreshCw,
  School,
  XCircle,
} from "lucide-react";
import { SENIORS_PLATFORM_LOGIN_PATHS } from "@/shared/lib/seniors-platform-urls";

type JoinRequestStatus = {
  id: string;
  status: "pending" | "approved" | "rejected";
  role: "student" | "teacher";
  fullName: string;
  email: string;
  phone: string;
  requestedClassLabel: string;
  rollNumber: string;
  requestedSubject: string;
  rejectionReason: string;
  schoolName: string;
  schoolCode: string;
  reviewedAt: string | null;
  createdAt: string;
};

const ROLE_LABELS = {
  student: "Student",
  teacher: "Teacher",
} as const;

export function SeniorsRequestStatusClient() {
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");
  const [request, setRequest] = useState<JoinRequestStatus | null>(null);

  async function loadStatus() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/seniors/join-request-status");
      const json = (await res.json()) as {
        request?: JoinRequestStatus;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error || "Could not load request status");
      setRequest(json.request ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load request status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    if (!request || request.status !== "approved") return;
    let cancelled = false;
    void (async () => {
      setActivating(true);
      try {
        const res = await fetch("/api/auth/seniors/activate-approved", {
          method: "POST",
        });
        const json = (await res.json()) as { redirectTo?: string; error?: string };
        if (!res.ok) throw new Error(json.error || "Could not activate account");
        if (!cancelled && json.redirectTo) {
          enterSeniorsApp(json.redirectTo, {
            studentLoginBurst: request.role === "student",
          });
          return;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not activate account");
        }
      } finally {
        if (!cancelled) setActivating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [request]);

  const loginHref =
    request?.role === "student" || request?.role === "teacher"
      ? SENIORS_PLATFORM_LOGIN_PATHS[request.role]
      : "/seniors";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white px-6 py-8 text-center shadow-sm">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#2563EB]" />
          <p className="mt-3 text-sm text-[#6B7280]">Loading your request...</p>
        </div>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <div className="w-full max-w-lg rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <p className="text-sm text-[#B91C1C]">{error}</p>
          <Link
            href="/seniors"
            className="mt-4 inline-flex rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white"
          >
            Back to Seniors
          </Link>
        </div>
      </div>
    );
  }

  if (!request) return null;

  const statusConfig =
    request.status === "approved"
      ? {
          icon: CheckCircle2,
          title: "Request approved",
          message: activating
            ? "Your account is ready. Taking you to your portal..."
            : "Your school has approved your request.",
          tone: "text-[#16A34A]",
          bg: "bg-[#F0FDF4]",
          border: "border-[#BBF7D0]",
        }
      : request.status === "rejected"
        ? {
            icon: XCircle,
            title: "Request rejected",
            message:
              request.rejectionReason ||
              "The school could not approve your request right now.",
            tone: "text-[#B91C1C]",
            bg: "bg-[#FEF2F2]",
            border: "border-[#FECACA]",
          }
        : {
            icon: Clock3,
            title: "Request submitted",
            message:
              "Your request has been submitted to the school. You will get access after the school admin reviews and approves it.",
            tone: "text-[#2563EB]",
            bg: "bg-[#EFF6FF]",
            border: "border-[#BFDBFE]",
          };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-10">
      <div className="mx-auto w-full max-w-xl">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${statusConfig.bg} ${statusConfig.border} border`}
            >
              <StatusIcon className={`h-6 w-6 ${statusConfig.tone}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">
                {ROLE_LABELS[request.role]} application
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[#111827]">{statusConfig.title}</h1>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">{statusConfig.message}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#111827]">
                <School className="h-4 w-4 text-[#2563EB]" />
                {request.schoolName}
              </div>
              <p className="mt-1 text-xs text-[#9CA3AF]">School code: {request.schoolCode}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Name" value={request.fullName} />
              <Info label="Email" value={request.email} />
              <Info label="Role" value={ROLE_LABELS[request.role]} />
              {request.role === "student" ? (
                <>
                  <Info
                    label="Requested class"
                    value={request.requestedClassLabel || "Not specified"}
                  />
                  <Info label="Roll number" value={request.rollNumber || "—"} />
                </>
              ) : (
                <Info
                  label="Requested subject"
                  value={request.requestedSubject || "Not specified"}
                />
              )}
            </div>
          </div>

          {request.status === "pending" ? (
            <div className="mt-6 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm text-[#1D4ED8]">
              School data, classes, assignments, and quizzes will appear only after approval.
            </div>
          ) : null}

          {request.status === "rejected" ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={`/seniors/for/${request.role}?school=${encodeURIComponent(request.schoolCode)}`}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
              >
                <RefreshCw className="h-4 w-4" />
                Submit again
              </Link>
              <Link
                href={loginHref}
                className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB]"
              >
                Go to login
              </Link>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-between border-t border-[#E5E7EB] pt-4">
            <button
              type="button"
              onClick={() => void loadStatus()}
              className="inline-flex items-center gap-2 text-sm font-medium text-[#2563EB] hover:underline"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh status
            </button>
            <Link
              href="/seniors"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#6B7280] hover:text-[#111827]"
            >
              <LogOut className="h-4 w-4" />
              Back to Seniors
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-medium text-[#1F2937]">{value}</p>
    </div>
  );
}
