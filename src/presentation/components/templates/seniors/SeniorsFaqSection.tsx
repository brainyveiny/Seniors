"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { SeniorsMediaImage } from "@/presentation/components/templates/seniors/shared/SeniorsMediaImage";

export type SeniorsFaqItem = {
  question: string;
  answer: string;
};

export function SeniorsFaqSection({
  titleBefore = "Frequently asked",
  titleHighlight = "questions",
  imageUrl = "/assets/seniors/faq.png",
  items,
}: {
  titleBefore?: string;
  titleHighlight?: string;
  imageUrl?: string;
  items: SeniorsFaqItem[];
}) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="bg-white pt-20 pb-10 sm:pt-24 sm:pb-12">
      <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6">
        <h2 className="mx-auto max-w-3xl text-center text-2xl font-bold leading-tight text-[#0F172A] sm:text-3xl lg:text-[2.15rem]">
          {titleBefore}{" "}
          <span className="text-[#38BDF8]">{titleHighlight}</span>
        </h2>

        <div className="mt-10 grid items-center gap-10 lg:mt-12 lg:grid-cols-2 lg:gap-14">
          <div className="relative mx-auto w-full max-w-xs sm:max-w-sm">
            <SeniorsMediaImage
              src={imageUrl}
              alt=""
              width={420}
              height={480}
              sizes="(max-width: 640px) 80vw, 384px"
              className="h-auto w-full object-contain drop-shadow-[0_18px_40px_rgba(37,99,235,0.12)]"
              draggable={false}
            />
          </div>

          <div className="space-y-3">
            {items.map((item, i) => {
              const open = openIndex === i;
              return (
                <div
                  key={item.question}
                  className={cn(
                    "overflow-hidden rounded-2xl border transition",
                    open
                      ? "border-[#BFDBFE] bg-[#F0F7FF] shadow-[0_8px_24px_rgba(37,99,235,0.08)]"
                      : "border-[#E2E8F0] bg-white",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? -1 : i)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-5"
                    aria-expanded={open}
                  >
                    <span className="text-sm font-semibold text-[#0F172A] sm:text-[0.95rem]">
                      {item.question}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-[#38BDF8] transition-transform duration-200",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-200",
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-4 pb-4 text-sm leading-relaxed text-[#64748B] sm:px-5">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
