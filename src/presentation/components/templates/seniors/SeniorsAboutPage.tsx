"use client";

import Link from "next/link";
import { SeniorsBrandMark } from "./SeniorsBrandMark";

const PAGE_BG =
  "linear-gradient(180deg, #ffffff 0%, #fff9f2 45%, #ffe8f0 100%)";

export function SeniorsAboutPage() {
  return (
    <div className="min-h-[100dvh] w-full" style={{ background: PAGE_BG }}>
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/seniors" className="no-underline">
          <SeniorsBrandMark />
        </Link>
        <Link
          href="/seniors"
          className="text-sm font-medium text-[#475569] no-underline hover:text-[#0F172A]"
        >
          Back to home
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16 pt-4">
        <h1 className="text-4xl font-bold tracking-tight text-[#0F172A] sm:text-5xl">
          About Seniors
        </h1>
        <p className="mt-3 text-lg text-[#64748B]">
          A digital campus built around how your school actually teaches.
        </p>

        <div className="mt-10 space-y-6 text-base leading-relaxed text-[#334155]">
          <p>
            <strong className="text-[#0F172A]">Seniors</strong> is a school learning
            platform where every student gets a personalized experience — shaped by their
            school&apos;s notes, question patterns, marking style, and academic calendar.
            Not a generic app. Your school&apos;s way of learning, online.
          </p>
          <p>
            Teachers upload classwork and study material in one place. Students revise with
            content that matches what they see in class and in exams. Parents get clear
            visibility into attendance, assignments, and test scores — without chasing
            updates on WhatsApp.
          </p>
          <p>
            We partner with schools across India to build digital campuses that respect
            each institution&apos;s teaching methodology. Our goal is straightforward:
            help students learn the way their school teaches, and give teachers tools that
            save time instead of adding more work.
          </p>
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            href="/seniors/login"
            className="inline-flex items-center justify-center rounded-full bg-[#0F172A] px-6 py-3 text-sm font-semibold text-white no-underline hover:bg-[#1e293b]"
          >
            Get Started
          </Link>
          <Link
            href="/seniors#contact"
            className="inline-flex items-center justify-center rounded-full border border-[#CBD5E1] bg-white px-6 py-3 text-sm font-semibold text-[#0F172A] no-underline hover:bg-[#F8FAFC]"
          >
            Contact us
          </Link>
        </div>
      </main>
    </div>
  );
}
