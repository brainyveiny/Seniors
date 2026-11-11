"use client";

import { useRouter } from "next/navigation";
import type { SiteContext } from "@/application/hooks/use-site-context";
import { SeniorsHeaderActions } from "@/presentation/components/templates/seniors/shared/SeniorsHeaderActions";
import { SeniorsCard } from "@/presentation/components/templates/seniors/shared/SeniorsUi";

export type ParentChildOption = {
  id: string;
  name: string;
  className: string;
};

export function ParentChildShell({
  ctx,
  title,
  sessionName,
  children,
  activeChildId,
  childOptions,
  basePath,
}: {
  ctx: SiteContext;
  title: string;
  sessionName: string;
  children: React.ReactNode;
  activeChildId?: string | null;
  childOptions: ParentChildOption[];
  basePath: string;
}) {
  const router = useRouter();
  const activeId = activeChildId ?? childOptions[0]?.id;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[24px] font-bold leading-tight tracking-tight text-[#111827]">
          {title}
        </h2>
        <div className="flex items-center gap-3">
          {childOptions.length > 1 ? (
            <select
              className="rounded-full border border-[#E5E7EB] bg-white px-3.5 py-2 text-sm font-medium text-[#374151] shadow-sm"
              value={activeId ?? ""}
              onChange={(e) => {
                const id = e.target.value;
                router.push(ctx.sitePath(`${basePath}?child=${id}`));
              }}
            >
              {childOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.className})
                </option>
              ))}
            </select>
          ) : childOptions[0] ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-3.5 py-2 text-sm font-medium text-[#374151] shadow-sm">
              {childOptions[0].name} ({childOptions[0].className})
            </span>
          ) : null}
          <SeniorsHeaderActions ctx={ctx} role="parent" displayName={sessionName} />
        </div>
      </div>

      {childOptions.length === 0 ? (
        <SeniorsCard className="p-5">
          <p className="font-semibold text-[#111827]">No linked children</p>
          <p className="mt-1 text-sm text-[#6B7280]">
            Ask the school admin to link your account to a student.
          </p>
        </SeniorsCard>
      ) : (
        children
      )}
    </div>
  );
}
