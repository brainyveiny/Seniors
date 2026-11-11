"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import type { SeniorsSchoolDetail } from "@/application/seniors/seniors-product-admin";
import { seniorsProductAdminPath } from "@/shared/lib/seniors-platform-urls";
import { saRequest, schoolApi } from "./super-admin-api";
import {
  SA_BTN_DANGER,
  SA_BTN_PRIMARY,
  SA_INPUT,
  SA_LABEL,
  SaCard,
  SaNotice,
} from "./SuperAdminUi";

export function SuperAdminSchoolAccess({
  school,
  onSaved,
}: {
  school: SeniorsSchoolDetail;
  onSaved: (school: SeniorsSchoolDetail) => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [busy, setBusy] = useState<"status" | "delete" | null>(null);
  const [error, setError] = useState("");

  async function changeStatus(status: "active" | "suspended") {
    setBusy("status");
    setError("");
    try {
      const json = await saRequest<{ school: SeniorsSchoolDetail }>(schoolApi(school.id), {
        method: "PATCH",
        body: { status, suspendedReason: reason },
      });
      onSaved(json.school);
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function deleteSchool() {
    setBusy("delete");
    setError("");
    try {
      await saRequest(schoolApi(school.id), { method: "DELETE", body: { confirmCode } });
      router.push(seniorsProductAdminPath("schools"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {error ? <SaNotice tone="error">{error}</SaNotice> : null}

      <SaCard
        title={school.status === "suspended" ? "School is suspended" : "Suspend access"}
        description={
          school.status === "suspended"
            ? "Nobody from this school can sign in. Their data is kept safe."
            : "Temporarily block every login for this school (for example, for unpaid fees). Data is kept."
        }
      >
        {school.status === "suspended" ? (
          <div className="space-y-4">
            {school.suspendedReason ? (
              <SaNotice tone="info">Reason shown to users: {school.suspendedReason}</SaNotice>
            ) : null}
            <button
              type="button"
              className={SA_BTN_PRIMARY}
              disabled={busy !== null}
              onClick={() => void changeStatus("active")}
            >
              <ShieldCheck className="h-4 w-4" />
              {busy === "status" ? "Re-activating…" : "Re-activate school"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block">
              <span className={SA_LABEL}>Message shown on the school&apos;s pages (optional)</span>
              <input
                className={SA_INPUT}
                maxLength={300}
                placeholder="e.g. Subscription renewal pending"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <button
              type="button"
              className={SA_BTN_DANGER}
              disabled={busy !== null}
              onClick={() => {
                if (window.confirm(`Suspend ${school.branding.schoolName}? All users will be signed out of the panels.`)) {
                  void changeStatus("suspended");
                }
              }}
            >
              <ShieldOff className="h-4 w-4" />
              {busy === "status" ? "Suspending…" : "Suspend school"}
            </button>
          </div>
        )}
      </SaCard>

      <SaCard
        title="Delete school"
        description="Permanently deletes the school with all its users, classes, content, homework, results and fees. This cannot be undone."
        className="border-red-200"
      >
        <div className="space-y-3">
          <label className="block">
            <span className={SA_LABEL}>
              Type <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">{school.slug}</code> to confirm
            </span>
            <input
              className={SA_INPUT}
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            className={SA_BTN_DANGER}
            disabled={busy !== null || confirmCode.trim().toLowerCase() !== school.slug}
            onClick={() => void deleteSchool()}
          >
            <Trash2 className="h-4 w-4" />
            {busy === "delete" ? "Deleting…" : "Delete school permanently"}
          </button>
        </div>
      </SaCard>
    </div>
  );
}
