"use client";

import Link from "next/link";
import { SENIORS_AUDIENCE_NAV } from "@/shared/config/seniors-audiences";

const PAGE_LINKS = [
  { id: "features", label: "Features" },
  { id: "ai-doubts", label: "AI Doubts" },
  { id: "how-it-works", label: "How it works" },
  { id: "faq", label: "FAQs" },
  { id: "demo-booking", label: "Book demo" },
] as const;

export function SeniorsLandingFooter({
  brand,
  tagline,
  homeHref,
  loginLinks,
  phone,
}: {
  brand: string;
  tagline: string;
  homeHref: string;
  loginLinks: { label: string; href: string }[];
  phone?: string;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#DBEAFE] bg-[#0F172A] text-white">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-12 sm:px-6 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href={homeHref} className="inline-flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] text-sm font-black text-white">
                S
              </span>
              <span className="text-base font-extrabold tracking-wide">SENIORS</span>
            </Link>
            {tagline ? (
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-300">{tagline}</p>
            ) : null}
            {phone ? (
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="mt-4 inline-block text-sm font-semibold text-[#7DD3FC] hover:text-[#38BDF8]"
              >
                {phone}
              </a>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#38BDF8]">Explore</p>
            <ul className="mt-3 space-y-2">
              {PAGE_LINKS.map((link) => (
                <li key={link.id}>
                  <a
                    href={`#${link.id}`}
                    className="text-sm text-slate-300 transition hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#38BDF8]">For</p>
            <ul className="mt-3 space-y-2">
              {SENIORS_AUDIENCE_NAV.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-300 transition hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#38BDF8]">Login</p>
            <ul className="mt-3 space-y-2">
              {loginLinks.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-slate-300 transition hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            © {year} {brand}. All rights reserved.
          </p>
          <a
            href="#demo-booking"
            className="text-xs font-semibold text-[#38BDF8] hover:text-[#7DD3FC]"
          >
            Book a demo
          </a>
        </div>
      </div>
    </footer>
  );
}
