import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
};

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não configurada. Defina a variável no arquivo .env.local."
    );
  }
  return url;
}

function createClient() {
  const connectionString = getConnectionString();
  const isLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");

  return postgres(connectionString, {
    prepare: false, // Compatível com Supabase Transaction Pooler (6543) e Session Pooler (5432)
    ssl: isLocal ? false : "require",
    max: process.env.NODE_ENV === "production" ? 3 : 5,
    connect_timeout: 10,
    idle_timeout: 20,
  });
}

export function getDb() {
  if (!globalForDb.postgresClient) {
    globalForDb.postgresClient = createClient();
  }
  return drizzle(globalForDb.postgresClient, { schema });
}

export type Database = ReturnType<typeof getDb>;
export { schema };
