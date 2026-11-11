"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Megaphone,
} from "lucide-react";
import type { SeniorsAudienceId } from "@/shared/config/seniors-audiences";
import { cn } from "@/shared/lib/utils";

/** Interactive mock portals -no login required (marketing live demos). */

export function SeniorsAudienceLiveDemo({ role }: { role: SeniorsAudienceId }) {
  if (role === "student") return <StudentDemo />;
  if (role === "teacher") return <TeacherDemo />;
  if (role === "parent") return <ParentDemo />;
  return <SchoolDemo />;
}

function DemoFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] shadow-sm">
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] bg-white px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#F87171]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]" />
        <span className="ml-2 text-xs font-medium text-[#6B7280]">{title}</span>
        <span className="ml-auto rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#059669]">
          Live demo
        </span>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function StudentDemo() {
  const [tab, setTab] = useState<"home" | "topic" | "quiz">("home");
  const [answer, setAnswer] = useState<number | null>(null);
  const [score, setScore] = useState<number | null>(null);

  return (
    <DemoFrame title="Student portal -Greenwood High (demo)">
      <div className="mb-4 flex gap-2">
        {(
          [
            ["home", "Home"],
            ["topic", "Topic"],
            ["quiz", "Quiz"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id);
              setScore(null);
              setAnswer(null);
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold",
              tab === id ? "bg-[#2563EB] text-white" : "bg-white text-[#374151] border border-[#E5E7EB]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "home" ? (
        <div className="space-y-3">
          <p className="text-lg font-bold text-[#111827]">Good evening, Ananya 👋</p>
          <p className="text-sm text-[#6B7280]">Class 10-A • Greenwood High School</p>
          <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#B91C1C]">
              Continue learning
            </p>
            <p className="mt-1 font-semibold text-[#111827]">Overdue homework -Periodic Classification</p>
            <p className="mt-1 text-sm text-[#6B7280]">Science • Chapter 5 • 2 questions</p>
            <button
              type="button"
              className="mt-3 rounded-lg bg-[#DC2626] px-3 py-1.5 text-xs font-bold text-white"
              onClick={() => setTab("topic")}
            >
              Open now
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Progress", value: "78%" },
              { label: "Topics done", value: "56/72" },
              { label: "Quiz avg", value: "82%" },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                <p className="text-xs text-[#6B7280]">{k.label}</p>
                <p className="mt-1 text-xl font-bold text-[#111827]">{k.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "topic" ? (
        <div className="space-y-3">
          <p className="text-xs text-[#6B7280]">Science / Chapter 4 / Carbon Compounds</p>
          <p className="text-xl font-bold text-[#111827]">4.1 Covalent Bonding</p>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-sm font-bold">Learning objective</p>
            <p className="mt-1 text-sm text-[#4B5563]">
              Explain covalent bonding using school marking keywords and diagram expectations.
            </p>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-sm font-bold">School notes</p>
            <p className="mt-2 text-sm text-[#4B5563]">
              Carbon shares electrons to form covalent bonds. Write answers in points with examples
              as practised in class…
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-[#2563EB] px-3 py-2 text-xs font-bold text-white"
            onClick={() => setTab("quiz")}
          >
            Try topic quiz
          </button>
        </div>
      ) : null}

      {tab === "quiz" ? (
        <div className="space-y-3">
          <p className="font-bold text-[#111827]">Chapter Quiz</p>
          <p className="text-sm text-[#4B5563]">
            Which of the following is a saturated hydrocarbon?
          </p>
          {["Ethene", "Ethyne", "Ethane", "Benzene"].map((opt, i) => (
            <button
              key={opt}
              type="button"
              onClick={() => setAnswer(i)}
              className={cn(
                "block w-full rounded-lg border px-3 py-2 text-left text-sm",
                answer === i
                  ? "border-[#2563EB] bg-[#EFF6FF] font-semibold text-[#1D4ED8]"
                  : "border-[#E5E7EB] bg-white text-[#374151]",
              )}
            >
              {opt}
            </button>
          ))}
          {score == null ? (
            <button
              type="button"
              disabled={answer == null}
              onClick={() => setScore(answer === 2 ? 1 : 0)}
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              Submit answer
            </button>
          ) : (
            <p className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-sm font-semibold text-[#15803D]">
              {score === 1 ? "Correct -Ethane ✓" : "Not quite -correct answer is Ethane"}
            </p>
          )}
        </div>
      ) : null}
    </DemoFrame>
  );
}

function TeacherDemo() {
  const [step, setStep] = useState<"dash" | "assign" | "grade">("dash");
  const [graded, setGraded] = useState(false);

  return (
    <DemoFrame title="Teacher portal -Mrs. Sharma (demo)">
      <div className="mb-4 flex gap-2">
        {(
          [
            ["dash", "Dashboard"],
            ["assign", "New assignment"],
            ["grade", "Grade"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setStep(id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold",
              step === id ? "bg-[#16A34A] text-white" : "border border-[#E5E7EB] bg-white text-[#374151]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {step === "dash" ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Classes", value: "4" },
              { label: "Students", value: "128" },
              { label: "To review", value: "8" },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                <p className="text-xs text-[#6B7280]">{k.label}</p>
                <p className="mt-1 text-xl font-bold">{k.value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-4">
            <p className="text-sm font-bold">Content status -Science</p>
            <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
              <div className="w-[65%] bg-[#16A34A]" />
              <div className="w-[20%] bg-[#EAB308]" />
              <div className="w-[15%] bg-[#DC2626]" />
            </div>
            <p className="mt-2 text-xs text-[#6B7280]">65% complete · 20% in progress · 15% missing</p>
          </div>
        </div>
      ) : null}

      {step === "assign" ? (
        <div className="space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="font-bold">New Assignment</p>
          <input
            readOnly
            value="Periodic Classification of Elements"
            className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
          />
          <input
            readOnly
            value="Science · Chapter 5"
            className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm"
          />
          <button
            type="button"
            className="rounded-lg bg-[#16A34A] px-4 py-2 text-sm font-bold text-white"
            onClick={() => setStep("grade")}
          >
            Publish (demo)
          </button>
        </div>
      ) : null}

      {step === "grade" ? (
        <div className="space-y-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="font-bold">Submission -Ananya Sharma</p>
          <p className="rounded-lg bg-[#F9FAFB] p-3 text-sm text-[#4B5563]">
            1. Metals are placed on the left… 2. Atomic size decreases across a period…
          </p>
          {!graded ? (
            <button
              type="button"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-bold text-white"
              onClick={() => setGraded(true)}
            >
              Mark 8/10
            </button>
          ) : (
            <p className="flex items-center gap-2 text-sm font-semibold text-[#16A34A]">
              <CheckCircle2 className="h-4 w-4" /> Graded -8/10 saved
            </p>
          )}
        </div>
      ) : null}
    </DemoFrame>
  );
}

function ParentDemo() {
  const [child, setChild] = useState("Ananya");

  return (
    <DemoFrame title="Parent portal -Rahul Verma (demo)">
      <div className="mb-4 flex gap-2">
        {["Ananya", "Arjun"].map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setChild(name)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium",
              child === name
                ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
                : "border-[#E5E7EB] bg-white text-[#374151]",
            )}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#E5E7EB] bg-white p-4">
          <p className="text-3xl font-bold text-[#111827]">{child === "Ananya" ? "78%" : "64%"}</p>
          <p className="mt-1 text-xs text-[#6B7280]">Overall progress</p>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-[#EA580C]" />
            <div>
              <p className="text-sm font-medium">
                {child === "Ananya" ? "Overdue: Periodic Classification" : "Due soon: Fractions HW"}
              </p>
              <p className="text-xs text-[#6B7280]">Science • was due 4 days ago</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-[#E5E7EB] bg-white p-3">
            <Calendar className="mt-0.5 h-4 w-4 text-[#2563EB]" />
            <div>
              <p className="text-sm font-medium">Science Unit Test</p>
              <p className="text-xs text-[#6B7280]">5 days left</p>
            </div>
          </div>
          <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
            <p className="text-xs font-semibold text-[#6B7280]">Science</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E5E7EB]">
              <div
                className="h-full rounded-full bg-[#2563EB]"
                style={{ width: child === "Ananya" ? "75%" : "55%" }}
              />
            </div>
          </div>
        </div>
      </div>
    </DemoFrame>
  );
}

function SchoolDemo() {
  const [tab, setTab] = useState<"overview" | "roster" | "content">("overview");

  return (
    <DemoFrame title="School admin -Greenwood High (demo)">
      <div className="mb-4 flex gap-2">
        {(
          [
            ["overview", "Overview"],
            ["roster", "Roster"],
            ["content", "Content"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold",
              tab === id ? "bg-[#DC2626] text-white" : "border border-[#E5E7EB] bg-white text-[#374151]",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: "Students", value: "1,245", icon: BookOpen },
            { label: "Teachers", value: "78", icon: ClipboardList },
            { label: "Parent adoption", value: "72%", icon: Megaphone },
            { label: "Content complete", value: "51%", icon: CheckCircle2 },
          ].map((k) => (
            <div key={k.label} className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-4">
              <k.icon className="h-5 w-5 text-[#2563EB]" />
              <div>
                <p className="text-xs text-[#6B7280]">{k.label}</p>
                <p className="text-xl font-bold">{k.value}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {tab === "roster" ? (
        <div className="overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F9FAFB] text-xs uppercase text-[#6B7280]">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Mrs. Sharma", "Teacher"],
                ["Ananya Sharma", "Student"],
                ["Rahul Verma", "Parent"],
              ].map(([name, role]) => (
                <tr key={name} className="border-t border-[#E5E7EB]">
                  <td className="px-3 py-2 font-medium">{name}</td>
                  <td className="px-3 py-2 text-[#6B7280]">{role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "content" ? (
        <div className="space-y-2">
          {[
            { title: "4.1 Covalent Bonding", status: "complete", color: "text-[#15803D] bg-[#F0FDF4]" },
            { title: "4.3 Homologous Series", status: "in progress", color: "text-[#A16207] bg-[#FEF9C3]" },
            { title: "5.2 Trends in Periodic Table", status: "missing", color: "text-[#B91C1C] bg-[#FEF2F2]" },
          ].map((t) => (
            <div
              key={t.title}
              className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-4 py-3"
            >
              <p className="text-sm font-medium">{t.title}</p>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", t.color)}>
                {t.status}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </DemoFrame>
  );
}
