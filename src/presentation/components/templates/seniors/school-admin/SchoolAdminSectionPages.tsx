"use client";

import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  GraduationCap,
  ImagePlus,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { useSeniorsSite } from "@/presentation/components/website/TenantSiteShell";
import {
  SeniorsCard,
  SeniorsEmptyState,
} from "@/presentation/components/templates/seniors/shared/SeniorsUi";
import { formatDateTime } from "@/shared/lib/format-date";
import { notifySeniorsEnquiriesChanged } from "@/presentation/components/templates/seniors/shared/useSchoolAdminEnquiryCount";
import {
  announcementAudienceLabel,
  asIdList,
} from "@/infrastructure/seniors/seniors-announcement-audience";
import { loadSeniorsCachedJson } from "@/presentation/components/templates/seniors/shared/useSeniorsCachedJson";
import { SchoolAdminTimetablePanel } from "@/presentation/components/templates/seniors/school-admin/SchoolAdminTimetablePanel";
import type { TimetableAdminData } from "@/presentation/components/templates/seniors/school-admin/SchoolAdminTimetablePanel";
import {
  SchoolAdminAttendancePanel,
  type AttendanceAdminData,
} from "@/presentation/components/templates/seniors/school-admin/SchoolAdminAttendancePanel";
import {
  SchoolAdminClassworkPanel,
  type ClassworkAdminData,
} from "@/presentation/components/templates/seniors/school-admin/SchoolAdminClassworkPanel";
import {
  SchoolAdminParentServicesPanel,
  type ParentServicesAdminData,
} from "@/presentation/components/templates/seniors/school-admin/SchoolAdminParentServicesPanel";
import { ACADEMY_IMAGE_ACCEPT } from "@/shared/lib/academy-image-limits";

const INPUT =
  "w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:outline-none";
const LABEL = "mb-1 block text-xs font-medium text-[#6B7280]";
const BTN_PRIMARY =
  "rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60";
const BTN_GHOST =
  "inline-flex items-center gap-1 rounded-lg border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-medium text-[#374151] hover:bg-[#F9FAFB] disabled:opacity-60";
const BTN_DANGER =
  "inline-flex items-center gap-1 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-1.5 text-xs font-medium text-[#B91C1C] hover:bg-[#FEE2E2] disabled:opacity-60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      {children}
    </label>
  );
}

