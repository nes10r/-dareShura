import { PGlite } from "@electric-sql/pglite";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Production: Neon (DATABASE_URL).
 * Lokal inkişaf: DATABASE_URL yoxdursa, ./data/pglite qovluğunda daxili PostgreSQL (PGlite).
 */
function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (url) return drizzleNeon(neon(url), { schema }) as unknown as Db;
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL təyin edilməyib (Neon connection string).");
  }
  const client = new PGlite(process.env.PGLITE_DIR ?? "./data/pglite");
  return drizzlePglite(client, { schema }) as unknown as Db;
}

// Dev rejimində HMR zamanı təkrar bağlantı yaratmamaq üçün
const globalForDb = globalThis as unknown as { __db?: Db };
export const db: Db = globalForDb.__db ?? (globalForDb.__db = createDb());

export { schema };
