import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

async function runMigrations() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Defina DIRECT_URL ou DATABASE_URL no arquivo .env.local antes de rodar as migrations."
    );
  }

  const client = postgres(connectionString, {
    prepare: false,
    max: 1,
    connect_timeout: 20,
    onnotice: () => {},
  });

  try {
    console.log("Aplicando migrations pendentes...");
    await migrate(drizzle(client), { migrationsFolder: "./src/db/migrations" });
    console.log("Migrations aplicadas com sucesso.");
  } finally {
    await client.end();
  }
}

runMigrations().catch((error) => {
  console.error("Erro ao aplicar migrations:", error?.cause ?? error);
  process.exit(1);
});
