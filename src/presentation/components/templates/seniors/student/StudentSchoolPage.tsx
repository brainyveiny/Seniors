"use client";

import { useEffect } from "react";
import { Building2, Megaphone } from "lucide-react";
import { formatDate } from "@/shared/lib/format-date";
import {
  StudentEmptyState,
  StudentLiftCard,
  StudentPageHero,
  STUDENT_ACCENT,
  STUDENT_ACCENT_SOFT,
} from "@/presentation/components/templates/seniors/student/StudentPageChrome";
import { markStudentAnnouncementsSeen } from "@/presentation/components/templates/seniors/shared/useStudentAnnouncementUnreadCount";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";

const FEED_TINTS = [
  "bg-[#DBEAFE] text-[#2563EB]",
  "bg-[#FCE7F3] text-[#DB2777]",
  "bg-[#DCFCE7] text-[#16A34A]",
  "bg-[#FEF3C7] text-[#D97706]",
];

export type StudentAnnouncementItem = {
  id: string;
  title: string;
  body: string;
  publishedAt: Date | string;
  source?: "school" | "teacher";
  authorName?: string;
};

export function StudentSchoolPage({
  announcements,
}: {
  announcements: StudentAnnouncementItem[];
}) {
  const site = useSeniorsSite();

  useEffect(() => {
    if (!site.tenant || announcements.length === 0) return;
    markStudentAnnouncementsSeen(
      site.tenant,
      announcements.map((a) => a.id),
    );
  }, [site.tenant, announcements]);

  return (
    <div className="space-y-6">
      <StudentPageHero
        icon={Megaphone}
        title="Announcements"
        subtitle="Updates from your school office and teachers."
        meta={
          <span
            className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: STUDENT_ACCENT_SOFT, color: STUDENT_ACCENT }}
          >
            {announcements.length}{" "}
            {announcements.length === 1 ? "update" : "updates"}
          </span>
        }
      />

      {announcements.length === 0 ? (
        <StudentEmptyState
          title="No announcements yet"
          description="When your school or teachers post PTMs, holidays, or class updates, they will appear in this feed."
        />
      ) : (
        <ul className="space-y-2">
          {announcements.map((a, i) => {
            const fromSchool = a.source !== "teacher";
            return (
              <StudentLiftCard key={a.id} as="li" className="p-3" lift={false}>
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${FEED_TINTS[i % FEED_TINTS.length]}`}
                  >
                    {fromSchool ? (
                      <Building2 className="h-4 w-4" />
                    ) : (
                      <Megaphone className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-0.5">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-semibold leading-snug text-[#111827]">
                            {a.title}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                              fromSchool
                                ? "bg-[#EFF6FF] text-[#2563EB]"
                                : "bg-[#FDF2F8] text-[#DB2777]"
                            }`}
                          >
                            {fromSchool ? "School" : "Teacher"}
                          </span>
                        </div>
                        {a.authorName ? (
                          <p className="text-[11px] font-medium leading-tight text-[#9CA3AF]">
                            {a.authorName}
                          </p>
                        ) : null}
                      </div>
                      <time className="shrink-0 text-[11px] font-medium text-[#9CA3AF]">
                        {formatDate(a.publishedAt)}
                      </time>
                    </div>
                    {a.body ? (
                      <p className="mt-1 text-sm leading-snug text-[#4B5563]">{a.body}</p>
                    ) : null}
                  </div>
                </div>
              </StudentLiftCard>
            );
          })}
        </ul>
      )}
    </div>
  );
}
