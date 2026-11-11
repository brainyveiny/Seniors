import { ShieldAlert } from "lucide-react";
import { resolveAcademyImageUrl } from "@/shared/lib/academy-media-url";

export function SeniorsSchoolSuspended({
  schoolName,
  logoUrl,
  brandHex,
  reason,
}: {
  schoolName: string;
  logoUrl: string;
  brandHex: string;
  reason: string;
}) {
  const logo = resolveAcademyImageUrl(logoUrl);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={schoolName} className="h-full w-full object-contain p-1.5" />
          ) : (
            <span
              className="flex h-full w-full items-center justify-center text-2xl font-bold text-white"
              style={{ backgroundColor: brandHex }}
            >
              {(schoolName.trim()[0] || "S").toUpperCase()}
            </span>
          )}
        </div>
        <h1 className="text-xl font-semibold text-[#111827]">{schoolName}</h1>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#FEF2F2] px-3 py-1 text-sm font-medium text-[#B91C1C]">
          <ShieldAlert className="h-4 w-4" />
          Access temporarily suspended
        </div>
        <p className="mt-4 text-sm leading-relaxed text-[#6B7280]">
          This school&apos;s Seniors portal is currently unavailable. Students, parents and staff
          cannot sign in until access is restored.
        </p>
        {reason.trim() ? (
          <p className="mt-3 rounded-lg bg-[#F9FAFB] px-3 py-2 text-sm text-[#374151]">{reason}</p>
        ) : null}
        <p className="mt-5 text-xs text-[#9CA3AF]">
          School administrators can contact Seniors support to restore access.
        </p>
      </div>
    </div>
  );
}
