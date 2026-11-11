export function SeniorsContentSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 py-16">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[#E5E7EB] border-t-[var(--sp-brand)]"
        aria-hidden
      />
      <p className="text-sm text-[#6B7280]">{label}</p>
    </div>
  );
}
