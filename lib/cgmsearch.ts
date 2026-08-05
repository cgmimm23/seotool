import { PrismaClient } from "@prisma/client";

// Read-only connection to the CGM Search index DB ("cgmsearch") on the SAME
// InMotion Postgres this app already uses. Powers the home-grown backlink
// explorer (web_backlink) — our own crawler data, NOT Moz. Raw queries only
// (no models needed in this app's schema).
function cgmsearchUrl(): string | undefined {
  if (process.env.CGMSEARCH_DATABASE_URL) return process.env.CGMSEARCH_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) return undefined;
  // Swap the /<dbname>? path segment for /cgmsearch (same host/role/pgbouncer).
  return base.replace(/\/([^/?]+)(\?|$)/, "/cgmsearch$2");
}

const g = globalThis as unknown as { __cgmsearch?: PrismaClient };

export const cgmsearch =
  g.__cgmsearch ?? new PrismaClient({ datasourceUrl: cgmsearchUrl() });

if (process.env.NODE_ENV !== "production") g.__cgmsearch = cgmsearch;
