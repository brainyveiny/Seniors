import { parse } from "pg-connection-string";
import type { PoolConfig } from "pg";

/** Avoid URL parsing -passwords may contain encoded `@` (%40). */
export function isLocalDatabaseUrl(connectionString: string): boolean {
  return /@(localhost|127\.0\.0\.1)(:\d+)?\//i.test(connectionString);
}

/** Remove sslmode before pg parses the URL (avoids pg v8 verify-full warning). */
export function withoutSslMode(connectionString: string): string {
  const question = connectionString.indexOf("?");
  if (question === -1) return connectionString;

  const base = connectionString.slice(0, question);
  const params = connectionString
    .slice(question + 1)
    .split("&")
    .filter((part) => part && !part.toLowerCase().startsWith("sslmode="));

  return params.length > 0 ? `${base}?${params.join("&")}` : base;
}

export function buildPgPoolConfig(connectionString: string): PoolConfig {
  if (isLocalDatabaseUrl(connectionString)) {
    return { connectionString };
  }

  const parsed = parse(withoutSslMode(connectionString));

  const config: PoolConfig = {
    ssl: { rejectUnauthorized: false },
  };

  if (parsed.host) config.host = parsed.host;
  if (parsed.user) config.user = parsed.user;
  if (parsed.password) config.password = parsed.password;
  if (parsed.database) config.database = parsed.database;
  if (parsed.port) config.port = Number(parsed.port);

  return config;
}
