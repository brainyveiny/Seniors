export async function saRequest<T>(
  url: string,
  init: { method: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown } = { method: "GET" },
): Promise<T> {
  const res = await fetch(url, {
    method: init.method,
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

export function schoolApi(schoolId: string, suffix = "") {
  return `/api/seniors/super-admin/schools/${schoolId}${suffix}`;
}