function schoolSubjectCatalog(
  classes: { subjects: { name: string }[] }[],
  excludeNames: string[] = [],
) {
  const blocked = new Set(excludeNames.map((n) => n.trim().toLowerCase()).filter(Boolean));
  const seen = new Map<string, string>();
  for (const klass of classes) {
    for (const subject of klass.subjects) {
      const key = subject.name.trim().toLowerCase();
      if (!key || blocked.has(key) || seen.has(key)) continue;
      seen.set(key, subject.name.trim());
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function parseNewSubjectNames(value: string) {
  return value
    .split(/[,|\n]/)
    .map((n) => n.trim())
    .filter(Boolean);
}

function collectSubjectNames(selected: string[], custom: string) {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const name of [...selected, ...parseNewSubjectNames(custom)]) {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(name.trim());
  }
  return names;
}

function SubjectField({
  catalog,
  selected,
  onChange,
  custom,
  onCustom,
}: {
  catalog: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  custom: string;
  onCustom: (value: string) => void;
}) {
  const allSelected = catalog.length > 0 && selected.length === catalog.length;

  function toggle(name: string) {
    onChange(
      selected.some((s) => s.toLowerCase() === name.toLowerCase())
        ? selected.filter((s) => s.toLowerCase() !== name.toLowerCase())
        : [...selected, name],
    );
  }

  return (
    <div className="space-y-3">
      {catalog.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className={LABEL}>Subjects</span>
            <button
              type="button"
              className="text-xs font-semibold text-[#2563EB] hover:underline"
              onClick={() => onChange(allSelected ? [] : [...catalog])}
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>
          <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-2.5">
            {catalog.map((name) => {
              const checked = selected.some((s) => s.toLowerCase() === name.toLowerCase());
              return (
                <label
                  key={name}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#1F2937] hover:bg-white"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                    checked={checked}
                    onChange={() => toggle(name)}
                  />
                  {name}
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
      <Field label={catalog.length > 0 ? "New subjects (optional)" : "Subject names"}>
        <input
          className={INPUT}
          value={custom}
          onChange={(e) => onCustom(e.target.value)}
          placeholder="e.g. Mathematics, Science"
        />
        <p className="mt-1 text-xs text-[#9CA3AF]">Comma se multiple names likh sakte ho.</p>
      </Field>
    </div>
  );
}

function CenterModal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={
          wide
            ? "relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-2xl sm:p-6"
            : "relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-2xl"
        }
        style={{
          backgroundColor: "var(--sp-surface, #ffffff)",
          borderColor: "var(--sp-border, #E5E7EB)",
          color: "var(--sp-text, #1F2937)",
        }}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#111827]">{title}</h3>
            {subtitle ? (
              <p className="mt-1 text-sm text-[#6B7280]">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-[#6B7280] transition hover:bg-[#F3F4F6]"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RowActions({
  onEdit,
  onDelete,
  busy,
}: {
  onEdit: () => void;
  onDelete: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" className={BTN_GHOST} onClick={onEdit} disabled={busy}>
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </button>
      <button type="button" className={BTN_DANGER} onClick={onDelete} disabled={busy}>
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
    </div>
  );
}

async function adminPost(tenant: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/tenants/${tenant}/seniors/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

type TeacherAssignment = {
  classId: string;
  className: string;
  section: string;
  subjectId: string;
  subjectName: string;
};

type TeachersData = {
  section: "teachers";
  teachers: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    joinedAt: Date | string;
    lastLoginAt: Date | string | null;
    assignments: TeacherAssignment[];
  }[];
  classes: { id: string; name: string; section: string }[];
  subjects: { id: string; name: string; classId: string }[];
};

type StudentsData = {
  section: "students";
  students: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    rollNumber: string;
    classId: string;
    className: string;
    sectionName: string;
  }[];
  classes: { id: string; name: string; section: string }[];
};

type ParentsData = {
  section: "parents";
  parents: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    children: { id: string; name: string }[];
  }[];
  students: { id: string; fullName: string; email: string; classLabel?: string }[];
};

type ClassesData = {
  section: "classes";
  classes: {
    id: string;
    name: string;
    section: string;
    board: string;
    sortOrder: number;
    studentCount: number;
    subjectCount: number;
    subjects: { id: string; name: string }[];
  }[];
};

type ContentData = {
  section: "content";
  classes?: { id: string; name: string; section: string }[];
  teachers?: {
    id: string;
    fullName: string;
    classIds: string[];
    subjectIds: string[];
  }[];
  topics: {
    id: string;
    title: string;
    number: string;
    contentStatus: string;
    subjectName: string;
    chapterName: string;
    classId?: string;
    classLabel?: string;
    subjectId?: string;
    assignedTeacherIds?: string[];
    assignedTeacherNames?: string[];
    lastById?: string | null;
    lastByName?: string;
    pieceCount?: number;
  }[];
};

type SettingsData = {
  section: "settings";
  settings: {
    schoolName: string;
    logoUrl?: string;
    primaryColor: string;
    markingScheme: string;
    answerFormat: string;
  };
};

type AnnouncementsData = {
  section: "announcements";
  announcements: {
    id: string;
    title: string;
    body: string;
    publishedAt: Date | string;
    createdByName: string;
    audienceType?: string;
    audienceRoles?: unknown;
    targetClassIds?: unknown;
    targetUserIds?: unknown;
  }[];
  classes?: { id: string; name: string; section: string }[];
  students?: { id: string; fullName: string; classLabel?: string }[];
  teachers?: { id: string; fullName: string }[];
  parents?: { id: string; fullName: string }[];
};

type ExamsData = {
  section: "exams";
  exams: {
    id: string;
    title: string;
    subjectName: string;
    examAt: Date | string;
    targetClassId: string | null;
    classLabel: string;
  }[];
  classes: { id: string; name: string; section: string }[];
  subjects: { id: string; name: string; classId: string }[];
};

type EnquiriesData = {
  section: "enquiries";
  enquiries: {
    id: string;
    role: string;
    fullName: string;
    email: string;
    phone: string;
    requestedClassLabel: string;
    rollNumber: string;
    requestedSubject: string;
    status: string;
    rejectionReason: string;
    reviewedAt: Date | string | null;
    createdAt: Date | string;
  }[];
  classes: { id: string; name: string; section: string }[];
  subjects: { id: string; name: string; classId: string }[];
};

export type SchoolAdminSectionData =
  | TeachersData
  | StudentsData
  | EnquiriesData
  | ParentsData
  | ClassesData
  | ContentData
  | ExamsData
  | SettingsData
  | AnnouncementsData
  | TimetableAdminData
  | AttendanceAdminData
  | ClassworkAdminData
  | ParentServicesAdminData;

export function SchoolAdminSectionPages({ data }: { data: SchoolAdminSectionData }) {
  return (
    <>
      {data.section === "teachers" ? <TeachersPanel data={data} /> : null}
      {data.section === "students" ? <StudentsPanel data={data} /> : null}
      {data.section === "attendance" ? <SchoolAdminAttendancePanel data={data} /> : null}
      {data.section === "classwork" ? <SchoolAdminClassworkPanel data={data} /> : null}
      {data.section === "parent-services" ? <SchoolAdminParentServicesPanel data={data} /> : null}
      {data.section === "enquiries" ? <EnquiriesPanel data={data} /> : null}
      {data.section === "parents" ? <ParentsPanel data={data} /> : null}
      {data.section === "classes" ? <ClassesPanel data={data} /> : null}
      {data.section === "content" ? <ContentPanel data={data} /> : null}
      {data.section === "exams" ? <ExamsPanel data={data} /> : null}
      {data.section === "timetable" ? <SchoolAdminTimetablePanel data={data} /> : null}
      {data.section === "settings" ? <SettingsPanel data={data} /> : null}
      {data.section === "announcements" ? <AnnouncementsPanel data={data} /> : null}
    </>
  );
}

function TeacherAssignmentBadges({
  assignments,
}: {
  assignments: TeacherAssignment[];
}) {
  if (assignments.length === 0) {
    return <span className="text-sm font-medium text-[#DC2626]">Unassigned</span>;
  }

  const groups = new Map<string, { label: string; subjects: string[] }>();
  for (const item of assignments) {
    const key = item.classId || `${item.className}-${item.section}`;
    const label = `${item.className} ${item.section}`.trim() || "Class";
    const group = groups.get(key) ?? { label, subjects: [] };
    if (item.subjectName && !group.subjects.includes(item.subjectName)) {
      group.subjects.push(item.subjectName);
    }
    groups.set(key, group);
  }

  return (
    <div className="space-y-2">
      {[...groups.entries()].map(([key, group]) => (
        <div key={key} className="min-w-[12rem]">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280]">
            {group.label}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {group.subjects.map((subject) => (
              <span
                key={`${key}-${subject}`}
                className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs font-medium text-[#1D4ED8]"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AssignmentPicker({
  classes,
  subjects,
  value,
  onChange,
}: {
  classes: { id: string; name: string; section: string }[];
  subjects: { id: string; name: string; classId: string }[];
  value: { classId: string; subjectId: string }[];
  onChange: (next: { classId: string; subjectId: string }[]) => void;
}) {
  function isChecked(classId: string, subjectId: string) {
    return value.some((row) => row.classId === classId && row.subjectId === subjectId);
  }

  function toggle(classId: string, subjectId: string) {
    if (isChecked(classId, subjectId)) {
      onChange(value.filter((row) => !(row.classId === classId && row.subjectId === subjectId)));
      return;
    }
    onChange([...value, { classId, subjectId }]);
  }

  function toggleClass(classId: string, classSubjects: { id: string }[]) {
    const allOn = classSubjects.every((s) => isChecked(classId, s.id));
    if (allOn) {
      onChange(value.filter((row) => row.classId !== classId));
      return;
    }
    const next = value.filter((row) => row.classId !== classId);
    onChange([...next, ...classSubjects.map((s) => ({ classId, subjectId: s.id }))]);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[#DBEAFE] bg-[#F8FAFF] p-4">
      <div>
        <p className="text-sm font-bold text-[#111827]">2. What will they teach?</p>
        <p className="mt-1 text-xs text-[#6B7280]">
          Tick every class and subject this teacher handles.
        </p>
      </div>

      {classes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#CBD5E1] bg-white px-3 py-2 text-xs text-[#64748B]">
          No classes yet -add a class first.
        </p>
      ) : (
        <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
          {classes.map((klass) => {
            const classSubjects = subjects.filter((s) => s.classId === klass.id);
            const selectedCount = classSubjects.filter((s) => isChecked(klass.id, s.id)).length;
            const allOn = classSubjects.length > 0 && selectedCount === classSubjects.length;
            return (
              <div
                key={klass.id}
                className="rounded-xl border border-[#E0E7FF] bg-white p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#111827]">
                    {klass.name} {klass.section}
                    {selectedCount > 0 ? (
                      <span className="ml-2 text-xs font-medium text-[#2563EB]">
                        {selectedCount} selected
                      </span>
                    ) : null}
                  </p>
                  {classSubjects.length > 0 ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-[#2563EB] hover:underline"
                      onClick={() => toggleClass(klass.id, classSubjects)}
                    >
                      {allOn ? "Clear" : "Select all"}
                    </button>
                  ) : null}
                </div>
                {classSubjects.length === 0 ? (
                  <p className="text-xs text-[#9CA3AF]">No subjects in this class yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {classSubjects.map((subject) => {
                      const checked = isChecked(klass.id, subject.id);
                      return (
                        <label
                          key={subject.id}
                          className={
                            checked
                              ? "inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#2563EB] px-3 py-1.5 text-xs font-semibold text-white"
                              : "inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-xs font-medium text-[#374151] hover:border-[#2563EB]"
                          }
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => toggle(klass.id, subject.id)}
                          />
                          {subject.name}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeachersPanel({ data }: { data: TeachersData }) {
  const ctx = useSeniorsSite();
  const [teachers, setTeachers] = useState(
    data.teachers.map((t) => ({ ...t, assignments: t.assignments ?? [] })),
  );
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "demo1234",
    phone: "",
  });
  const [formAssignments, setFormAssignments] = useState<{ classId: string; subjectId: string }[]>([]);
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
  });
  const [editAssignments, setEditAssignments] = useState<{ classId: string; subjectId: string }[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportText, setBulkImportText] = useState(
    "fullName,email,phone\nPriya Sharma,priya@example.com,9876543210",
  );
  const [importClassId, setImportClassId] = useState("");
  const [importSubjectId, setImportSubjectId] = useState("");
  const [bulkClassId, setBulkClassId] = useState(data.classes[0]?.id ?? "");
  const [bulkSubjectId, setBulkSubjectId] = useState(
    data.subjects.find((s) => s.classId === data.classes[0]?.id)?.id ?? "",
  );

  const allSelected = teachers.length > 0 && selectedIds.length === teachers.length;
  const bulkClassSubjects = data.subjects.filter((s) => s.classId === bulkClassId);
  const importClassSubjects = data.subjects.filter((s) => s.classId === importClassId);

  function mapAssignments(
    rows: { classId: string; subjectId: string }[],
  ): TeacherAssignment[] {
    return rows.map((row) => {
      const cls = data.classes.find((c) => c.id === row.classId);
      const sub = data.subjects.find((s) => s.id === row.subjectId);
      return {
        classId: row.classId,
        className: cls?.name ?? "",
        section: cls?.section ?? "",
        subjectId: row.subjectId,
        subjectName: sub?.name ?? "",
      };
    });
  }

  function startEdit(teacher: TeachersData["teachers"][number]) {
    setShowForm(false);
    setShowBulkImport(false);
    setEditingId(teacher.id);
    setEditForm({
      fullName: teacher.fullName,
      email: teacher.email,
      password: "",
      phone: teacher.phone,
    });
    setEditAssignments(
      (teacher.assignments ?? []).map((a) => ({
        classId: a.classId,
        subjectId: a.subjectId,
      })),
    );
    setError("");
  }

  async function createTeacher(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "create-user",
        userType: "teacher",
        ...form,
        assignments: formAssignments,
      });
      setTeachers((prev) => [
        {
          id: json.user.id,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          joinedAt: new Date().toISOString(),
          lastLoginAt: null,
          assignments: json.user.assignments ?? mapAssignments(formAssignments),
        },
        ...prev,
      ]);
      setShowForm(false);
      setForm({ fullName: "", email: "", password: "demo1234", phone: "" });
      setFormAssignments([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function bulkImportTeachers(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const lines = bulkImportText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const start = lines[0]?.toLowerCase().includes("email") ? 1 : 0;
      const rows = lines
        .slice(start)
        .map((line) => {
          const [fullName, email, phone] = line.split(",").map((p) => p.trim());
          return {
            fullName: fullName || "",
            email: email || "",
            phone: phone || "",
            password: "demo1234",
          };
        })
        .filter((r) => r.fullName && r.email);

      if (rows.length === 0) throw new Error("No valid rows found");

      const json = await adminPost(ctx.tenant, {
        action: "bulk-create-teachers",
        teachers: rows,
        classId: importClassId || undefined,
        subjectId: importSubjectId || undefined,
      });
      const created = (json.results || []).filter((r: { ok: boolean }) => r.ok);
      const assignments =
        importClassId && importSubjectId
          ? mapAssignments([{ classId: importClassId, subjectId: importSubjectId }])
          : [];
      setTeachers((prev) => [
        ...created.map((r: { id: string; email: string }) => {
          const row = rows.find((x) => x.email.toLowerCase() === r.email.toLowerCase());
          return {
            id: r.id,
            fullName: row?.fullName ?? r.email,
            email: r.email,
            phone: row?.phone ?? "",
            joinedAt: new Date().toISOString(),
            lastLoginAt: null,
            assignments,
          };
        }),
        ...prev.filter((t) => !created.some((r: { id: string }) => r.id === t.id)),
      ]);
      setShowBulkImport(false);
      if (json.failed > 0) {
        setError(`Created ${json.created}, failed ${json.failed}`);
      } else {
        setMessage(
          `${json.created} teacher${json.created === 1 ? "" : "s"} imported`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateTeacher(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "update-user",
        userId: editingId,
        ...editForm,
        assignments: editAssignments,
      });
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                fullName: json.user.fullName,
                email: json.user.email,
                phone: json.user.phone,
                assignments: json.user.assignments ?? mapAssignments(editAssignments),
              }
            : t,
        ),
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTeacher(id: string, name: string) {
    if (!window.confirm(`Delete teacher "${name}"? This cannot be undone.`)) return;
    setSaving(true);
    setError("");
    try {
      await adminPost(ctx.tenant, { action: "delete-user", userId: id });
      setTeachers((prev) => prev.filter((t) => t.id !== id));
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  function toggleAllTeachers() {
    setSelectedIds(allSelected ? [] : teachers.map((t) => t.id));
  }

  function toggleTeacher(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function bulkDeleteTeachers() {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected teacher${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "bulk-delete-users",
        userType: "teacher",
        userIds: selectedIds,
      });
      const deleted = (json.deleted as string[] | undefined) ?? [];
      const skipped = (json.skipped as { id: string; reason: string }[] | undefined) ?? [];
      setTeachers((prev) => prev.filter((t) => !deleted.includes(t.id)));
      setSelectedIds((prev) => prev.filter((id) => !deleted.includes(id)));
      if (editingId && deleted.includes(editingId)) setEditingId(null);
      if (skipped.length > 0) {
        setError(`${deleted.length} deleted. ${skipped.length} skipped.`);
      } else {
        setMessage(
          `${deleted.length} teacher${deleted.length === 1 ? "" : "s"} deleted`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function bulkAssignTeachers(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0 || !bulkClassId || !bulkSubjectId) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "bulk-add-teacher-assignment",
        userIds: selectedIds,
        classId: bulkClassId,
        subjectId: bulkSubjectId,
      });
      const added =
        (json.added as {
          teacherId: string;
          classId: string;
          className: string;
          section: string;
          subjectId: string;
          subjectName: string;
        }[] | undefined) ?? [];
      const skipped = (json.skipped as { id: string; reason: string }[] | undefined) ?? [];
      setTeachers((prev) =>
        prev.map((t) => {
          const extra = added.filter((a) => a.teacherId === t.id);
          if (extra.length === 0) return t;
          return {
            ...t,
            assignments: [
              ...(t.assignments ?? []),
              ...extra.map((a) => ({
                classId: a.classId,
                className: a.className,
                section: a.section,
                subjectId: a.subjectId,
                subjectName: a.subjectName,
              })),
            ],
          };
        }),
      );
      setShowBulkAssign(false);
      if (skipped.length > 0 && added.length === 0) {
        setError("Already assigned to selected teachers.");
      } else if (skipped.length > 0) {
        setMessage(`${added.length} assigned. ${skipped.length} already had this class/subject.`);
      } else {
        setMessage(
          `Assigned to ${added.length} teacher${added.length === 1 ? "" : "s"}`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[#374151]">
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              className={BTN_GHOST}
              disabled={saving}
              onClick={() => {
                setShowBulkAssign(true);
                setError("");
              }}
            >
              Assign class
            </button>
            <button
              type="button"
              className={BTN_DANGER}
              disabled={saving}
              onClick={() => void bulkDeleteTeachers()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <button
              type="button"
              className="text-xs font-medium text-[#6B7280] hover:text-[#111827]"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </button>
          </div>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className={BTN_GHOST}
            onClick={() => {
              setShowBulkImport(true);
              setShowForm(false);
              setEditingId(null);
              setShowBulkAssign(false);
              setError("");
            }}
          >
            Bulk import
          </button>
          <button
            type="button"
            className={BTN_PRIMARY}
            onClick={() => {
              setShowForm(true);
              setShowBulkImport(false);
              setEditingId(null);
              setError("");
            }}
          >
            Add teacher
          </button>
        </div>
      </div>

      {showForm ? (
        <CenterModal
          wide
          title="Add teacher"
          subtitle="Fill teacher details, then assign which class & subject they will teach."
          onClose={() => {
            setShowForm(false);
            setError("");
          }}
        >
          <form onSubmit={createTeacher} className="space-y-4">
            <div>
              <p className="mb-3 text-sm font-bold text-[#111827]">1. Teacher login details</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name">
                  <input
                    className={INPUT}
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    required
                  />
                </Field>
                <Field label="Email (for login)">
                  <input
                    type="email"
                    className={INPUT}
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="teacher@school.com"
                    required
                  />
                </Field>
                <div>
                  <Field label="Password">
                    <input
                      className={INPUT}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      required
                    />
                  </Field>
                  <p className="mt-1 text-[11px] text-[#6B7280]">
                    Teacher will use email + this password to log in.
                  </p>
                </div>
                <Field label="Phone (optional)">
                  <input
                    className={INPUT}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="10-digit mobile"
                  />
                </Field>
              </div>
            </div>

            <AssignmentPicker
              classes={data.classes}
              subjects={data.subjects}
              value={formAssignments}
              onChange={setFormAssignments}
            />

            {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}

            <div className="flex justify-end gap-2 border-t border-[#E5E7EB] pt-4">
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving…" : "Create teacher"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {editingId ? (
        <CenterModal
          wide
          title="Edit teacher"
          subtitle="Update details or change class & subject assignments."
          onClose={() => {
            setEditingId(null);
            setError("");
          }}
        >
          <form onSubmit={updateTeacher} className="space-y-4">
            <div>
              <p className="mb-3 text-sm font-bold text-[#111827]">1. Teacher details</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name">
                  <input
                    className={INPUT}
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    required
                  />
                </Field>
                <Field label="Email (for login)">
                  <input
                    type="email"
                    className={INPUT}
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    required
                  />
                </Field>
                <div>
                  <Field label="New password (optional)">
                    <input
                      className={INPUT}
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      placeholder="Leave blank to keep current"
                    />
                  </Field>
                  <p className="mt-1 text-[11px] text-[#6B7280]">
                    Only fill if you want to change the password.
                  </p>
                </div>
                <Field label="Phone (optional)">
                  <input
                    className={INPUT}
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </Field>
              </div>
            </div>

            <AssignmentPicker
              classes={data.classes}
              subjects={data.subjects}
              value={editAssignments}
              onChange={setEditAssignments}
            />

            {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}

            <div className="flex justify-end gap-2 border-t border-[#E5E7EB] pt-4">
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() => {
                  setEditingId(null);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {showBulkAssign ? (
        <CenterModal
          title={`Assign class to ${selectedIds.length} teacher${selectedIds.length === 1 ? "" : "s"}`}
          onClose={() => setShowBulkAssign(false)}
        >
          <form onSubmit={bulkAssignTeachers} className="space-y-3">
            <Field label="Class">
              <select
                className={INPUT}
                value={bulkClassId}
                onChange={(e) => {
                  const nextClassId = e.target.value;
                  setBulkClassId(nextClassId);
                  setBulkSubjectId(
                    data.subjects.find((s) => s.classId === nextClassId)?.id ?? "",
                  );
                }}
                required
              >
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Subject">
              <select
                className={INPUT}
                value={bulkSubjectId}
                onChange={(e) => setBulkSubjectId(e.target.value)}
                required
              >
                {bulkClassSubjects.length === 0 ? (
                  <option value="">No subjects in this class</option>
                ) : (
                  bulkClassSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </Field>
            {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" className={BTN_GHOST} onClick={() => setShowBulkAssign(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving || !bulkSubjectId} className={BTN_PRIMARY}>
                {saving ? "Saving…" : "Assign"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {showBulkImport ? (
        <CenterModal
          title="Bulk import teachers"
          subtitle="Paste CSV rows: fullName, email, phone"
          onClose={() => {
            setShowBulkImport(false);
            setError("");
          }}
        >
          <form onSubmit={bulkImportTeachers} className="space-y-3">
            <Field label="Assign class (optional)">
              <select
                className={INPUT}
                value={importClassId}
                onChange={(e) => {
                  const nextClassId = e.target.value;
                  setImportClassId(nextClassId);
                  setImportSubjectId(
                    data.subjects.find((s) => s.classId === nextClassId)?.id ?? "",
                  );
                }}
              >
                <option value="">Skip -assign later</option>
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section}
                  </option>
                ))}
              </select>
            </Field>
            {importClassId ? (
              <Field label="Subject">
                <select
                  className={INPUT}
                  value={importSubjectId}
                  onChange={(e) => setImportSubjectId(e.target.value)}
                >
                  {importClassSubjects.length === 0 ? (
                    <option value="">No subjects in this class</option>
                  ) : (
                    importClassSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
              </Field>
            ) : null}
            <Field label="CSV rows (fullName,email,phone)">
              <textarea
                className={INPUT}
                rows={6}
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
              />
            </Field>
            {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() => {
                  setShowBulkImport(false);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Importing…" : "Import teachers"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {message ? <p className="text-sm text-[#16A34A]">{message}</p> : null}
      {error && !showForm && !editingId && !showBulkAssign && !showBulkImport ? (
        <p className="text-sm text-[#DC2626]">{error}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                  checked={allSelected}
                  onChange={toggleAllTeachers}
                  aria-label="Select all teachers"
                />
              </th>
              <th className="px-4 py-3">Teacher</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map((t) => (
              <tr
                key={t.id}
                className={
                  selectedIds.includes(t.id)
                    ? "border-t border-[#E5E7EB] bg-[#EFF6FF]/50"
                    : "border-t border-[#E5E7EB]"
                }
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                    checked={selectedIds.includes(t.id)}
                    onChange={() => toggleTeacher(t.id)}
                    aria-label={`Select ${t.fullName}`}
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{t.fullName}</p>
                  <p className="text-xs text-[#6B7280]">{t.email}</p>
                </td>
                <td className="px-4 py-3 text-[#4B5563]">
                  <TeacherAssignmentBadges assignments={t.assignments ?? []} />
                </td>
                <td className="px-4 py-3 text-[#4B5563]">{t.phone || "—"}</td>
                <td className="px-4 py-3">
                  <RowActions
                    busy={saving}
                    onEdit={() => startEdit(t)}
                    onDelete={() => deleteTeacher(t.id, t.fullName)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StudentsPanel({ data }: { data: StudentsData }) {
  const ctx = useSeniorsSite();
  const [students, setStudents] = useState(data.students);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bulkText, setBulkText] = useState(
    "fullName,email,rollNumber\nAarav Shah,aarav@example.com,1",
  );
  const [bulkClassId, setBulkClassId] = useState(data.classes[0]?.id ?? "");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "demo1234",
    phone: "",
    classId: data.classes[0]?.id ?? "",
    rollNumber: "",
  });
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    classId: "",
    rollNumber: "",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [showMoveClass, setShowMoveClass] = useState(false);
  const [moveClassId, setMoveClassId] = useState(data.classes[0]?.id ?? "");
  const allSelected = students.length > 0 && selectedIds.length === students.length;

  function startEdit(student: StudentsData["students"][number]) {
    setShowForm(false);
    setShowBulk(false);
    setEditingId(student.id);
    setEditForm({
      fullName: student.fullName,
      email: student.email,
      password: "",
      phone: student.phone,
      classId: student.classId || data.classes[0]?.id || "",
      rollNumber: student.rollNumber,
    });
    setError("");
  }

  async function createStudent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "create-user",
        userType: "student",
        ...form,
      });
      const cls = data.classes.find((c) => c.id === form.classId);
      setStudents((prev) => [
        {
          id: json.user.id,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          rollNumber: form.rollNumber,
          classId: form.classId,
          className: cls?.name ?? "",
          sectionName: cls?.section ?? "",
        },
        ...prev,
      ]);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function bulkImport(e: React.FormEvent) {
    e.preventDefault();
    if (!bulkClassId) {
      setError("Select a class for bulk import");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const lines = bulkText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const start = lines[0]?.toLowerCase().includes("email") ? 1 : 0;
      const rows = lines.slice(start).map((line) => {
        const [fullName, email, rollNumber] = line.split(",").map((p) => p.trim());
        return {
          fullName: fullName || "",
          email: email || "",
          rollNumber: rollNumber || "",
          classId: bulkClassId,
          password: "demo1234",
        };
      }).filter((r) => r.fullName && r.email);

      if (rows.length === 0) throw new Error("No valid rows found");

      const json = await adminPost(ctx.tenant, {
        action: "bulk-create-students",
        students: rows,
      });
      const cls = data.classes.find((c) => c.id === bulkClassId);
      const created = (json.results || []).filter((r: { ok: boolean }) => r.ok);
      setStudents((prev) => [
        ...created.map((r: { id: string; email: string }, i: number) => ({
          id: r.id,
          fullName: rows[i]?.fullName ?? r.email,
          email: r.email,
          phone: "",
          rollNumber: rows[i]?.rollNumber ?? "",
          classId: bulkClassId,
          className: cls?.name ?? "",
          sectionName: cls?.section ?? "",
        })),
        ...prev,
      ]);
      setShowBulk(false);
      if (json.failed > 0) {
        setError(`Created ${json.created}, failed ${json.failed}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "update-user",
        userId: editingId,
        ...editForm,
      });
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? {
                ...s,
                fullName: json.user.fullName,
                email: json.user.email,
                phone: json.user.phone,
                rollNumber: json.user.rollNumber,
                classId: json.user.classId,
                className: json.user.className,
                sectionName: json.user.sectionName,
              }
            : s,
        ),
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStudent(id: string, name: string) {
    if (!window.confirm(`Delete student "${name}"? This cannot be undone.`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await adminPost(ctx.tenant, { action: "delete-user", userId: id });
      setStudents((prev) => prev.filter((s) => s.id !== id));
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  function toggleAllStudents() {
    setSelectedIds(allSelected ? [] : students.map((s) => s.id));
  }

  function toggleStudent(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function bulkDeleteStudents() {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected student${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "bulk-delete-users",
        userType: "student",
        userIds: selectedIds,
      });
      const deleted = (json.deleted as string[] | undefined) ?? [];
      const skipped = (json.skipped as { id: string; reason: string }[] | undefined) ?? [];
      setStudents((prev) => prev.filter((s) => !deleted.includes(s.id)));
      setSelectedIds((prev) => prev.filter((id) => !deleted.includes(id)));
      if (editingId && deleted.includes(editingId)) setEditingId(null);
      if (skipped.length > 0) {
        setError(`${deleted.length} deleted. ${skipped.length} skipped.`);
      } else {
        setMessage(
          `${deleted.length} student${deleted.length === 1 ? "" : "s"} deleted`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function bulkMoveStudents(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0 || !moveClassId) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "bulk-move-students",
        userIds: selectedIds,
        classId: moveClassId,
      });
      const moved = (json.moved as string[] | undefined) ?? [];
      const skipped = (json.skipped as { id: string; reason: string }[] | undefined) ?? [];
      const klass = json.class as { id: string; name: string; section: string } | undefined;
      setStudents((prev) =>
        prev.map((s) =>
          moved.includes(s.id) && klass
            ? {
                ...s,
                classId: klass.id,
                className: klass.name,
                sectionName: klass.section,
              }
            : s,
        ),
      );
      setShowMoveClass(false);
      if (skipped.length > 0) {
        setError(`${moved.length} moved. ${skipped.length} skipped.`);
      } else {
        setMessage(
          `${moved.length} student${moved.length === 1 ? "" : "s"} moved to ${klass?.name ?? ""} ${klass?.section ?? ""}`.trim(),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[#374151]">
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              className={BTN_GHOST}
              disabled={saving || data.classes.length === 0}
              onClick={() => {
                setShowMoveClass(true);
                setError("");
              }}
            >
              Change class
            </button>
            <button
              type="button"
              className={BTN_DANGER}
              disabled={saving}
              onClick={() => void bulkDeleteStudents()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <button
              type="button"
              className="text-xs font-medium text-[#6B7280] hover:text-[#111827]"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </button>
          </div>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className={BTN_GHOST}
            onClick={() => {
              setShowBulk(true);
              setShowForm(false);
              setEditingId(null);
              setShowMoveClass(false);
              setError("");
            }}
          >
            Bulk import
          </button>
          <button
            type="button"
            className={BTN_PRIMARY}
            onClick={() => {
              setShowForm(true);
              setShowBulk(false);
              setEditingId(null);
              setShowMoveClass(false);
              setError("");
            }}
          >
            Add student
          </button>
        </div>
      </div>

      {message ? <p className="text-sm text-[#16A34A]">{message}</p> : null}
      {error && !showBulk && !showForm && !editingId && !showMoveClass ? (
        <p className="text-sm text-[#DC2626]">{error}</p>
      ) : null}

      {showBulk ? (
        <CenterModal
          title="Bulk import students"
          subtitle="Paste CSV rows: fullName, email, rollNumber"
          onClose={() => {
            setShowBulk(false);
            setError("");
          }}
        >
          <form onSubmit={bulkImport} className="space-y-3">
            <Field label="Target class">
              <select className={INPUT} value={bulkClassId} onChange={(e) => setBulkClassId(e.target.value)} required>
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="CSV rows (fullName,email,rollNumber)">
              <textarea
                className={INPUT}
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
            </Field>
            {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() => {
                  setShowBulk(false);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Importing…" : "Import students"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {showForm ? (
        <CenterModal
          title="Add student"
          subtitle="Create a student login and add them to a class."
          onClose={() => {
            setShowForm(false);
            setError("");
          }}
        >
          <form onSubmit={createStudent} className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <input className={INPUT} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </Field>
            <Field label="Email">
              <input type="email" className={INPUT} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </Field>
            <Field label="Password">
              <input className={INPUT} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </Field>
            <Field label="Class">
              <select className={INPUT} value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} required>
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Roll number">
              <input className={INPUT} value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className={INPUT} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            {error ? <p className="sm:col-span-2 text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving…" : "Create student"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {showMoveClass ? (
        <CenterModal
          title={`Change class for ${selectedIds.length} student${selectedIds.length === 1 ? "" : "s"}`}
          onClose={() => {
            setShowMoveClass(false);
            setError("");
          }}
        >
          <form onSubmit={bulkMoveStudents} className="space-y-3">
            <Field label="New class">
              <select
                className={INPUT}
                value={moveClassId}
                onChange={(e) => setMoveClassId(e.target.value)}
                required
              >
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section}
                  </option>
                ))}
              </select>
            </Field>
            {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() => {
                  setShowMoveClass(false);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving || !moveClassId} className={BTN_PRIMARY}>
                {saving ? "Saving…" : "Move students"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {editingId ? (
        <CenterModal
          title="Edit student"
          onClose={() => {
            setEditingId(null);
            setError("");
          }}
        >
          <form onSubmit={updateStudent} className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <input className={INPUT} value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} required />
            </Field>
            <Field label="Email">
              <input type="email" className={INPUT} value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required />
            </Field>
            <Field label="New password (optional)">
              <input className={INPUT} value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Leave blank to keep current" />
            </Field>
            <Field label="Class">
              <select className={INPUT} value={editForm.classId} onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })} required>
                {data.classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Roll number">
              <input className={INPUT} value={editForm.rollNumber} onChange={(e) => setEditForm({ ...editForm, rollNumber: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className={INPUT} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </Field>
            {error ? <p className="sm:col-span-2 text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className={BTN_GHOST} onClick={() => setEditingId(null)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}
      {students.length === 0 ? (
        <SeniorsEmptyState title="No students" description="Add students to a class roster." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                    checked={allSelected}
                    onChange={toggleAllStudents}
                    aria-label="Select all students"
                  />
                </th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Roll</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr
                  key={s.id}
                  className={`border-t border-[#E5E7EB] ${
                    selectedIds.includes(s.id) ? "bg-[#EFF6FF]" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                      checked={selectedIds.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      aria-label={`Select ${s.fullName}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{s.fullName}</p>
                    <p className="text-xs text-[#6B7280]">{s.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {s.classId ? (
                      <>
                        {s.className} {s.sectionName}
                      </>
                    ) : (
                      <span className="text-[#DC2626]">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{s.rollNumber || "—"}</td>
                  <td className="px-4 py-3">
                    <RowActions
                      busy={saving}
                      onEdit={() => startEdit(s)}
                      onDelete={() => deleteStudent(s.id, s.fullName)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function studentPickerLabel(student: {
  fullName: string;
  email: string;
  classLabel?: string;
}) {
  return student.classLabel
    ? `${student.fullName} · ${student.classLabel}`
    : student.fullName;
}

function ChildPicker({
  students,
  selectedIds,
  onChange,
}: {
  students: ParentsData["students"];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  }

  if (students.length === 0) {
    return <p className="text-sm text-[#6B7280]">No students in this school yet.</p>;
  }

  return (
    <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white">
      {students.map((student) => (
        <label
          key={student.id}
          className="flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm hover:bg-[#F8FAFC]"
        >
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
            checked={selectedIds.includes(student.id)}
            onChange={() => toggle(student.id)}
          />
          <span>
            <span className="block font-medium text-[#111827]">{studentPickerLabel(student)}</span>
            <span className="block text-xs text-[#6B7280]">{student.email}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function ParentsPanel({ data }: { data: ParentsData }) {
  const ctx = useSeniorsSite();
  const [parents, setParents] = useState(data.parents);
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bulkText, setBulkText] = useState(
    "fullName,email,phone,children\nMummy,mummy@example.com,,keshy@example.com;aryan@example.com",
  );
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "demo1234",
    phone: "",
    childStudentIds: [] as string[],
  });
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    childStudentIds: [] as string[],
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const allSelected = parents.length > 0 && selectedIds.length === parents.length;

  function startEdit(parent: ParentsData["parents"][number]) {
    setShowForm(false);
    setShowBulk(false);
    setEditingId(parent.id);
    setEditForm({
      fullName: parent.fullName,
      email: parent.email,
      password: "",
      phone: parent.phone,
      childStudentIds: parent.children.map((c) => c.id),
    });
    setError("");
  }

  function childrenFromIds(ids: string[]) {
    return ids
      .map((id) => data.students.find((s) => s.id === id))
      .filter((s): s is ParentsData["students"][number] => Boolean(s))
      .map((s) => ({ id: s.id, name: s.fullName }));
  }

  async function createParent(e: React.FormEvent) {
    e.preventDefault();
    if (form.childStudentIds.length === 0) {
      setError("Select at least one child from this school");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "create-user",
        userType: "parent",
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        childStudentIds: form.childStudentIds,
      });
      setParents((prev) => [
        {
          id: json.user.id,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          children: childrenFromIds(form.childStudentIds),
        },
        ...prev,
      ]);
      setShowForm(false);
      setForm({
        fullName: "",
        email: "",
        password: "demo1234",
        phone: "",
        childStudentIds: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function bulkImportParents(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const lines = bulkText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const start = lines[0]?.toLowerCase().includes("email") ? 1 : 0;
      const rows = lines
        .slice(start)
        .map((line) => {
          const parts = line.split(",").map((p) => p.trim());
          const [fullName, email, phone, ...rest] = parts;
          const children = (rest.join(",") || "")
            .split(/[;|]/)
            .map((c) => c.trim())
            .filter(Boolean);
          return {
            fullName: fullName || "",
            email: email || "",
            phone: phone || "",
            password: "demo1234",
            children,
          };
        })
        .filter((r) => r.fullName && r.email);

      if (rows.length === 0) throw new Error("No valid rows found");

      const json = await adminPost(ctx.tenant, {
        action: "bulk-create-parents",
        parents: rows,
      });
      const created = (
        (json.results || []) as {
          ok: boolean;
          id?: string;
          email: string;
          unmatched?: string[];
        }[]
      ).filter((r) => r.ok && r.id);

      setParents((prev) => {
        const next = [...prev];
        for (const result of created) {
          const row = rows.find((x) => x.email.toLowerCase() === result.email.toLowerCase());
          const linkedChildren = (row?.children ?? [])
            .map((token) => {
              const t = token.trim().toLowerCase();
              return data.students.find(
                (s) => s.email.toLowerCase() === t || s.fullName.trim().toLowerCase() === t,
              );
            })
            .filter((s): s is ParentsData["students"][number] => Boolean(s))
            .map((s) => ({ id: s.id, name: s.fullName }));
          const idx = next.findIndex((p) => p.id === result.id);
          if (idx >= 0) {
            const merged = [...next[idx].children];
            for (const child of linkedChildren) {
              if (!merged.some((c) => c.id === child.id)) merged.push(child);
            }
            next[idx] = {
              ...next[idx],
              fullName: row?.fullName || next[idx].fullName,
              phone: row?.phone || next[idx].phone,
              children: merged,
            };
          } else {
            next.unshift({
              id: result.id as string,
              fullName: row?.fullName ?? result.email,
              email: result.email,
              phone: row?.phone ?? "",
              children: linkedChildren,
            });
          }
        }
        return next;
      });

      setShowBulk(false);
      const unmatched = created.flatMap((r) => r.unmatched ?? []);
      if (json.failed > 0 || unmatched.length > 0) {
        setError(
          `Imported ${json.created}${json.failed ? `, failed ${json.failed}` : ""}${
            unmatched.length > 0 ? `. Unmatched children: ${unmatched.join(", ")}` : ""
          }`,
        );
      } else {
        setMessage(
          `${json.created} parent${json.created === 1 ? "" : "s"} imported`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateParent(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    if (editForm.childStudentIds.length === 0) {
      setError("Select at least one child from this school");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "update-user",
        userId: editingId,
        fullName: editForm.fullName,
        email: editForm.email,
        password: editForm.password,
        phone: editForm.phone,
        childStudentIds: editForm.childStudentIds,
      });
      setParents((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                fullName: json.user.fullName,
                email: json.user.email,
                phone: json.user.phone,
                children: childrenFromIds(editForm.childStudentIds),
              }
            : p,
        ),
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteParent(id: string, name: string) {
    if (!window.confirm(`Delete parent "${name}"? This cannot be undone.`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await adminPost(ctx.tenant, { action: "delete-user", userId: id });
      setParents((prev) => prev.filter((p) => p.id !== id));
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  function toggleAllParents() {
    setSelectedIds(allSelected ? [] : parents.map((p) => p.id));
  }

  function toggleParent(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function bulkDeleteParents() {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected parent${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "bulk-delete-users",
        userType: "parent",
        userIds: selectedIds,
      });
      const deleted = (json.deleted as string[] | undefined) ?? [];
      const skipped = (json.skipped as { id: string; reason: string }[] | undefined) ?? [];
      setParents((prev) => prev.filter((p) => !deleted.includes(p.id)));
      setSelectedIds((prev) => prev.filter((id) => !deleted.includes(id)));
      if (editingId && deleted.includes(editingId)) setEditingId(null);
      if (skipped.length > 0) {
        setError(`${deleted.length} deleted. ${skipped.length} skipped.`);
      } else {
        setMessage(
          `${deleted.length} parent${deleted.length === 1 ? "" : "s"} deleted`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[#374151]">
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              className={BTN_DANGER}
              disabled={saving}
              onClick={() => void bulkDeleteParents()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <button
              type="button"
              className="text-xs font-medium text-[#6B7280] hover:text-[#111827]"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </button>
          </div>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button
            type="button"
            className={BTN_GHOST}
            onClick={() => {
              setShowBulk(true);
              setShowForm(false);
              setEditingId(null);
              setError("");
            }}
          >
            Bulk import
          </button>
          <button
            type="button"
            className={BTN_PRIMARY}
            onClick={() => {
              setShowForm(true);
              setShowBulk(false);
              setEditingId(null);
              setError("");
            }}
          >
            Add parent
          </button>
        </div>
      </div>

      {message ? <p className="text-sm text-[#16A34A]">{message}</p> : null}
      {error && !showForm && !editingId && !showBulk ? (
        <p className="text-sm text-[#DC2626]">{error}</p>
      ) : null}

      {showBulk ? (
        <CenterModal
          title="Bulk import parents"
          subtitle="Paste CSV rows: fullName, email, phone, children"
          onClose={() => {
            setShowBulk(false);
            setError("");
          }}
        >
          <form onSubmit={bulkImportParents} className="space-y-3">
            <Field label="CSV rows (fullName,email,phone,children)">
              <textarea
                className={INPUT}
                rows={6}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
            </Field>
            <p className="text-xs text-[#6B7280]">
              Children: student email or name, separate multiple with{" "}
              <span className="font-semibold">;</span>. Same parent email links extra kids
              instead of creating a duplicate login.
            </p>
            {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() => {
                  setShowBulk(false);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Importing…" : "Import parents"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {showForm ? (
        <CenterModal
          title="Add parent"
          subtitle="One parent login can be linked to multiple children in this school."
          onClose={() => {
            setShowForm(false);
            setError("");
          }}
        >
          <form onSubmit={createParent} className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <input
                className={INPUT}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
              />
            </Field>
            <Field label="Email (for login)">
              <input
                type="email"
                className={INPUT}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Field>
            <Field label="Password">
              <input
                className={INPUT}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </Field>
            <Field label="Phone (optional)">
              <input
                className={INPUT}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <span className={LABEL}>Children in this school</span>
              <p className="mb-2 text-xs text-[#6B7280]">
                Tick all kids who belong to this parent. Same login will show both.
              </p>
              <ChildPicker
                students={data.students}
                selectedIds={form.childStudentIds}
                onChange={(childStudentIds) => setForm({ ...form, childStudentIds })}
              />
              {form.childStudentIds.length > 0 ? (
                <p className="mt-2 text-xs font-medium text-[#2563EB]">
                  {form.childStudentIds.length} child
                  {form.childStudentIds.length === 1 ? "" : "ren"} selected
                </p>
              ) : null}
            </div>
            {error ? <p className="sm:col-span-2 text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving…" : "Create parent"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {editingId ? (
        <CenterModal
          title="Edit parent"
          subtitle="Add or remove children anytime. Parent keeps one login."
          onClose={() => {
            setEditingId(null);
            setError("");
          }}
        >
          <form onSubmit={updateParent} className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <input
                className={INPUT}
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                required
              />
            </Field>
            <Field label="Email (for login)">
              <input
                type="email"
                className={INPUT}
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
              />
            </Field>
            <Field label="New password (optional)">
              <input
                className={INPUT}
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Leave blank to keep current"
              />
            </Field>
            <Field label="Phone (optional)">
              <input
                className={INPUT}
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <span className={LABEL}>Children in this school</span>
              <p className="mb-2 text-xs text-[#6B7280]">
                Tick every child in this school who belongs to this parent.
              </p>
              <ChildPicker
                students={data.students}
                selectedIds={editForm.childStudentIds}
                onChange={(childStudentIds) => setEditForm({ ...editForm, childStudentIds })}
              />
              {editForm.childStudentIds.length > 0 ? (
                <p className="mt-2 text-xs font-medium text-[#2563EB]">
                  {editForm.childStudentIds.length} child
                  {editForm.childStudentIds.length === 1 ? "" : "ren"} selected
                </p>
              ) : null}
            </div>
            {error ? <p className="sm:col-span-2 text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className={BTN_GHOST} onClick={() => setEditingId(null)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {parents.length === 0 ? (
        <SeniorsEmptyState
          title="No parents"
          description="Add a parent and link one or more students from this school."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                    checked={allSelected}
                    onChange={toggleAllParents}
                    aria-label="Select all parents"
                  />
                </th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Children</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {parents.map((p) => (
                <tr
                  key={p.id}
                  className={`border-t border-[#E5E7EB] ${
                    selectedIds.includes(p.id) ? "bg-[#EFF6FF]" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                      checked={selectedIds.includes(p.id)}
                      onChange={() => toggleParent(p.id)}
                      aria-label={`Select ${p.fullName}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.fullName}</p>
                    <p className="text-xs text-[#6B7280]">{p.email}</p>
                  </td>
                  <td className="px-4 py-3 text-[#4B5563]">{p.phone || "—"}</td>
                  <td className="px-4 py-3">
                    {p.children.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {p.children.map((c) => (
                          <span
                            key={c.id}
                            className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-medium text-[#1D4ED8]"
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[#DC2626]">No child linked</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <RowActions
                      busy={saving}
                      onEdit={() => startEdit(p)}
                      onDelete={() => deleteParent(p.id, p.fullName)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function contentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function contentStatusMeta(status: string) {
  if (status === "complete") {
    return { label: "Done", className: "bg-[#F0FDF4] text-[#15803D]" };
  }
  if (status === "in_progress") {
    return { label: "In progress", className: "bg-[#FEF9C3] text-[#A16207]" };
  }
  return { label: "Missing", className: "bg-[#FEF2F2] text-[#B91C1C]" };
}

function ContentStatusBar({
  complete,
  inProgress,
  missing,
  total,
}: {
  complete: number;
  inProgress: number;
  missing: number;
  total: number;
}) {
  if (total <= 0) return null;
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
      {complete > 0 ? (
        <div className="bg-[#16A34A]" style={{ width: `${(complete / total) * 100}%` }} />
      ) : null}
      {inProgress > 0 ? (
        <div className="bg-[#EAB308]" style={{ width: `${(inProgress / total) * 100}%` }} />
      ) : null}
      {missing > 0 ? (
        <div className="bg-[#F87171]" style={{ width: `${(missing / total) * 100}%` }} />
      ) : null}
    </div>
  );
}

function topicBelongsToTeacher(
  topic: ContentData["topics"][number],
  teacherId: string,
) {
  return (
    (topic.assignedTeacherIds ?? []).includes(teacherId) || topic.lastById === teacherId
  );
}

function ContentPanel({ data }: { data: ContentData }) {
  const classes = data.classes ?? [];
  const teachers = data.teachers ?? [];
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [teacherId, setTeacherId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "complete" | "in_progress" | "missing">(
    "all",
  );
  const [query, setQuery] = useState("");

  const classTopics = data.topics.filter((topic) => !classId || topic.classId === classId);
  const classTeachers = teachers.filter((teacher) => teacher.classIds.includes(classId));
  const teacherCards = classTeachers.map((teacher) => {
    const theirs = classTopics.filter((topic) => topicBelongsToTeacher(topic, teacher.id));
    return {
      ...teacher,
      total: theirs.length,
      complete: theirs.filter((t) => t.contentStatus === "complete").length,
    };
  });

  const filtered = classTopics.filter((topic) => {
    if (teacherId && !topicBelongsToTeacher(topic, teacherId)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      topic.title.toLowerCase().includes(q) ||
      topic.subjectName.toLowerCase().includes(q) ||
      topic.chapterName.toLowerCase().includes(q) ||
      (topic.lastByName ?? "").toLowerCase().includes(q) ||
      (topic.assignedTeacherNames ?? []).some((name) => name.toLowerCase().includes(q))
    );
  });
  const scoped =
    statusFilter === "all"
      ? filtered
      : filtered.filter((topic) => topic.contentStatus === statusFilter);

  const groups = new Map<string, typeof scoped>();
  for (const topic of scoped) {
    const key = topic.subjectName || "Subject";
    const list = groups.get(key) ?? [];
    list.push(topic);
    groups.set(key, list);
  }

  const complete = filtered.filter((t) => t.contentStatus === "complete").length;
  const inProgress = filtered.filter((t) => t.contentStatus === "in_progress").length;
  const missing = filtered.filter((t) => t.contentStatus === "missing").length;
  const selectedTeacher = teacherCards.find((t) => t.id === teacherId);

  function topicOwner(topic: ContentData["topics"][number]) {
    if (topic.lastByName) {
      return { name: topic.lastByName, hint: topic.pieceCount ? `${topic.pieceCount} uploaded` : "Uploaded" };
    }
    if ((topic.assignedTeacherNames ?? []).length > 0) {
      return {
        name: topic.assignedTeacherNames!.join(", "),
        hint: "Assigned · not started",
      };
    }
    return { name: "No teacher", hint: "Not assigned" };
  }

  if (classes.length === 0 && data.topics.length === 0) {
    return (
      <SeniorsEmptyState
        title="No content yet"
        description="Once classes have subjects and topics, you can check what each teacher has prepared."
      />
    );
  }

  return (
    <div className="space-y-4">
      <SeniorsCard>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <Field label="Class">
              <select
                className={INPUT}
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setTeacherId("");
                  setStatusFilter("all");
                }}
              >
                {classes.length === 0 ? <option value="">All classes</option> : null}
                {classes.map((klass) => (
                  <option key={klass.id} value={klass.id}>
                    {klass.name} {klass.section}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="relative min-w-[200px] flex-[1.2]">
            <span className={LABEL}>Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                className={`${INPUT} pl-9`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Topic, subject or teacher"
              />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className={LABEL}>Teacher</p>
          {teacherCards.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No teacher assigned to this class yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTeacherId("")}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left ${
                  teacherId === ""
                    ? "border-[#2563EB] bg-[#EFF6FF] shadow-sm"
                    : "border-[#E5E7EB] bg-white hover:bg-[#F8FAFC]"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F3F4F6] text-[#6B7280]">
                  <Users className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#111827]">All teachers</span>
                  <span className="block text-[11px] text-[#6B7280]">
                    {classTopics.length} topic{classTopics.length === 1 ? "" : "s"}
                  </span>
                </span>
              </button>
              {teacherCards.map((teacher) => {
                const active = teacherId === teacher.id;
                return (
                  <button
                    key={teacher.id}
                    type="button"
                    onClick={() => setTeacherId(active ? "" : teacher.id)}
                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-left ${
                      active
                        ? "border-[#2563EB] bg-[#EFF6FF] shadow-sm"
                        : "border-[#E5E7EB] bg-white hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EEF2FF] text-xs font-bold text-[#4338CA]">
                      {contentInitials(teacher.fullName)}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-[#111827]">
                        {teacher.fullName}
                      </span>
                      <span className="block text-[11px] text-[#6B7280]">
                        {teacher.total === 0
                          ? "No topics yet"
                          : `${teacher.complete}/${teacher.total} done`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SeniorsCard>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ["all", "Topics", filtered.length, "text-[#111827]"],
            ["complete", "Done", complete, "text-[#15803D]"],
            ["in_progress", "In progress", inProgress, "text-[#A16207]"],
            ["missing", "Missing", missing, "text-[#B91C1C]"],
          ] as const
        ).map(([id, label, count, color]) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatusFilter(id)}
            className={`rounded-xl border px-3 py-2.5 text-left ${
              statusFilter === id
                ? "border-[#2563EB] bg-[#EFF6FF]"
                : "border-[#E5E7EB] bg-white hover:bg-[#F8FAFC]"
            }`}
          >
            <p className="text-[11px] font-medium text-[#6B7280]">{label}</p>
            <p className={`mt-0.5 text-xl font-bold ${color}`}>{count}</p>
          </button>
        ))}
      </div>

      <ContentStatusBar
        complete={complete}
        inProgress={inProgress}
        missing={missing}
        total={filtered.length}
      />

      {selectedTeacher ? (
        <p className="text-sm text-[#374151]">
          Showing <span className="font-semibold">{selectedTeacher.fullName}</span> in this class.
        </p>
      ) : null}

      {scoped.length === 0 ? (
        <SeniorsEmptyState
          title={
            teacherId
              ? "Nothing here for this teacher"
              : statusFilter !== "all"
                ? "No topics with this status"
                : "No topics in this class"
          }
          description={
            teacherId
              ? "Assign a subject to this teacher, or pick another teacher."
              : "Add subjects and topics for this class to track teacher content."
          }
        />
      ) : (
        <div className="space-y-3">
          {[...groups.entries()].map(([subject, topics]) => {
            const done = topics.filter((t) => t.contentStatus === "complete").length;
            return (
              <SeniorsCard key={subject}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#111827]">{subject}</p>
                      <p className="text-[11px] text-[#6B7280]">
                        {done}/{topics.length} done
                      </p>
                    </div>
                  </div>
                  <div className="w-24 shrink-0">
                    <ContentStatusBar
                      complete={done}
                      inProgress={topics.filter((t) => t.contentStatus === "in_progress").length}
                      missing={topics.filter((t) => t.contentStatus === "missing").length}
                      total={topics.length}
                    />
                  </div>
                </div>
                <ul className="divide-y divide-[#E5E7EB]">
                  {topics.map((topic) => {
                    const owner = topicOwner(topic);
                    const status = contentStatusMeta(topic.contentStatus);
                    return (
                      <li
                        key={topic.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[#111827]">
                            {topic.number ? (
                              <span className="mr-1.5 text-[#9CA3AF]">{topic.number}</span>
                            ) : null}
                            {topic.title}
                          </p>
                          <p className="mt-0.5 text-xs text-[#6B7280]">{topic.chapterName}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs text-[#374151]">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#4338CA]">
                              {contentInitials(owner.name)}
                            </span>
                            <span>
                              <span className="font-medium">{owner.name}</span>
                              <span className="text-[#9CA3AF]"> · {owner.hint}</span>
                            </span>
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </SeniorsCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClassesPanel({ data }: { data: ClassesData }) {
  const ctx = useSeniorsSite();
  const [classes, setClasses] = useState(data.classes);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "Class 10",
    section: "B",
    board: "CBSE",
    sortOrder: "0",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    section: "",
    board: "CBSE",
    sortOrder: "0",
  });
  const [subjectClassId, setSubjectClassId] = useState(data.classes[0]?.id ?? "");
  const [subjectPicks, setSubjectPicks] = useState<string[]>([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBoard, setBulkBoard] = useState("CBSE");
  const [bulkSubjectPicks, setBulkSubjectPicks] = useState<string[]>([]);
  const [bulkNewSubjectName, setBulkNewSubjectName] = useState("");
  const [showBulkBoard, setShowBulkBoard] = useState(false);
  const [showBulkSubject, setShowBulkSubject] = useState(false);

  const allSelected = classes.length > 0 && selectedIds.length === classes.length;

  async function createClass(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "create-class",
        name: form.name,
        section: form.section,
        board: form.board,
        sortOrder: Number(form.sortOrder) || 0,
      });
      setClasses((prev) => [
        ...prev,
        {
          id: json.class.id,
          name: json.class.name,
          section: json.class.section,
          board: json.class.board,
          sortOrder: json.class.sortOrder,
          studentCount: 0,
          subjectCount: 0,
          subjects: [],
        },
      ]);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateClass(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setError("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "update-class",
        classId: editingId,
        name: editForm.name,
        section: editForm.section,
        board: editForm.board,
        sortOrder: Number(editForm.sortOrder) || 0,
      });
      setClasses((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? {
                ...c,
                name: json.class.name,
                section: json.class.section,
                board: json.class.board,
                sortOrder: json.class.sortOrder,
              }
            : c,
        ),
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteClass(id: string, label: string) {
    if (!window.confirm(`Delete class "${label}"?`)) return;
    setSaving(true);
    setError("");
    try {
      await adminPost(ctx.tenant, { action: "delete-class", classId: id });
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function addSubject(e: React.FormEvent) {
    e.preventDefault();
    const names = collectSubjectNames(subjectPicks, newSubjectName);
    if (!subjectClassId || names.length === 0) {
      setError("Select or type at least one subject");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "bulk-add-subject",
        classIds: [subjectClassId],
        names,
      });
      const created =
        (json.created as { classId: string; id: string; name: string }[] | undefined) ?? [];
      const skipped = (json.skipped as { classId: string; reason: string }[] | undefined) ?? [];
      setClasses((prev) =>
        prev.map((c) => {
          const added = created.filter((s) => s.classId === c.id);
          if (added.length === 0) return c;
          return {
            ...c,
            subjectCount: c.subjectCount + added.length,
            subjects: [...c.subjects, ...added.map((s) => ({ id: s.id, name: s.name }))],
          };
        }),
      );
      setSubjectPicks([]);
      setNewSubjectName("");
      if (skipped.length > 0 && created.length === 0) {
        setError("These subjects are already on this class.");
        return;
      }
      setShowSubjectForm(false);
      setMessage(
        created.length === 1
          ? `Subject "${created[0]?.name}" added`
          : `${created.length} subjects added`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeSubject(classId: string, subjectId: string, name: string) {
    if (!window.confirm(`Delete subject "${name}" from this class?`)) return;
    setSaving(true);
    setError("");
    try {
      await adminPost(ctx.tenant, { action: "delete-subject", subjectId });
      setClasses((prev) =>
        prev.map((c) =>
          c.id === classId
            ? {
                ...c,
                subjectCount: Math.max(0, c.subjectCount - 1),
                subjects: c.subjects.filter((s) => s.id !== subjectId),
              }
            : c,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  function toggleAllClasses() {
    setSelectedIds(allSelected ? [] : classes.map((c) => c.id));
  }

  function toggleClass(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function bulkDeleteClasses() {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected class${selectedIds.length === 1 ? "" : "es"}? Classes with students or subjects will be skipped.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "bulk-delete-classes",
        classIds: selectedIds,
      });
      const deleted = (json.deleted as string[] | undefined) ?? [];
      const skipped = (json.skipped as { id: string; reason: string }[] | undefined) ?? [];
      setClasses((prev) => prev.filter((c) => !deleted.includes(c.id)));
      setSelectedIds((prev) => prev.filter((id) => !deleted.includes(id)));
      if (skipped.length > 0) {
        setError(
          `${deleted.length} deleted. ${skipped.length} skipped -remove students/subjects first.`,
        );
      } else {
        setMessage(`${deleted.length} class${deleted.length === 1 ? "" : "es"} deleted`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function bulkSetBoard(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "bulk-update-classes-board",
        classIds: selectedIds,
        board: bulkBoard,
      });
      const board = String(json.board ?? bulkBoard);
      setClasses((prev) =>
        prev.map((c) => (selectedIds.includes(c.id) ? { ...c, board } : c)),
      );
      setShowBulkBoard(false);
      setMessage(`Board updated for ${selectedIds.length} class${selectedIds.length === 1 ? "" : "es"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function bulkAddSubject(e: React.FormEvent) {
    e.preventDefault();
    const names = collectSubjectNames(bulkSubjectPicks, bulkNewSubjectName);
    if (selectedIds.length === 0 || names.length === 0) {
      setError("Select or type at least one subject");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "bulk-add-subject",
        classIds: selectedIds,
        names,
      });
      const created =
        (json.created as { classId: string; id: string; name: string }[] | undefined) ?? [];
      const skipped = (json.skipped as { classId: string; reason: string }[] | undefined) ?? [];
      setClasses((prev) =>
        prev.map((c) => {
          const added = created.filter((s) => s.classId === c.id);
          if (added.length === 0) return c;
          return {
            ...c,
            subjectCount: c.subjectCount + added.length,
            subjects: [...c.subjects, ...added.map((s) => ({ id: s.id, name: s.name }))],
          };
        }),
      );
      setBulkSubjectPicks([]);
      setBulkNewSubjectName("");
      setShowBulkSubject(false);
      if (skipped.length > 0) {
        setError(
          `${created.length} added. ${skipped.length} skipped (already exists or failed).`,
        );
      } else {
        setMessage(
          names.length === 1
            ? `Subject added to ${selectedIds.length} class${selectedIds.length === 1 ? "" : "es"}`
            : `${names.length} subjects added to ${selectedIds.length} class${selectedIds.length === 1 ? "" : "es"}`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[#374151]">
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              className={BTN_GHOST}
              disabled={saving}
              onClick={() => {
                setShowBulkBoard(true);
                setShowBulkSubject(false);
                setError("");
              }}
            >
              Set board
            </button>
            <button
              type="button"
              className={BTN_GHOST}
              disabled={saving}
              onClick={() => {
                setShowBulkSubject(true);
                setShowBulkBoard(false);
                setBulkSubjectPicks([]);
                setBulkNewSubjectName("");
                setError("");
              }}
            >
              Add subject
            </button>
            <button
              type="button"
              className={BTN_DANGER}
              disabled={saving}
              onClick={() => void bulkDeleteClasses()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <button
              type="button"
              className="text-xs font-medium text-[#6B7280] hover:text-[#111827]"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </button>
          </div>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className={BTN_GHOST}
          onClick={() => {
            setShowSubjectForm(true);
            setShowForm(false);
            setEditingId(null);
            setSubjectPicks([]);
            setNewSubjectName("");
            setError("");
          }}
        >
          Add subject
        </button>
        <button
          type="button"
          className={BTN_PRIMARY}
          onClick={() => {
            setShowForm(true);
            setShowSubjectForm(false);
            setEditingId(null);
            setError("");
          }}
        >
          Add class
        </button>
        </div>
      </div>

      {showBulkBoard ? (
        <CenterModal
          title={`Set board for ${selectedIds.length} class${selectedIds.length === 1 ? "" : "es"}`}
          onClose={() => setShowBulkBoard(false)}
        >
          <form onSubmit={bulkSetBoard} className="space-y-3">
            <Field label="Board">
              <input
                className={INPUT}
                value={bulkBoard}
                onChange={(e) => setBulkBoard(e.target.value)}
                placeholder="CBSE"
                required
              />
            </Field>
            {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" className={BTN_GHOST} onClick={() => setShowBulkBoard(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving…" : "Update board"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {showBulkSubject ? (
        <CenterModal
          title={`Add subject to ${selectedIds.length} class${selectedIds.length === 1 ? "" : "es"}`}
          onClose={() => setShowBulkSubject(false)}
        >
          <form onSubmit={bulkAddSubject} className="space-y-3">
            <SubjectField
              catalog={schoolSubjectCatalog(classes)}
              selected={bulkSubjectPicks}
              onChange={setBulkSubjectPicks}
              custom={bulkNewSubjectName}
              onCustom={setBulkNewSubjectName}
            />
            {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" className={BTN_GHOST} onClick={() => setShowBulkSubject(false)}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving…" : "Add to selected"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {showSubjectForm ? (
        <CenterModal
          title="Add subject to a class"
          onClose={() => {
            setShowSubjectForm(false);
            setError("");
          }}
        >
          <form onSubmit={addSubject} className="grid gap-3 sm:grid-cols-2">
            <Field label="Class">
              <select
                className={INPUT}
                value={subjectClassId}
                onChange={(e) => {
                  setSubjectClassId(e.target.value);
                  setSubjectPicks([]);
                }}
                required
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.section}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2 space-y-3">
              <SubjectField
                catalog={schoolSubjectCatalog(
                  classes,
                  classes.find((c) => c.id === subjectClassId)?.subjects.map((s) => s.name) ?? [],
                )}
                selected={subjectPicks}
                onChange={setSubjectPicks}
                custom={newSubjectName}
                onCustom={setNewSubjectName}
              />
            </div>
            {error ? <p className="sm:col-span-2 text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() => {
                  setShowSubjectForm(false);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving…" : "Add subjects"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {showForm ? (
        <CenterModal
          title="Add class"
          onClose={() => {
            setShowForm(false);
            setError("");
          }}
        >
          <form onSubmit={createClass} className="grid gap-3 sm:grid-cols-2">
            <Field label="Class name">
              <input className={INPUT} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Field>
            <Field label="Section">
              <input className={INPUT} value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="A" />
            </Field>
            <Field label="Board">
              <input className={INPUT} value={form.board} onChange={(e) => setForm({ ...form, board: e.target.value })} />
            </Field>
            {error ? <p className="sm:col-span-2 text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() => {
                  setShowForm(false);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving…" : "Create class"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {editingId ? (
        <CenterModal
          title="Edit class"
          onClose={() => {
            setEditingId(null);
            setError("");
          }}
        >
          <form onSubmit={updateClass} className="grid gap-3 sm:grid-cols-2">
            <Field label="Class name">
              <input className={INPUT} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </Field>
            <Field label="Section">
              <input className={INPUT} value={editForm.section} onChange={(e) => setEditForm({ ...editForm, section: e.target.value })} />
            </Field>
            <Field label="Board">
              <input className={INPUT} value={editForm.board} onChange={(e) => setEditForm({ ...editForm, board: e.target.value })} />
            </Field>
            {error ? <p className="sm:col-span-2 text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() => {
                  setEditingId(null);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {message ? <p className="text-sm text-[#16A34A]">{message}</p> : null}
      {error && !showForm && !editingId && !showSubjectForm && !showBulkBoard && !showBulkSubject ? (
        <p className="text-sm text-[#DC2626]">{error}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                  checked={allSelected}
                  onChange={toggleAllClasses}
                  aria-label="Select all classes"
                />
              </th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Board</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Subjects</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr
                key={c.id}
                className={
                  selectedIds.includes(c.id)
                    ? "border-t border-[#E5E7EB] bg-[#EFF6FF]/50"
                    : "border-t border-[#E5E7EB]"
                }
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleClass(c.id)}
                    aria-label={`Select ${c.name} ${c.section}`}
                  />
                </td>
                <td className="px-4 py-3 font-medium">
                  {c.name} {c.section}
                </td>
                <td className="px-4 py-3 text-[#4B5563]">{c.board}</td>
                <td className="px-4 py-3 text-[#4B5563]">{c.studentCount}</td>
                <td className="px-4 py-3 text-[#4B5563]">
                  {c.subjects.length === 0 ? (
                    "—"
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {c.subjects.map((s) => (
                        <span
                          key={s.id}
                          className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2 py-0.5 text-xs font-medium text-[#1D4ED8]"
                        >
                          {s.name}
                          <button
                            type="button"
                            className="text-[#DC2626] hover:underline"
                            disabled={saving}
                            onClick={() => removeSubject(c.id, s.id, s.name)}
                            title="Remove subject"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <RowActions
                    busy={saving}
                    onEdit={() => {
                      setShowForm(false);
                      setShowSubjectForm(false);
                      setEditingId(c.id);
                      setEditForm({
                        name: c.name,
                        section: c.section,
                        board: c.board,
                        sortOrder: String(c.sortOrder),
                      });
                    }}
                    onDelete={() => deleteClass(c.id, `${c.name} ${c.section}`.trim())}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function toDateTimeLocal(value: Date | string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function ExamsPanel({ data }: { data: ExamsData }) {
  const ctx = useSeniorsSite();
  const [items, setItems] = useState(data.exams);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    subjectName: "",
    examAt: "",
    targetClassId: "",
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [showMoveClass, setShowMoveClass] = useState(false);
  const [moveClassId, setMoveClassId] = useState("");
  const allSelected = items.length > 0 && selectedIds.length === items.length;
  const subjects = data.subjects ?? [];
  const subjectOptions = (() => {
    const scoped = form.targetClassId
      ? subjects.filter((s) => s.classId === form.targetClassId)
      : subjects;
    const seen = new Set<string>();
    return scoped.filter((s) => {
      const key = s.name.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  function resetForm() {
    setEditingId(null);
    setShowForm(false);
    setForm({ title: "", subjectName: "", examAt: "", targetClassId: "" });
    setError("");
  }

  function editExam(exam: ExamsData["exams"][number]) {
    setEditingId(exam.id);
    setShowForm(true);
    setForm({
      title: exam.title,
      subjectName: exam.subjectName,
      examAt: toDateTimeLocal(exam.examAt),
      targetClassId: exam.targetClassId ?? "",
    });
    setError("");
  }

  async function saveExam(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: editingId ? "update-exam" : "create-exam",
        examId: editingId ?? undefined,
        ...form,
        targetClassId: form.targetClassId || null,
      });
      const klass = data.classes.find((item) => item.id === form.targetClassId);
      const next = {
        id: json.exam.id as string,
        title: form.title.trim(),
        subjectName: form.subjectName.trim(),
        examAt: json.exam.examAt as string,
        targetClassId: form.targetClassId || null,
        classLabel: klass
          ? `${klass.name}${klass.section ? ` ${klass.section}` : ""}`
          : "Whole school",
      };
      setItems((current) =>
        (editingId
          ? current.map((item) => (item.id === editingId ? next : item))
          : [...current, next]
        ).sort(
          (a, b) => new Date(a.examAt).getTime() - new Date(b.examAt).getTime(),
        ),
      );
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save exam");
    } finally {
      setSaving(false);
    }
  }

  async function deleteExam(exam: ExamsData["exams"][number]) {
    if (!window.confirm(`Delete "${exam.title}"?`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await adminPost(ctx.tenant, { action: "delete-exam", examId: exam.id });
      setItems((current) => current.filter((item) => item.id !== exam.id));
      setSelectedIds((prev) => prev.filter((id) => id !== exam.id));
      if (editingId === exam.id) resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete exam");
    } finally {
      setSaving(false);
    }
  }

  function toggleAllExams() {
    setSelectedIds(allSelected ? [] : items.map((exam) => exam.id));
  }

  function toggleExam(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function bulkDeleteExams() {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected exam${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "bulk-delete-exams",
        examIds: selectedIds,
      });
      const deleted = (json.deleted as string[] | undefined) ?? [];
      const skipped = (json.skipped as { id: string; reason: string }[] | undefined) ?? [];
      setItems((prev) => prev.filter((exam) => !deleted.includes(exam.id)));
      setSelectedIds((prev) => prev.filter((id) => !deleted.includes(id)));
      if (editingId && deleted.includes(editingId)) resetForm();
      if (skipped.length > 0) {
        setError(`${deleted.length} deleted. ${skipped.length} skipped.`);
      } else {
        setMessage(`${deleted.length} exam${deleted.length === 1 ? "" : "s"} deleted`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function bulkMoveExams(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "bulk-update-exams-class",
        examIds: selectedIds,
        targetClassId: moveClassId || null,
      });
      const updated = (json.updated as string[] | undefined) ?? [];
      const skipped = (json.skipped as { id: string; reason: string }[] | undefined) ?? [];
      const classLabel = (json.classLabel as string | undefined) || "Whole school";
      const targetClassId = (json.targetClassId as string | null | undefined) ?? null;
      setItems((prev) =>
        prev.map((exam) =>
          updated.includes(exam.id) ? { ...exam, targetClassId, classLabel } : exam,
        ),
      );
      setShowMoveClass(false);
      if (skipped.length > 0) {
        setError(`${updated.length} updated. ${skipped.length} skipped.`);
      } else {
        setMessage(
          `${updated.length} exam${updated.length === 1 ? "" : "s"} moved to ${classLabel}`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[#374151]">
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              className={BTN_GHOST}
              disabled={saving}
              onClick={() => {
                setShowMoveClass(true);
                setError("");
              }}
            >
              Change class
            </button>
            <button
              type="button"
              className={BTN_DANGER}
              disabled={saving}
              onClick={() => void bulkDeleteExams()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <button
              type="button"
              className="text-xs font-medium text-[#6B7280] hover:text-[#111827]"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </button>
          </div>
        ) : (
          <span />
        )}
        <button
          type="button"
          className={BTN_PRIMARY}
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add exam
          </span>
        </button>
      </div>

      {message ? <p className="text-sm text-[#16A34A]">{message}</p> : null}
      {error && !showForm && !showMoveClass ? (
        <p className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">{error}</p>
      ) : null}

      {showMoveClass ? (
        <CenterModal
          title={`Change class for ${selectedIds.length} exam${selectedIds.length === 1 ? "" : "s"}`}
          onClose={() => {
            setShowMoveClass(false);
            setError("");
          }}
        >
          <form onSubmit={bulkMoveExams} className="space-y-3">
            <Field label="Visible to">
              <select
                className={INPUT}
                value={moveClassId}
                onChange={(e) => setMoveClassId(e.target.value)}
              >
                <option value="">Whole school</option>
                {data.classes.map((klass) => (
                  <option key={klass.id} value={klass.id}>
                    {klass.name} {klass.section}
                  </option>
                ))}
              </select>
            </Field>
            {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() => {
                  setShowMoveClass(false);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving…" : "Update exams"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {showForm ? (
        <CenterModal
          wide
          title={editingId ? "Edit exam" : "Schedule an exam"}
          subtitle="This is a timetable entry, not an online test."
          onClose={resetForm}
        >
          <form onSubmit={saveExam} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Exam title">
                <input
                  required
                  className={INPUT}
                  value={form.title}
                  placeholder="Unit Test 1"
                  onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                />
              </Field>
              <Field label="Subject">
                <select
                  className={INPUT}
                  value={form.subjectName}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, subjectName: e.target.value }))
                  }
                >
                  <option value="">Select subject</option>
                  {form.subjectName &&
                  !subjectOptions.some((s) => s.name === form.subjectName) ? (
                    <option value={form.subjectName}>{form.subjectName}</option>
                  ) : null}
                  {subjectOptions.length === 0 ? (
                    <option value="" disabled>
                      No subjects found
                    </option>
                  ) : (
                    subjectOptions.map((subject) => (
                      <option key={subject.id} value={subject.name}>
                        {subject.name}
                      </option>
                    ))
                  )}
                </select>
              </Field>
              <Field label="Date and time">
                <input
                  required
                  type="datetime-local"
                  className={INPUT}
                  value={form.examAt}
                  onChange={(e) => setForm((current) => ({ ...current, examAt: e.target.value }))}
                />
              </Field>
              <Field label="Visible to">
                <select
                  className={INPUT}
                  value={form.targetClassId}
                  onChange={(e) => {
                    const targetClassId = e.target.value;
                    const nextSubjects = targetClassId
                      ? subjects.filter((s) => s.classId === targetClassId)
                      : subjects;
                    const stillValid = nextSubjects.some((s) => s.name === form.subjectName);
                    setForm((current) => ({
                      ...current,
                      targetClassId,
                      subjectName: stillValid ? current.subjectName : "",
                    }));
                  }}
                >
                  <option value="">Whole school</option>
                  {data.classes.map((klass) => (
                    <option key={klass.id} value={klass.id}>
                      {klass.name} {klass.section}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" className={BTN_GHOST} onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className={BTN_PRIMARY} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Save changes" : "Schedule exam"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {items.length === 0 ? (
        <SeniorsEmptyState
          title="No exams scheduled"
          description="Add the first exam date for a class or the whole school."
        />
      ) : (
        <SeniorsCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                      checked={allSelected}
                      onChange={toggleAllExams}
                      aria-label="Select all exams"
                    />
                  </th>
                  <th className="px-4 py-3">Exam</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Date & time</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {items.map((exam) => (
                  <tr
                    key={exam.id}
                    className={selectedIds.includes(exam.id) ? "bg-[#EFF6FF]" : undefined}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                        checked={selectedIds.includes(exam.id)}
                        onChange={() => toggleExam(exam.id)}
                        aria-label={`Select ${exam.title}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#111827]">{exam.title}</p>
                      <p className="text-xs text-[#6B7280]">{exam.subjectName || "General"}</p>
                    </td>
                    <td className="px-4 py-3 text-[#374151]">{exam.classLabel}</td>
                    <td className="px-4 py-3 text-[#374151]">{formatDateTime(exam.examAt)}</td>
                    <td className="px-4 py-3">
                      <RowActions
                        busy={saving}
                        onEdit={() => editExam(exam)}
                        onDelete={() => deleteExam(exam)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SeniorsCard>
      )}
    </div>
  );
}

type AudienceDraft = {
  audienceType: "all" | "roles" | "people";
  roles: string[];
  classIds: string[];
  limitClasses: boolean;
  userIds: string[];
};

const EMPTY_AUDIENCE: AudienceDraft = {
  audienceType: "all",
  roles: ["student", "teacher", "parent"],
  classIds: [],
  limitClasses: false,
  userIds: [],
};

function audienceFromItem(item: AnnouncementsData["announcements"][number]): AudienceDraft {
  const audienceType =
    item.audienceType === "roles" || item.audienceType === "people"
      ? item.audienceType
      : "all";
  const roles = asIdList(item.audienceRoles);
  const classIds = asIdList(item.targetClassIds);
  const userIds = asIdList(item.targetUserIds);
  return {
    audienceType,
    roles: roles.length > 0 ? roles : ["student", "teacher", "parent"],
    classIds,
    limitClasses: classIds.length > 0,
    userIds,
  };
}

function audiencePayload(draft: AudienceDraft) {
  return {
    audienceType: draft.audienceType,
    audienceRoles:
      draft.audienceType === "roles" ? draft.roles : ["student", "teacher", "parent"],
    targetClassIds: draft.audienceType === "roles" && draft.limitClasses ? draft.classIds : [],
    targetUserIds: draft.audienceType === "people" ? draft.userIds : [],
  };
}

function validateAudience(draft: AudienceDraft) {
  if (draft.audienceType === "roles" && draft.roles.length === 0) {
    return "Please tick at least one group: students, teachers or parents.";
  }
  if (draft.audienceType === "people" && draft.userIds.length === 0) {
    return "Please pick at least one person.";
  }
  if (draft.audienceType === "roles" && draft.limitClasses && draft.classIds.length === 0) {
    return "Pick at least one class, or choose All classes.";
  }
  return "";
}

function announcementSnippet(text: string, max = 72) {
  const one = text.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}

function personClassLabel(person: object) {
  if (!("classLabel" in person)) return "";
  const value = (person as { classLabel?: unknown }).classLabel;
  return typeof value === "string" ? value : "";
}

function AudiencePicker({
  audience,
  onChange,
  classes,
  students,
  teachers,
  parents,
  peopleDirectory,
}: {
  audience: AudienceDraft;
  onChange: (next: AudienceDraft) => void;
  classes: { id: string; name: string; section: string }[];
  students: { id: string; fullName: string; classLabel?: string }[];
  teachers: { id: string; fullName: string }[];
  parents: { id: string; fullName: string }[];
  peopleDirectory: { id: string; fullName: string }[];
}) {
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleTab, setPeopleTab] = useState<"all" | "student" | "teacher" | "parent">("all");

  function toggleValue(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function personName(id: string) {
    return peopleDirectory.find((p) => p.id === id)?.fullName ?? "Person";
  }

  function previewText() {
    if (audience.audienceType === "all") return "Everyone in the school will see this.";
    if (audience.audienceType === "people") {
      if (audience.userIds.length === 0) return "Pick the people who should see this.";
      if (audience.userIds.length <= 3) {
        return `Only ${audience.userIds.map(personName).join(", ")} will see this.`;
      }
      return `Only ${audience.userIds.length} selected people will see this.`;
    }
    if (audience.roles.length === 0) {
      return "Tick who should see this: students, teachers or parents.";
    }
    const who = audience.roles
      .map((role) =>
        role === "student" ? "students" : role === "teacher" ? "teachers" : "parents",
      )
      .join(" + ");
    if (!audience.limitClasses || audience.classIds.length === 0) {
      return `This will go to all ${who}.`;
    }
    const classNames = audience.classIds
      .map((id) => {
        const klass = classes.find((c) => c.id === id);
        return klass ? `${klass.name} ${klass.section}`.trim() : "";
      })
      .filter(Boolean)
      .join(", ");
    return `This will go to ${who} in ${classNames || "selected classes"}.`;
  }

  const q = peopleQuery.trim().toLowerCase();
  const peopleGroups = [
    { id: "student" as const, label: "Students", list: students },
    { id: "teacher" as const, label: "Teachers", list: teachers },
    { id: "parent" as const, label: "Parents", list: parents },
  ];
  const visibleGroups = peopleGroups
    .filter((group) => peopleTab === "all" || peopleTab === group.id)
    .map((group) => ({
      ...group,
      list: group.list.filter((person) => {
        if (!q) return true;
        const extra = personClassLabel(person);
        return person.fullName.toLowerCase().includes(q) || extra.toLowerCase().includes(q);
      }),
    }));

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        {(
          [
            {
              value: "all" as const,
              title: "Whole school",
              hint: "Students, teachers and parents",
              icon: Megaphone,
            },
            {
              value: "roles" as const,
              title: "By group",
              hint: "Only students, teachers or parents",
              icon: Users,
            },
            {
              value: "people" as const,
              title: "Specific people",
              hint: "Pick names from the school",
              icon: UserRound,
            },
          ] as const
        ).map((option) => {
          const Icon = option.icon;
          const active = audience.audienceType === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange({ ...audience, audienceType: option.value })}
              className={`rounded-xl border p-3 text-left transition ${
                active
                  ? "border-[#2563EB] bg-[#EFF6FF] shadow-sm"
                  : "border-[#E5E7EB] bg-white hover:bg-[#F8FAFC]"
              }`}
            >
              <span
                className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${
                  active ? "bg-white text-[#2563EB]" : "bg-[#F3F4F6] text-[#6B7280]"
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="block text-sm font-semibold text-[#111827]">{option.title}</span>
              <span className="mt-0.5 block text-xs text-[#6B7280]">{option.hint}</span>
            </button>
          );
        })}
      </div>

      {audience.audienceType === "roles" ? (
        <div className="space-y-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
          <p className="text-xs font-medium text-[#6B7280]">Tick the groups</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["student", "Students", GraduationCap],
                ["teacher", "Teachers", Users],
                ["parent", "Parents", UserRound],
              ] as const
            ).map(([value, label, Icon]) => {
              const on = audience.roles.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    onChange({ ...audience, roles: toggleValue(audience.roles, value) })
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
                    on
                      ? "border-[#2563EB] bg-white text-[#1D4ED8]"
                      : "border-[#E5E7EB] bg-white text-[#6B7280]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
          {audience.roles.includes("student") || audience.roles.includes("parent") ? (
            <div>
              <div className="mb-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ ...audience, limitClasses: false, classIds: [] })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    !audience.limitClasses
                      ? "bg-[#2563EB] text-white"
                      : "bg-white text-[#6B7280] ring-1 ring-[#E5E7EB]"
                  }`}
                >
                  All classes
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...audience, limitClasses: true })}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    audience.limitClasses
                      ? "bg-[#2563EB] text-white"
                      : "bg-white text-[#6B7280] ring-1 ring-[#E5E7EB]"
                  }`}
                >
                  Only some classes
                </button>
              </div>
              {audience.limitClasses ? (
                <div className="flex flex-wrap gap-2">
                  {classes.map((klass) => {
                    const on = audience.classIds.includes(klass.id);
                    return (
                      <button
                        key={klass.id}
                        type="button"
                        onClick={() =>
                          onChange({
                            ...audience,
                            classIds: toggleValue(audience.classIds, klass.id),
                          })
                        }
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          on
                            ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
                            : "border-[#E5E7EB] bg-white text-[#6B7280]"
                        }`}
                      >
                        {klass.name} {klass.section}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {audience.audienceType === "people" ? (
        <div className="space-y-3 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
          {audience.userIds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {audience.userIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-[#EFF6FF] px-2.5 py-1 text-xs font-medium text-[#1D4ED8]"
                >
                  {personName(id)}
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        ...audience,
                        userIds: audience.userIds.filter((x) => x !== id),
                      })
                    }
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#6B7280]">Search and tick names below.</p>
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              className={`${INPUT} pl-9`}
              value={peopleQuery}
              onChange={(e) => setPeopleQuery(e.target.value)}
              placeholder="Search by name…"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "All"],
                ["student", "Students"],
                ["teacher", "Teachers"],
                ["parent", "Parents"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeopleTab(id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  peopleTab === id
                    ? "bg-[#111827] text-white"
                    : "bg-white text-[#6B7280] ring-1 ring-[#E5E7EB]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="max-h-48 space-y-3 overflow-y-auto rounded-lg border border-[#E5E7EB] bg-white p-2">
            {visibleGroups.map((group) => (
              <div key={group.id}>
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                  {group.label}
                </p>
                {group.list.length === 0 ? (
                  <p className="px-1 py-1 text-xs text-[#9CA3AF]">No matches</p>
                ) : (
                  group.list.map((person) => {
                    const classLabel = personClassLabel(person);
                    return (
                    <label
                      key={person.id}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[#F8FAFC]"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                        checked={audience.userIds.includes(person.id)}
                        onChange={() =>
                          onChange({
                            ...audience,
                            userIds: toggleValue(audience.userIds, person.id),
                          })
                        }
                      />
                      <span>
                        {person.fullName}
                        {classLabel ? (
                          <span className="text-xs text-[#6B7280]"> · {classLabel}</span>
                        ) : null}
                      </span>
                    </label>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-sm text-[#1D4ED8]">
        {previewText()}
      </div>
    </div>
  );
}

function AnnouncementsPanel({ data }: { data: AnnouncementsData }) {
  const ctx = useSeniorsSite();
  const [classes, setClasses] = useState(data.classes ?? []);
  const [students, setStudents] = useState(data.students ?? []);
  const [teachers, setTeachers] = useState(data.teachers ?? []);
  const [parents, setParents] = useState(data.parents ?? []);
  const peopleDirectory = [
    ...students.map((p) => ({ id: p.id, fullName: p.fullName })),
    ...teachers,
    ...parents,
  ];
  const [items, setItems] = useState(data.announcements);

  useEffect(() => {
    if (!ctx.tenant) return;
    if (classes.length > 0 && students.length > 0 && teachers.length > 0) return;
    const t = encodeURIComponent(ctx.tenant);
    let cancelled = false;
    void (async () => {
      try {
        const [classData, studentData, teacherData, parentData] = await Promise.all([
          loadSeniorsCachedJson<{
            classes?: { id: string; name: string; section: string }[];
          }>(`/api/tenants/${t}/seniors/school-admin/page?view=classes`),
          loadSeniorsCachedJson<{
            students?: {
              id: string;
              fullName: string;
              className?: string;
              sectionName?: string;
              classLabel?: string;
            }[];
          }>(`/api/tenants/${t}/seniors/school-admin/page?view=students`),
          loadSeniorsCachedJson<{
            teachers?: { id: string; fullName: string }[];
          }>(`/api/tenants/${t}/seniors/school-admin/page?view=teachers`),
          loadSeniorsCachedJson<{
            parents?: { id: string; fullName: string }[];
          }>(`/api/tenants/${t}/seniors/school-admin/page?view=parents`),
        ]);
        if (cancelled) return;
        if ((classData.classes?.length ?? 0) > 0) setClasses(classData.classes ?? []);
        if ((studentData.students?.length ?? 0) > 0) {
          setStudents(
            (studentData.students ?? []).map((s) => ({
              id: s.id,
              fullName: s.fullName,
              classLabel:
                s.classLabel ||
                `${s.className ?? ""} ${s.sectionName ?? ""}`.trim(),
            })),
          );
        }
        if ((teacherData.teachers?.length ?? 0) > 0) {
          setTeachers((teacherData.teachers ?? []).map((row) => ({ id: row.id, fullName: row.fullName })));
        }
        if ((parentData.parents?.length ?? 0) > 0) {
          setParents((parentData.parents ?? []).map((row) => ({ id: row.id, fullName: row.fullName })));
        }
      } catch {
        // keep whatever directory we already have
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ctx.tenant, classes.length, students.length, teachers.length]);
  const [showForm, setShowForm] = useState(false);
  const [showAudienceBulk, setShowAudienceBulk] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AudienceDraft>(EMPTY_AUDIENCE);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const directory = { classes, people: peopleDirectory };
  const filtered = items.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const label = announcementAudienceLabel(item, directory).toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.body.toLowerCase().includes(q) ||
      label.includes(q) ||
      item.createdByName.toLowerCase().includes(q)
    );
  });
  const allSelected =
    filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id));

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setTitle("");
    setBody("");
    setAudience(EMPTY_AUDIENCE);
    setError("");
  }

  function openCreate() {
    resetForm();
    setShowAudienceBulk(false);
    setShowForm(true);
  }

  function openEdit(item: AnnouncementsData["announcements"][number]) {
    setEditingId(item.id);
    setTitle(item.title);
    setBody(item.body);
    setAudience(audienceFromItem(item));
    setError("");
    setShowAudienceBulk(false);
    setShowForm(true);
  }

  function toggleAll() {
    if (allSelected) {
      const visible = new Set(filtered.map((item) => item.id));
      setSelectedIds((prev) => prev.filter((id) => !visible.has(id)));
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...filtered.map((item) => item.id)])]);
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function saveAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    const audienceError = validateAudience(audience);
    if (audienceError) {
      setError(audienceError);
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = audiencePayload(audience);
      const json = await adminPost(ctx.tenant, {
        action: editingId ? "update-announcement" : "create-announcement",
        announcementId: editingId ?? undefined,
        title,
        body,
        ...payload,
      });
      const next = {
        id: json.announcement.id as string,
        title: title.trim(),
        body: body.trim(),
        publishedAt:
          (json.announcement.publishedAt as string | undefined) ?? new Date().toISOString(),
        createdByName: (json.announcement.createdByName as string | undefined) || "You",
        ...payload,
      };
      setItems((current) =>
        editingId
          ? current.map((item) => (item.id === editingId ? { ...item, ...next } : item))
          : [next, ...current],
      );
      resetForm();
      setMessage(editingId ? "Announcement updated" : "Announcement sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOne(item: AnnouncementsData["announcements"][number]) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await adminPost(ctx.tenant, {
        action: "delete-announcement",
        announcementId: item.id,
      });
      setItems((current) => current.filter((row) => row.id !== item.id));
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
      if (editingId === item.id) resetForm();
      setMessage("Announcement deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  async function bulkDelete() {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected announcement${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "bulk-delete-announcements",
        announcementIds: selectedIds,
      });
      const deleted = (json.deleted as string[] | undefined) ?? [];
      const skipped = (json.skipped as { id: string; reason: string }[] | undefined) ?? [];
      setItems((prev) => prev.filter((item) => !deleted.includes(item.id)));
      setSelectedIds((prev) => prev.filter((id) => !deleted.includes(id)));
      if (editingId && deleted.includes(editingId)) resetForm();
      if (skipped.length > 0) {
        setError(`${deleted.length} deleted. ${skipped.length} skipped.`);
      } else {
        setMessage(`${deleted.length} announcement${deleted.length === 1 ? "" : "s"} deleted`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function bulkChangeAudience(e: React.FormEvent) {
    e.preventDefault();
    const audienceError = validateAudience(audience);
    if (audienceError) {
      setError(audienceError);
      return;
    }
    if (selectedIds.length === 0) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = audiencePayload(audience);
      const json = await adminPost(ctx.tenant, {
        action: "bulk-update-announcements-audience",
        announcementIds: selectedIds,
        ...payload,
      });
      const updated = (json.updated as string[] | undefined) ?? [];
      const skipped = (json.skipped as { id: string; reason: string }[] | undefined) ?? [];
      setItems((prev) =>
        prev.map((item) => (updated.includes(item.id) ? { ...item, ...payload } : item)),
      );
      setShowAudienceBulk(false);
      if (skipped.length > 0) {
        setError(`${updated.length} updated. ${skipped.length} skipped.`);
      } else {
        setMessage(
          `Audience updated for ${updated.length} announcement${updated.length === 1 ? "" : "s"}`,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[#374151]">
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              className={BTN_GHOST}
              disabled={saving}
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setAudience(EMPTY_AUDIENCE);
                setShowAudienceBulk(true);
                setError("");
              }}
            >
              Change audience
            </button>
            <button
              type="button"
              className={BTN_DANGER}
              disabled={saving}
              onClick={() => void bulkDelete()}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <button
              type="button"
              className="text-xs font-medium text-[#6B7280] hover:text-[#111827]"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              className={`${INPUT} pl-9`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search announcements…"
            />
          </div>
        )}
        <button type="button" className={BTN_PRIMARY} onClick={openCreate}>
          <span className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New announcement
          </span>
        </button>
      </div>

      {message ? <p className="text-sm text-[#16A34A]">{message}</p> : null}
      {error && !showForm && !showAudienceBulk ? (
        <p className="rounded-lg bg-[#FEF2F2] px-3 py-2 text-sm text-[#B91C1C]">{error}</p>
      ) : null}

      {showAudienceBulk ? (
        <CenterModal
          wide
          title={`Change audience for ${selectedIds.length} announcement${selectedIds.length === 1 ? "" : "s"}`}
          subtitle="This updates who can see the selected notices."
          onClose={() => {
            setShowAudienceBulk(false);
            setError("");
          }}
        >
          <form onSubmit={bulkChangeAudience} className="space-y-4">
            <AudiencePicker
              audience={audience}
              onChange={setAudience}
              classes={classes}
              students={students}
              teachers={teachers}
              parents={parents}
              peopleDirectory={peopleDirectory}
            />
            {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={BTN_GHOST}
                onClick={() => {
                  setShowAudienceBulk(false);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving…" : "Update audience"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {showForm ? (
        <CenterModal
          wide
          title={editingId ? "Edit announcement" : "Send an announcement"}
          subtitle="Write the message, then pick who should see it."
          onClose={resetForm}
        >
          <form onSubmit={saveAnnouncement} className="space-y-5">
            <div>
              <p className="mb-3 text-sm font-bold text-[#111827]">1. What do you want to say?</p>
              <div className="space-y-3">
                <Field label="Title">
                  <input
                    className={INPUT}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Holiday on Monday"
                    required
                  />
                </Field>
                <Field label="Message">
                  <textarea
                    className={INPUT}
                    rows={4}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write the full notice here…"
                    required
                  />
                </Field>
              </div>
            </div>
            <div>
              <p className="mb-3 text-sm font-bold text-[#111827]">2. Who should see this?</p>
              <AudiencePicker
                audience={audience}
                onChange={setAudience}
                classes={classes}
                students={students}
                teachers={teachers}
                parents={parents}
                peopleDirectory={peopleDirectory}
              />
            </div>
            {error ? <p className="text-sm text-[#DC2626]">{error}</p> : null}
            <div className="flex justify-end gap-2 border-t border-[#E5E7EB] pt-4">
              <button type="button" className={BTN_GHOST} onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Send announcement"}
              </button>
            </div>
          </form>
        </CenterModal>
      ) : null}

      {items.length === 0 ? (
        <SeniorsEmptyState
          title="No announcements yet"
          description="Send a holiday note, PTM reminder or circular. You can send it to the whole school or only some people."
        />
      ) : filtered.length === 0 ? (
        <SeniorsEmptyState
          title="No matching announcements"
          description="Try a different search, or clear the search box."
        />
      ) : (
        <SeniorsCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all announcements"
                    />
                  </th>
                  <th className="px-4 py-3">Announcement</th>
                  <th className="px-4 py-3">Sent to</th>
                  <th className="px-4 py-3">Published</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className={selectedIds.includes(item.id) ? "bg-[#EFF6FF]" : undefined}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[#D1D5DB] text-[#2563EB] focus:ring-[#2563EB]"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleOne(item.id)}
                        aria-label={`Select ${item.title}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-[#111827]">{item.title}</p>
                      <p className="text-xs text-[#6B7280]">{announcementSnippet(item.body)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-medium text-[#1D4ED8]">
                        {announcementAudienceLabel(item, directory)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#374151]">
                      <p>{formatDateTime(item.publishedAt)}</p>
                      {item.createdByName ? (
                        <p className="text-xs text-[#9CA3AF]">{item.createdByName}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <RowActions
                        busy={saving}
                        onEdit={() => openEdit(item)}
                        onDelete={() => void deleteOne(item)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SeniorsCard>
      )}
    </div>
  );
}

function SettingsPanel({ data }: { data: SettingsData }) {
  const ctx = useSeniorsSite();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    schoolName: data.settings.schoolName,
    logoUrl: data.settings.logoUrl ?? "",
    primaryColor: data.settings.primaryColor || "#2563EB",
    markingScheme: data.settings.markingScheme,
    answerFormat: data.settings.answerFormat,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function uploadLogo(file: File) {
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch(`/api/tenants/${ctx.tenant}/seniors/media/upload`, {
        method: "POST",
        body,
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
      setForm((current) => ({ ...current, logoUrl: json.url! }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/tenants/${ctx.tenant}/seniors/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-settings", ...form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setMessage("Settings saved");
      if (form.logoUrl !== (data.settings.logoUrl ?? "")) {
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SeniorsCard>
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className={LABEL}>School logo</span>
          <div className="mt-1 flex flex-wrap items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC]">
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.logoUrl} alt="School logo" className="h-full w-full object-contain p-1.5" />
              ) : (
                <span className="text-2xl font-bold text-[#9CA3AF]">
                  {(form.schoolName.trim()[0] || "S").toUpperCase()}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  className={BTN_GHOST}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-3.5 w-3.5" />
                  )}
                  {uploading ? "Uploading…" : form.logoUrl ? "Change logo" : "Upload logo"}
                </button>
                {form.logoUrl ? (
                  <button
                    type="button"
                    className={BTN_GHOST}
                    onClick={() => setForm((current) => ({ ...current, logoUrl: "" }))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <p className="text-xs text-[#6B7280]">PNG or JPG, square logo looks best. Then save.</p>
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
        <Field label="School name">
          <input
            className={INPUT}
            value={form.schoolName}
            onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
          />
        </Field>
        <Field label="Primary color">
          <div className="flex gap-2">
            <input
              type="color"
              className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-[#E5E7EB] bg-white p-1"
              value={/^#[0-9A-Fa-f]{6}$/.test(form.primaryColor) ? form.primaryColor : "#2563EB"}
              onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
              aria-label="Pick primary color"
            />
            <input
              className={INPUT}
              value={form.primaryColor}
              onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
            />
          </div>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Default marking scheme">
            <textarea
              className={INPUT}
              rows={3}
              value={form.markingScheme}
              onChange={(e) => setForm({ ...form, markingScheme: e.target.value })}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Default answer format">
            <textarea
              className={INPUT}
              rows={3}
              value={form.answerFormat}
              onChange={(e) => setForm({ ...form, answerFormat: e.target.value })}
            />
          </Field>
        </div>
        {error ? <p className="sm:col-span-2 text-sm text-[#DC2626]">{error}</p> : null}
        {message ? <p className="sm:col-span-2 text-sm text-[#16A34A]">{message}</p> : null}
        <div className="sm:col-span-2">
          <button type="submit" disabled={saving || uploading} className={BTN_PRIMARY}>
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </SeniorsCard>
  );
}

function statusPill(status: string) {
  if (status === "approved") {
    return (
      <span className="rounded-full bg-[#DCFCE7] px-2.5 py-1 text-xs font-semibold text-[#166534]">
        Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="rounded-full bg-[#FEE2E2] px-2.5 py-1 text-xs font-semibold text-[#B91C1C]">
        Rejected
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[#DBEAFE] px-2.5 py-1 text-xs font-semibold text-[#1D4ED8]">
      Pending
    </span>
  );
}

function EnquiriesPanel({ data }: { data: EnquiriesData }) {
  const ctx = useSeniorsSite();
  const [items, setItems] = useState(data.enquiries);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">(
    "pending",
  );
  const [roleFilter, setRoleFilter] = useState<"all" | "student" | "teacher">("all");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [classId, setClassId] = useState(data.classes[0]?.id ?? "");
  const [rollNumber, setRollNumber] = useState("");
  const [assignments, setAssignments] = useState<{ classId: string; subjectId: string }[]>([]);
  const [rejectionReason, setRejectionReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const reviewing = items.find((item) => item.id === reviewingId) ?? null;
  const pendingCount = items.filter((item) => item.status === "pending").length;

  const filtered = items.filter((item) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.fullName.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.requestedClassLabel.toLowerCase().includes(q) ||
      item.requestedSubject.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesRole = roleFilter === "all" || item.role === roleFilter;
    return matchesSearch && matchesStatus && matchesRole;
  });

  function openReview(item: EnquiriesData["enquiries"][number]) {
    setReviewingId(item.id);
    setClassId(data.classes[0]?.id ?? "");
    setRollNumber(item.rollNumber || "");
    setAssignments([]);
    setRejectionReason("");
    setError("");
    setMessage("");
  }

  async function approve() {
    if (!reviewing) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "approve-join-request",
        requestId: reviewing.id,
        classId: reviewing.role === "student" ? classId : undefined,
        rollNumber: reviewing.role === "student" ? rollNumber : undefined,
        assignments: reviewing.role === "teacher" ? assignments : undefined,
      });
      setItems((prev) =>
        prev.map((item) =>
          item.id === reviewing.id
            ? {
                ...item,
                status: "approved",
                rejectionReason: "",
                reviewedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      setMessage(`Approved ${json.user?.fullName ?? reviewing.fullName}`);
      setReviewingId(null);
      notifySeniorsEnquiriesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!reviewing) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const json = await adminPost(ctx.tenant, {
        action: "reject-join-request",
        requestId: reviewing.id,
        rejectionReason,
      });
      setItems((prev) =>
        prev.map((item) =>
          item.id === reviewing.id
            ? {
                ...item,
                status: "rejected",
                rejectionReason: json.request?.rejectionReason || rejectionReason,
                reviewedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
      setMessage(`Rejected ${reviewing.fullName}`);
      setReviewingId(null);
      notifySeniorsEnquiriesChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {pendingCount > 0 ? (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
          {pendingCount} pending {pendingCount === 1 ? "enquiry needs" : "enquiries need"} review.
        </div>
      ) : null}

      <SeniorsCard>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Search">
            <input
              className={INPUT}
              placeholder="Name, email, class or subject"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          <Field label="Status">
            <select
              className={INPUT}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </Field>
          <Field label="Role">
            <select
              className={INPUT}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            >
              <option value="all">All roles</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
            </select>
          </Field>
        </div>
      </SeniorsCard>

      {filtered.length === 0 ? (
        <SeniorsEmptyState
          title="No enquiries found"
          description="Student and teacher self-signups will appear here for approval."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-[#F9FAFB] text-left text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
              <tr>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Requested</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t border-[#E5E7EB]">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#111827]">{item.fullName}</p>
                    <p className="text-xs text-[#6B7280]">{item.email}</p>
                    {item.phone ? (
                      <p className="text-xs text-[#9CA3AF]">{item.phone}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 capitalize text-[#374151]">{item.role}</td>
                  <td className="px-4 py-3 text-[#4B5563]">
                    {item.role === "student"
                      ? item.requestedClassLabel || "Class not specified"
                      : item.requestedSubject || "Subject not specified"}
                  </td>
                  <td className="px-4 py-3">{statusPill(item.status)}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{formatDateTime(item.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {item.status === "pending" ? (
                      <button
                        type="button"
                        className={BTN_PRIMARY}
                        onClick={() => openReview(item)}
                      >
                        Review
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={BTN_GHOST}
                        onClick={() => openReview(item)}
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reviewing ? (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            className="absolute inset-0 bg-[#0F172A]/35 backdrop-blur-[1px]"
            aria-label="Close enquiry review"
            onClick={() => setReviewingId(null)}
          />
          <aside
            className="absolute right-0 top-0 flex h-full w-full max-w-[38rem] flex-col bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Review enquiry"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <UserRound className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-bold text-[#111827]">
                      {reviewing.fullName}
                    </h3>
                    {statusPill(reviewing.status)}
                  </div>
                  <p className="mt-0.5 text-sm capitalize text-[#64748B]">
                    {reviewing.role} application
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#F1F5F9]"
                aria-label="Close"
                onClick={() => setReviewingId(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
              <section>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-[#94A3B8]">
                  Applicant details
                </p>
                <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                    <InfoRow label="Email" value={reviewing.email} />
                    <InfoRow label="Phone" value={reviewing.phone || "Not provided"} />
                    {reviewing.role === "student" ? (
                      <>
                        <InfoRow
                          label="Requested class"
                          value={reviewing.requestedClassLabel || "Not specified"}
                        />
                        <InfoRow label="Roll number" value={reviewing.rollNumber || "—"} />
                      </>
                    ) : (
                      <InfoRow
                        label="Requested subject"
                        value={reviewing.requestedSubject || "Not specified"}
                      />
                    )}
                    <InfoRow label="Submitted" value={formatDateTime(reviewing.createdAt)} />
                  </div>
                </div>
              </section>

              {reviewing.status === "rejected" && reviewing.rejectionReason ? (
                <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#B91C1C]">
                    Rejection reason
                  </p>
                  <p className="mt-1 text-sm text-[#7F1D1D]">{reviewing.rejectionReason}</p>
                </div>
              ) : null}

              {reviewing.status === "pending" ? (
                <>
                  <section>
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-[#94A3B8]">
                      Access to assign
                    </p>
                    {reviewing.role === "student" ? (
                      <div className="grid gap-3 rounded-2xl border border-[#DBEAFE] bg-[#F8FAFF] p-4 sm:grid-cols-2">
                        <Field label="Confirm class">
                          <select
                            className={INPUT}
                            value={classId}
                            onChange={(e) => setClassId(e.target.value)}
                          >
                            {data.classes.map((klass) => (
                              <option key={klass.id} value={klass.id}>
                                {klass.name} {klass.section}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Roll number">
                          <input
                            className={INPUT}
                            value={rollNumber}
                            onChange={(e) => setRollNumber(e.target.value)}
                            placeholder="Optional"
                          />
                        </Field>
                      </div>
                    ) : (
                      <AssignmentPicker
                        classes={data.classes}
                        subjects={data.subjects}
                        value={assignments}
                        onChange={setAssignments}
                      />
                    )}
                  </section>

                  <section>
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-[#94A3B8]">
                      Reject request
                    </p>
                    <textarea
                      className={`${INPUT} min-h-24 resize-y`}
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Enter a clear reason before rejecting this application"
                    />
                  </section>
                </>
              ) : null}

              {error ? (
                <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">
                  {error}
                </p>
              ) : null}
              {message ? (
                <p className="rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 text-sm text-[#166534]">
                  {message}
                </p>
              ) : null}
            </div>

            <div className="border-t border-[#E5E7EB] bg-white px-5 py-4 sm:px-6">
              {reviewing.status === "pending" ? (
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#FECACA] bg-white px-4 py-2.5 text-sm font-semibold text-[#B91C1C] transition hover:bg-[#FEF2F2] disabled:opacity-50"
                    disabled={busy || !rejectionReason.trim()}
                    onClick={() => void reject()}
                  >
                    <XCircle className="h-4 w-4" />
                    Reject
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#15803D] disabled:opacity-50"
                    disabled={
                      busy ||
                      (reviewing.role === "student" ? !classId : assignments.length === 0)
                    }
                    onClick={() => void approve()}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {busy ? "Saving…" : "Approve & create account"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={`${BTN_GHOST} w-full justify-center py-2.5`}
                  onClick={() => setReviewingId(null)}
                >
                  Close
                </button>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-[#1E293B]">{value}</p>
    </div>
  );
}
