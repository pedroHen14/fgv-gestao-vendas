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
  return postgres(getConnectionString(), {
    prepare: false, // Obrigatório para Supabase Transaction Pooler (porta 6543)
    max: process.env.NODE_ENV === "production" ? 5 : 10,
  });
}

export function getDb() {
  const client = globalForDb.postgresClient ?? createClient();
  if (process.env.NODE_ENV !== "production") {
    globalForDb.postgresClient = client;
  }
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof getDb>;
export { schema };
