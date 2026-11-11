"use client";

import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Home,
  Play,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";

const NAV = [
  { id: "home", icon: Home, label: "Home" },
  { id: "learn", icon: BookOpen, label: "Learn" },
  { id: "classwork", icon: ClipboardList, label: "Classwork" },
  { id: "timetable", icon: CalendarDays, label: "Timetable" },
] as const;

type ScreenId = (typeof NAV)[number]["id"] | "lesson";

const FLOW: ScreenId[] = ["home", "learn", "lesson", "classwork", "timetable"];

function HomeScreen() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-1">
        <div>
          <p className="text-[11px] font-bold text-[#0F172A]">Good evening, Ananya</p>
          <p className="text-[7px] text-[#64748B]">School-aligned learning for today</p>
        </div>
        <span className="inline-flex items-center gap-0.5 rounded-full bg-[#ECFDF5] px-1.5 py-0.5 text-[6px] font-bold text-[#059669]">
          <Sparkles className="h-2 w-2" />
          Live
        </span>
      </div>

      <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] p-1.5">
        <p className="text-[6px] font-bold uppercase tracking-wide text-[#B91C1C]">
          Continue learning
        </p>
        <p className="mt-0.5 text-[8px] font-semibold text-[#0F172A]">
          Periodic Classification
        </p>
        <p className="text-[6px] text-[#64748B]">Science · Chapter 5 · Due today</p>
        <div className="mt-1 inline-flex rounded bg-[#DC2626] px-1.5 py-0.5 text-[6px] font-bold text-white">
          Open now
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1">
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-1.5">
          <p className="text-[6px] font-semibold text-[#64748B]">Progress</p>
          <p className="text-[12px] font-bold text-[#2563EB]">78%</p>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#E2E8F0]">
            <div className="h-full w-[78%] rounded-full bg-[#2563EB]" />
          </div>
        </div>
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-1.5">
          <p className="text-[6px] font-semibold text-[#64748B]">Next class</p>
          <p className="text-[8px] font-bold text-[#0F172A]">Maths</p>
          <p className="text-[6px] text-[#64748B]">09:00 · Room A1</p>
        </div>
      </div>

      <div className="rounded-lg border border-[#E2E8F0] bg-white p-1.5">
        <p className="text-[6px] font-semibold text-[#64748B]">Today&apos;s timetable</p>
        <div className="mt-1 space-y-0.5">
          {[
            ["08:00", "English"],
            ["09:00", "Maths"],
            ["10:00", "Science"],
          ].map(([time, subject]) => (
            <div
              key={time}
              className="flex items-center justify-between rounded bg-[#F8FAFC] px-1 py-0.5"
            >
              <span className="text-[6px] font-medium text-[#64748B]">{time}</span>
              <span className="text-[7px] font-semibold text-[#0F172A]">{subject}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LearnScreen({ highlightChapter }: { highlightChapter?: boolean }) {
  const chapters = [
    { title: "Chemical Reactions", done: true },
    { title: "Periodic Classification", done: false, active: true },
    { title: "Carbon Compounds", done: false },
  ];
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-[11px] font-bold text-[#0F172A]">Learn</p>
        <p className="text-[7px] text-[#64748B]">Science · Class 10 · School notes</p>
      </div>
      <div className="flex gap-1">
        {["Science", "Maths", "English"].map((s, i) => (
          <span
            key={s}
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[6px] font-semibold",
              i === 0 ? "bg-[#2563EB] text-white" : "bg-[#F1F5F9] text-[#64748B]",
            )}
          >
            {s}
          </span>
        ))}
      </div>
      <div className="space-y-1">
        {chapters.map((ch) => (
          <div
            key={ch.title}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border bg-white p-1.5 transition-all duration-300",
              ch.active && highlightChapter
                ? "scale-[1.02] border-[#2563EB] bg-[#EFF6FF] shadow-sm"
                : ch.active
                  ? "border-[#BFDBFE]"
                  : "border-[#E2E8F0]",
            )}
          >
            {ch.done ? (
              <CheckCircle2 className="h-3 w-3 shrink-0 text-[#059669]" />
            ) : (
              <Play className="h-3 w-3 shrink-0 text-[#2563EB]" fill="currentColor" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[7px] font-semibold text-[#0F172A]">{ch.title}</p>
              <p className="text-[6px] text-[#94A3B8]">
                {ch.done ? "Completed" : ch.active ? "In progress · Open" : "Locked until taught"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LessonScreen() {
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-[6px] font-semibold text-[#2563EB]">Science · Ch 5</p>
        <p className="text-[10px] font-bold text-[#0F172A]">Periodic Classification</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white">
        <div className="flex h-12 items-center justify-center bg-gradient-to-br from-[#DBEAFE] to-[#EFF6FF]">
          <Play className="h-5 w-5 text-[#2563EB]" fill="currentColor" />
        </div>
        <div className="space-y-1 p-1.5">
          <p className="text-[7px] font-semibold text-[#0F172A]">School notes · Video + PDF</p>
          <p className="text-[6px] leading-snug text-[#64748B]">
            Mendeleev&apos;s table → modern periodic law → groups &amp; periods
          </p>
          <div className="h-1 overflow-hidden rounded-full bg-[#E2E8F0]">
            <div className="h-full w-[42%] animate-[seniors-progress_2.4s_ease-out_forwards] rounded-full bg-[#2563EB]" />
          </div>
          <p className="text-[6px] text-[#94A3B8]">Watching · 4:12 / 10:05</p>
        </div>
      </div>
      <div className="rounded-lg border border-[#FEF3C7] bg-[#FFFBEB] px-1.5 py-1">
        <p className="text-[6px] font-bold text-[#B45309]">Doubt? Ask AI with school context</p>
      </div>
    </div>
  );
}

function ClassworkScreen() {
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-[11px] font-bold text-[#0F172A]">Classwork</p>
        <p className="text-[7px] text-[#64748B]">Assigned by your teachers</p>
      </div>
      {[
        { title: "Worksheet -Periodicity", due: "Due today", urgent: true },
        { title: "Maths HW · Ex 4.2", due: "Due Fri", urgent: false },
        { title: "English paragraph", due: "Submitted", urgent: false },
      ].map((item) => (
        <div
          key={item.title}
          className={cn(
            "rounded-lg border bg-white p-1.5",
            item.urgent ? "border-[#FECACA] bg-[#FEF2F2]" : "border-[#E2E8F0]",
          )}
        >
          <p className="text-[7px] font-semibold text-[#0F172A]">{item.title}</p>
          <p className={cn("text-[6px]", item.urgent ? "text-[#B91C1C]" : "text-[#64748B]")}>
            {item.due}
          </p>
        </div>
      ))}
    </div>
  );
}

function TimetableScreen() {
  return (
    <div className="space-y-1.5">
      <div>
        <p className="text-[11px] font-bold text-[#0F172A]">Timetable</p>
        <p className="text-[7px] text-[#64748B]">Synced from school</p>
      </div>
      {[
        ["08:00", "English", "Room B2"],
        ["09:00", "Maths", "Room A1"],
        ["10:00", "Science", "Lab 2"],
        ["11:00", "Break", "—"],
        ["11:30", "SST", "Room C3"],
      ].map(([time, subject, room], i) => (
        <div
          key={time}
          className={cn(
            "flex items-center justify-between rounded-lg border px-1.5 py-1",
            i === 1 ? "border-[#2563EB] bg-[#EFF6FF]" : "border-[#E2E8F0] bg-white",
          )}
        >
          <div>
            <p className="text-[7px] font-semibold text-[#0F172A]">{subject}</p>
            <p className="text-[6px] text-[#94A3B8]">{room}</p>
          </div>
          <span className="text-[6px] font-medium text-[#64748B]">{time}</span>
        </div>
      ))}
    </div>
  );
}

/** Animated mini-dashboard for laptop mockup overlays (Framer landing + product glimpse). */
export function SeniorsScreenGlimpse() {
  const [step, setStep] = useState(0);
  const [entering, setEntering] = useState(true);
  const screen = FLOW[step] ?? "home";
  const navActive =
    screen === "lesson" ? "learn" : screen === "home" ? "home" : (screen as (typeof NAV)[number]["id"]);

  useEffect(() => {
    let timeoutId: number | undefined;
    const id = window.setInterval(() => {
      setEntering(false);
      timeoutId = window.setTimeout(() => {
        setStep((s) => (s + 1) % FLOW.length);
        setEntering(true);
      }, 220);
    }, 2800);
    return () => {
      window.clearInterval(id);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[#F8FAFC] text-[10px] leading-tight text-[#0F172A]">
      <style>{`
        @keyframes seniors-progress {
          from { width: 8%; }
          to { width: 42%; }
        }
        @keyframes seniors-cursor {
          0%, 100% { opacity: 0.2; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <aside className="flex w-[28%] shrink-0 flex-col border-r border-[#E2E8F0] bg-white px-1.5 py-2">
        <div className="mb-2 flex items-center gap-1 px-1">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-[#2563EB] text-[7px] font-black text-white">
            S
          </span>
          <span className="truncate text-[9px] font-extrabold tracking-wide text-[#2563EB]">
            SENIORS
          </span>
        </div>
        <nav className="space-y-0.5">
          {NAV.map((item) => {
            const active = item.id === navActive;
            const aboutToOpen = screen === "home" && item.id === "learn";
            return (
              <div
                key={item.id}
                className={cn(
                  "relative flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors duration-300",
                  active ? "bg-[#EFF6FF] text-[#2563EB]" : "text-[#64748B]",
                  aboutToOpen && "ring-1 ring-[#93C5FD]",
                )}
              >
                <item.icon className="h-2.5 w-2.5 shrink-0" strokeWidth={2.2} />
                <span className="truncate text-[8px] font-semibold">{item.label}</span>
                {aboutToOpen ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[#2563EB] animate-[seniors-cursor_1s_ease-in-out_infinite]"
                    aria-hidden
                  />
                ) : null}
              </div>
            );
          })}
        </nav>
        <div className="mt-auto rounded-md bg-[#F1F5F9] px-1.5 py-1">
          <p className="text-[7px] font-semibold text-[#475569]">Ananya · 10-A</p>
          <p className="text-[6px] text-[#94A3B8]">Greenwood High</p>
        </div>
      </aside>

      <div
        className={cn(
          "min-w-0 flex-1 overflow-hidden p-2 transition-all duration-300",
          entering ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0",
        )}
      >
        {screen === "home" ? <HomeScreen /> : null}
        {screen === "learn" ? <LearnScreen highlightChapter /> : null}
        {screen === "lesson" ? <LessonScreen /> : null}
        {screen === "classwork" ? <ClassworkScreen /> : null}
        {screen === "timetable" ? <TimetableScreen /> : null}
      </div>
    </div>
  );
}
