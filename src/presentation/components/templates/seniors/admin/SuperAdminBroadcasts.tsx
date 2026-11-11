"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { PlatformBroadcast } from "@/application/seniors/seniors-product-admin";
import { cn } from "@/shared/lib/utils";
import { saRequest } from "./super-admin-api";
import {
  SA_BTN_PRIMARY,
  SA_INPUT,
  SA_LABEL,
  SaCard,
  SaNotice,
  formatRelativeTime,
} from "./SuperAdminUi";

const ROLES = [
  { id: "student", label: "Students" },
  { id: "teacher", label: "Teachers" },
  { id: "parent", label: "Parents" },
] as const;

export function SuperAdminBroadcasts({
  schools,
  initialBroadcasts,
}: {
  schools: { id: string; name: string; slug: string }[];
  initialBroadcasts: PlatformBroadcast[];
}) {
  const [broadcasts, setBroadcasts] = useState(initialBroadcasts);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [roles, setRoles] = useState<string[]>(["student", "teacher", "parent"]);
  const [scope, setScope] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const count = scope === "all" ? schools.length : selected.length;
    if (!window.confirm(`Send this announcement to ${count} school${count === 1 ? "" : "s"}?`)) return;
    setSending(true);
    setError("");
    setMessage("");
    try {
      const json = await saRequest<{ schoolCount: number; broadcasts: PlatformBroadcast[] }>(
        "/api/seniors/super-admin/announcements",
        {
          method: "POST",
          body: { title, body, audienceRoles: roles, schools: scope === "all" ? "all" : selected },
        },
      );
      setBroadcasts(json.broadcasts);
      setMessage(`Sent to ${json.schoolCount} school${json.schoolCount === 1 ? "" : "s"}.`);
      setTitle("");
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <SaCard
        title="New broadcast"
        description="Posts an announcement, signed “Seniors Team”, in every chosen school's panels."
      >
        <form onSubmit={send} className="space-y-4">
          <label className="block">
            <span className={SA_LABEL}>Title</span>
            <input
              required
              maxLength={200}
              className={SA_INPUT}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled maintenance on Sunday"
            />
          </label>
          <label className="block">
            <span className={SA_LABEL}>Message</span>
            <textarea
              required
              rows={5}
              className={SA_INPUT}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>

          <div>
            <span className={SA_LABEL}>Who should see it</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <label
                  key={role.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm",
                    roles.includes(role.id) ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-700",
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={roles.includes(role.id)}
                    onChange={() => setRoles(toggle(roles, role.id))}
                  />
                  {role.label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-neutral-500">School admins always see school announcements.</p>
          </div>

          <div>
            <span className={SA_LABEL}>Schools</span>
            <div className="mt-2 flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" checked={scope === "all"} onChange={() => setScope("all")} />
                All active schools ({schools.length})
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={scope === "selected"} onChange={() => setScope("selected")} />
                Choose schools
              </label>
            </div>
            {scope === "selected" ? (
              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 p-2">
                {schools.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-neutral-50">
                    <input
                      type="checkbox"
                      checked={selected.includes(s.id)}
                      onChange={() => setSelected(toggle(selected, s.id))}
                    />
                    <span className="text-neutral-900">{s.name}</span>
                    <span className="text-xs text-neutral-400">{s.slug}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          {error ? <SaNotice tone="error">{error}</SaNotice> : null}
          {message ? <SaNotice tone="success">{message}</SaNotice> : null}
          <button
            type="submit"
            className={SA_BTN_PRIMARY}
            disabled={sending || roles.length === 0 || (scope === "selected" && selected.length === 0)}
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending…" : "Send broadcast"}
          </button>
        </form>
      </SaCard>

      <SaCard title="Sent broadcasts" bodyClassName="p-0">
        {broadcasts.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-500">Nothing sent yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {broadcasts.map((b) => (
              <li key={b.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-neutral-900">{b.title}</p>
                  <span className="shrink-0 text-xs text-neutral-400" suppressHydrationWarning>
                    {formatRelativeTime(b.createdAt)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-3 whitespace-pre-line text-sm text-neutral-600">{b.body}</p>
                <p className="mt-2 text-xs text-neutral-500">
                  {b.schoolCount} school{b.schoolCount === 1 ? "" : "s"} ·{" "}
                  {b.audienceRoles.length === 3
                    ? "Everyone"
                    : b.audienceRoles.map((r) => `${r[0]!.toUpperCase()}${r.slice(1)}s`).join(", ")}{" "}
                  · {b.actorEmail}
                </p>
              </li>
            ))}
          </ul>
        )}
      </SaCard>
    </div>
  );
}
