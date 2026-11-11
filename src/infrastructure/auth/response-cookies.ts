type SameSite = "lax" | "strict" | "none";

export type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: SameSite;
  path?: string;
  maxAge?: number;
  expires?: Date;
};

function serializeCookie(
  name: string,
  value: string,
  opts: CookieOptions,
): string {
  const parts: string[] = [];
  parts.push(`${name}=${value}`);

  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.secure) parts.push("Secure");
  if (opts.sameSite) parts.push(`SameSite=${capitalizeSameSite(opts.sameSite)}`);
  if (typeof opts.maxAge === "number") parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);

  return parts.join("; ");
}

function capitalizeSameSite(v: SameSite): string {
  if (v === "lax") return "Lax";
  if (v === "strict") return "Strict";
  return "None";
}

/**
 * Next.js 16 "proxy" runtime can return a Response-like object without `.cookies`.
 * This helper sets cookies via `.cookies.set` when available, otherwise via `Set-Cookie` header.
 */
export function setCookieOnResponse(
  response: { headers: Headers; cookies?: { set: (name: string, value: string, opts: CookieOptions) => void } },
  name: string,
  value: string,
  opts: CookieOptions,
) {
  if (response.cookies?.set) {
    response.cookies.set(name, value, opts);
    return;
  }
  response.headers.append("Set-Cookie", serializeCookie(name, value, opts));
}
