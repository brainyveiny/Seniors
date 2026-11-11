/** Minimal chrome for laptop mockup iframe embeds. */

export default function ScreenGlimpseLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 m-0 overflow-hidden p-0">{children}</div>;
}
