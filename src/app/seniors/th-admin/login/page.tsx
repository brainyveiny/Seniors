"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
  SENIORS_PRODUCT_ADMIN_HOME,
} from "@/shared/lib/seniors-platform-urls";

const INPUT =
  "mt-1 w-full rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-sm text-[#1F2937] placeholder:text-[#9CA3AF] focus:border-neutral-900 focus:outline-none";

function SeniorsProductAdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/super-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      const next = searchParams.get("next");
      const safeNext =
        next && next.startsWith("/seniors/th-admin/") ? next : SENIORS_PRODUCT_ADMIN_HOME;
      router.push(safeNext);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
          <Link href="/seniors" className="text-sm font-semibold text-neutral-900">
            ← Seniors
          </Link>
          <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">
            Product admin
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-neutral-900">Seniors admin</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Platform login for the Seniors product -above individual schools. Use your
            super-admin credentials.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block text-sm">
              <span className="font-medium text-neutral-700">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT}
                autoComplete="username"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-neutral-700">Password</span>
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT}
                autoComplete="current-password"
              />
            </label>
            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Login to Seniors admin"}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-neutral-500">
            School login is separate →{" "}
            <Link href="/seniors/login/school" className="font-medium text-neutral-800 underline">
              /seniors/login/school
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function SeniorsProductAdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50" />}>
      <SeniorsProductAdminLoginForm />
    </Suspense>
  );
}
