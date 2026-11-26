import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { fornecedores } from "./schema";

config({ path: ".env.local" });
config({ path: ".env" });

const FORNECEDORES_INICIAIS = [
  {
    nome: "DKS Bonés",
    templatePdf: "BONES_MOCKUP" as const,
    proximoNumeroPedido: null,
    contato: null,
    observacoes:
      "Bonés personalizados. Numeração na faixa 04xx. Layout com mockup técnico em destaque.",
  },
  {
    nome: "Agatha",
    templatePdf: "CONFECCAO_GRADE" as const,
    proximoNumeroPedido: null,
    contato: null,
    observacoes:
      "Confecção e uniformes. Numeração na faixa 4xxx (aceita sufixo alfanumérico, ex.: 4712B). Layout com grade de tamanhos.",
  },
  {
    nome: "Elo Brindes",
    templatePdf: "PADRAO" as const,
    proximoNumeroPedido: null,
    contato: null,
    observacoes: "Brindes corporativos diversos. Layout padrão FGV.",
  },
];

async function seed() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Defina DIRECT_URL ou DATABASE_URL no arquivo .env.local antes de executar o seed."
    );
  }

  const client = postgres(connectionString, { prepare: false, max: 1 });
  const db = drizzle(client);

  try {
    console.log("Inserindo fornecedores iniciais...");

    const inserted = await db
      .insert(fornecedores)
      .values(FORNECEDORES_INICIAIS)
      .onConflictDoNothing({ target: fornecedores.nome })
      .returning({
        id: fornecedores.id,
        nome: fornecedores.nome,
        templatePdf: fornecedores.templatePdf,
      });

    if (inserted.length === 0) {
      console.log(
        "Todos os fornecedores iniciais já estavam cadastrados (nenhuma alteração)."
      );
    } else {
      console.log(
        `Fornecedores cadastrados (${inserted.length}): ${inserted
          .map((f) => `${f.nome} [${f.templatePdf}]`)
          .join(", ")}`
      );
    }
  } finally {
    await client.end();
  }
}

seed().catch((error) => {
  console.error("Erro ao executar seed:", error);
  process.exit(1);
});
