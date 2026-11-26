import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import {
  normalizeForMatch,
  parsePlanilhaClienteXlsx,
  type ParsedClientePlanilha,
} from "../src/lib/importers/xlsx-parser";
import { formatCurrencyBRL } from "../src/lib/formatters";

config({ path: ".env.local" });
config({ path: ".env" });

function printUsage() {
  console.log(`
Uso:
  npx tsx scripts/import-xlsx.ts <arquivo-ou-pasta.xlsx> [--dry-run]

Exemplos:
  npx tsx scripts/import-xlsx.ts ./planilhas --dry-run
  npx tsx scripts/import-xlsx.ts ./planilhas/cliente.xlsx --dry-run
  npx tsx scripts/import-xlsx.ts ./planilhas/cliente.xlsx

Opções:
  --dry-run   Analisa e exibe o relatório completo sem gravar no banco de dados.
`);
}

function collectXlsxFiles(targetPath: string): string[] {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Caminho não encontrado: ${resolved}`);
  }

  const stat = fs.statSync(resolved);
  if (stat.isFile()) {
    if (!resolved.toLowerCase().endsWith(".xlsx")) {
      throw new Error(`O arquivo informado não é .xlsx: ${resolved}`);
    }
    return [resolved];
  }

  const files: string[] = [];
  for (const entry of fs.readdirSync(resolved, { withFileTypes: true })) {
    const fullPath = path.join(resolved, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectXlsxFiles(fullPath));
    } else if (
      entry.isFile() &&
      entry.name.toLowerCase().endsWith(".xlsx") &&
      !entry.name.startsWith("~$")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function printPlanilhaReport(item: ParsedClientePlanilha) {
  console.log("\n" + "=".repeat(72));
  console.log(`Arquivo: ${path.basename(item.arquivo)} (Aba: ${item.aba})`);
  console.log(
    `Cliente: ${item.cliente.razaoSocial} [${item.cliente.tipoPessoa}]` +
      (item.cliente.cpfCnpj ? ` | Doc: ${item.cliente.cpfCnpj}` : "") +
      (item.cliente.inscricaoEstadual
        ? ` | IE: ${item.cliente.inscricaoEstadual}`
        : "")
  );
  if (item.cliente.origemIndicacao) {
    console.log(`Origem/Indicação: ${item.cliente.origemIndicacao}`);
  }
  console.log(
    `Endereços/Filiais: ${item.enderecos.length} | Compradores: ${item.compradores.length} | Pedidos: ${item.pedidos.length} | Interações (e-mails): ${item.interacoes.length}`
  );

  if (item.enderecos.length > 0) {
    console.log("  Endereços:");
    for (const end of item.enderecos) {
      console.log(
        `    - [${end.tipo}] ${end.rotulo}: ${end.logradouro}, ${end.cidade}/${end.uf}` +
          (end.cnpjFilial ? ` (CNPJ filial: ${end.cnpjFilial})` : "")
      );
    }
  }

  if (item.compradores.length > 0) {
    console.log("  Compradores:");
    for (const comp of item.compradores) {
      console.log(
        `    - ${comp.nome}` +
          (comp.email ? ` <${comp.email}>` : "") +
          (comp.emailFinanceiro ? ` [Fin: ${comp.emailFinanceiro}]` : "") +
          (comp.telefone ? ` | Tel: ${comp.telefone}` : "")
      );
    }
  }

  if (item.pedidos.length > 0) {
    console.log("  Histórico de Pedidos:");
    for (const ped of item.pedidos) {
      console.log(
        `    - Linha ${ped.linhaOrigem}: [${ped.status}]` +
          (ped.numeroPedido ? ` Ped ${ped.numeroPedido}` : " Sem nº") +
          (ped.dataIso ? ` (${ped.dataIso})` : "") +
          ` | Qtd ${ped.quantidade} | Total ${formatCurrencyBRL(ped.valorTotal)}` +
          (ped.fornecedorNome ? ` | Fábrica: ${ped.fornecedorNome}` : "") +
          (ped.eventoFeira ? ` | Feira: ${ped.eventoFeira}` : "") +
          (ped.compradorNome ? ` | Comp: ${ped.compradorNome}` : "") +
          (ped.ocorrencias ? ` | Ocorrência: ${ped.ocorrencias}` : "")
      );
    }
  }

  if (item.interacoes.length > 0) {
    console.log("  Interações (não entram em pedidos):");
    for (const inter of item.interacoes) {
      console.log(
        `    - Linha ${inter.linhaOrigem}: [${inter.tipo}] ${inter.dataIso ?? "sem data"} — ${inter.resumo}`
      );
    }
  }

  if (item.avisos.length > 0) {
    console.log("  AVISOS PARA CONFERÊNCIA:");
    for (const aviso of item.avisos) {
      console.log(`    ! ${aviso}`);
    }
  }
}

async function persistToDatabase(items: ParsedClientePlanilha[]) {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Defina DIRECT_URL ou DATABASE_URL no .env.local para gravar no banco (ou use --dry-run)."
    );
  }

  const client = postgres(connectionString, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });

  const totals = {
    clientesCriados: 0,
    clientesReutilizados: 0,
    enderecosCriados: 0,
    compradoresCriados: 0,
    pedidosCriados: 0,
    pedidosPuladosDuplicados: 0,
    interacoesCriadas: 0,
    interacoesPuladasDuplicadas: 0,
  };

  try {
    // Mapa de fornecedores existentes por nome normalizado
    const allFornecedores = await db.query.fornecedores.findMany();
    const fornecedorMap = new Map<string, string>();
    for (const f of allFornecedores) {
      fornecedorMap.set(normalizeForMatch(f.nome), f.id);
    }

    for (const parsed of items) {
      await db.transaction(async (tx) => {
        // 1. Cliente (idempotente por CPF/CNPJ ou Razão Social normalizada)
        let clienteRow = parsed.cliente.cpfCnpj
          ? await tx.query.clientes.findFirst({
              where: eq(schema.clientes.cpfCnpj, parsed.cliente.cpfCnpj),
            })
          : undefined;

        if (!clienteRow) {
          const allClientes = await tx.query.clientes.findMany({
            columns: { id: true, razaoSocial: true },
          });
          const matchByName = allClientes.find(
            (c) =>
              normalizeForMatch(c.razaoSocial) ===
              normalizeForMatch(parsed.cliente.razaoSocial)
          );
          if (matchByName) {
            clienteRow = await tx.query.clientes.findFirst({
              where: eq(schema.clientes.id, matchByName.id),
            });
          }
        }

        if (clienteRow) {
          totals.clientesReutilizados++;
        } else {
          const [inserted] = await tx
            .insert(schema.clientes)
            .values({
              tipoPessoa: parsed.cliente.tipoPessoa,
              razaoSocial: parsed.cliente.razaoSocial,
              cpfCnpj: parsed.cliente.cpfCnpj,
              inscricaoEstadual: parsed.cliente.inscricaoEstadual,
              dataNascimento: parsed.cliente.dataNascimento,
              origemIndicacao: parsed.cliente.origemIndicacao,
              observacoes: parsed.cliente.observacoes,
            })
            .returning();
          clienteRow = inserted;
          totals.clientesCriados++;
        }

        const clienteId = clienteRow.id;

        // 2. Endereços (idempotente por logradouro + cidade + uf)
        const existingEnderecos = await tx.query.enderecos.findMany({
          where: eq(schema.enderecos.clienteId, clienteId),
        });
        let enderecoPrincipalId =
          existingEnderecos.find((e) => e.principal)?.id ??
          existingEnderecos[0]?.id ??
          null;

        for (const end of parsed.enderecos) {
          const dup = existingEnderecos.find(
            (e) =>
              normalizeForMatch(e.logradouro) ===
                normalizeForMatch(end.logradouro) &&
              normalizeForMatch(e.cidade) === normalizeForMatch(end.cidade) &&
              normalizeForMatch(e.uf) === normalizeForMatch(end.uf)
          );
          if (dup) continue;

          const [createdEnd] = await tx
            .insert(schema.enderecos)
            .values({
              clienteId,
              tipo: end.tipo,
              rotulo: end.rotulo,
              cnpjFilial: end.cnpjFilial,
              ieFilial: end.ieFilial,
              logradouro: end.logradouro,
              bairro: end.bairro,
              cidade: end.cidade,
              uf: end.uf,
              cep: end.cep,
              principal: !enderecoPrincipalId && end.principal,
            })
            .returning();

          if (!enderecoPrincipalId) {
            enderecoPrincipalId = createdEnd.id;
          }
          existingEnderecos.push(createdEnd);
          totals.enderecosCriados++;
        }

        // 3. Compradores (idempotente por e-mail ou nome normalizado)
        const existingCompradores = await tx.query.compradores.findMany({
          where: eq(schema.compradores.clienteId, clienteId),
        });
        const compradorIdByNormName = new Map<string, string>();
        for (const c of existingCompradores) {
          compradorIdByNormName.set(normalizeForMatch(c.nome), c.id);
        }

        for (const comp of parsed.compradores) {
          const dup = existingCompradores.find(
            (c) =>
              (comp.email &&
                c.email &&
                c.email.toLowerCase() === comp.email.toLowerCase()) ||
              normalizeForMatch(c.nome) === normalizeForMatch(comp.nome)
          );
          if (dup) {
            compradorIdByNormName.set(normalizeForMatch(comp.nome), dup.id);
            continue;
          }

          const [createdComp] = await tx
            .insert(schema.compradores)
            .values({
              clienteId,
              nome: comp.nome,
              email: comp.email,
              emailFinanceiro: comp.emailFinanceiro,
              telefone: comp.telefone,
              departamento: comp.departamento,
              ativo: true,
            })
            .returning();

          existingCompradores.push(createdComp);
          compradorIdByNormName.set(
            normalizeForMatch(comp.nome),
            createdComp.id
          );
          totals.compradoresCriados++;
        }

        // 4. Interações ("ENVIADO E-MAIL")
        const existingInteracoes = await tx.query.interacoesCliente.findMany({
          where: eq(schema.interacoesCliente.clienteId, clienteId),
        });

        for (const inter of parsed.interacoes) {
          const dataObj = inter.dataIso
            ? new Date(`${inter.dataIso}T12:00:00Z`)
            : new Date();

          const dup = existingInteracoes.find(
            (i) =>
              normalizeForMatch(i.resumo) === normalizeForMatch(inter.resumo) &&
              (!inter.dataIso ||
                i.dataInteracao.toISOString().slice(0, 10) === inter.dataIso)
          );
          if (dup) {
            totals.interacoesPuladasDuplicadas++;
            continue;
          }

          const compId = inter.compradorNome
            ? compradorIdByNormName.get(normalizeForMatch(inter.compradorNome)) ??
              null
            : null;

          const [createdInter] = await tx
            .insert(schema.interacoesCliente)
            .values({
              clienteId,
              compradorId: compId,
              tipo: inter.tipo,
              resumo: inter.resumo,
              dataInteracao: dataObj,
            })
            .returning();

          existingInteracoes.push(createdInter);
          totals.interacoesCriadas++;
        }

        // 5. Pedidos históricos (idempotente por cliente + nº pedido + data + valor)
        const existingPedidos = await tx.query.pedidos.findMany({
          where: eq(schema.pedidos.clienteId, clienteId),
          with: { itens: true },
        });

        for (const ped of parsed.pedidos) {
          const valorStr = ped.valorTotal.toFixed(2);
          const dup = existingPedidos.find((ep) => {
            const sameTotal = Number(ep.valorTotal).toFixed(2) === valorStr;
            const sameDate = (ep.dataPedido ?? null) === (ped.dataIso ?? null);
            if (ped.numeroPedido && ep.numeroPedido) {
              return (
                normalizeForMatch(ep.numeroPedido) ===
                  normalizeForMatch(ped.numeroPedido) &&
                sameDate &&
                sameTotal
              );
            }
            const firstDesc = ep.itens[0]?.descricaoTecnica ?? "";
            return (
              sameDate &&
              sameTotal &&
              normalizeForMatch(firstDesc) === normalizeForMatch(ped.descricao)
            );
          });

          if (dup) {
            totals.pedidosPuladosDuplicados++;
            continue;
          }

          const compId = ped.compradorNome
            ? compradorIdByNormName.get(normalizeForMatch(ped.compradorNome)) ??
              null
            : null;

          let fornId: string | null = null;
          if (ped.fornecedorNome) {
            const normForn = normalizeForMatch(ped.fornecedorNome);
            fornId = fornecedorMap.get(normForn) ?? null;
            if (!fornId) {
              const existingForn = await tx.query.fornecedores.findFirst({
                where: and(eq(schema.fornecedores.nome, ped.fornecedorNome)),
              });
              if (existingForn) {
                fornId = existingForn.id;
                fornecedorMap.set(normForn, existingForn.id);
              }
            }
          }

          const [createdPed] = await tx
            .insert(schema.pedidos)
            .values({
              numeroPedido: ped.numeroPedido,
              clienteId,
              compradorId: compId,
              fornecedorId: fornId,
              enderecoFaturamentoId: enderecoPrincipalId,
              entregaMesmoFaturamento: true,
              vendedor: ped.vendedor,
              status: ped.status,
              condicaoPagamento: ped.condicaoPagamento,
              dataOrcamento: ped.dataIso,
              dataPedido: ped.dataIso,
              dataEntregaCliente:
                ped.status === "ENTREGUE" ? ped.dataIso : null,
              subtotal: valorStr,
              desconto: "0.00",
              valorTotal: valorStr,
              eventoFeira: ped.eventoFeira,
              ocorrencias: ped.ocorrencias,
            })
            .returning();

          await tx.insert(schema.pedidoItens).values({
            pedidoId: createdPed.id,
            descricaoTecnica: ped.descricao,
            quantidade: ped.quantidade,
            valorUnitario: ped.valorUnitario.toFixed(2),
            valorTotal: valorStr,
            gradeTamanhos: null,
            ordem: 1,
          });

          totals.pedidosCriados++;
        }
      });
    }
  } finally {
    await client.end();
  }

  console.log("\n" + "=".repeat(72));
  console.log("RESUMO DA IMPORTAÇÃO NO BANCO:");
  console.log(`  Clientes criados:              ${totals.clientesCriados}`);
  console.log(`  Clientes reutilizados:         ${totals.clientesReutilizados}`);
  console.log(`  Endereços/Filiais criados:     ${totals.enderecosCriados}`);
  console.log(`  Compradores criados:           ${totals.compradoresCriados}`);
  console.log(`  Pedidos históricos criados:    ${totals.pedidosCriados}`);
  console.log(`  Pedidos ignorados (duplic.):   ${totals.pedidosPuladosDuplicados}`);
  console.log(`  Interações (e-mails) criadas:  ${totals.interacoesCriadas}`);
  console.log(
    `  Interações ignoradas (duplic.): ${totals.interacoesPuladasDuplicadas}`
  );
  console.log("=".repeat(72));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const targetArg = args.find((a) => !a.startsWith("--"));

  if (!targetArg || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(targetArg ? 0 : 1);
  }

  const files = collectXlsxFiles(targetArg);
  if (files.length === 0) {
    console.log("Nenhum arquivo .xlsx encontrado no caminho informado.");
    process.exit(0);
  }

  console.log(
    `Modo: ${dryRun ? "SIMULAÇÃO (--dry-run, sem gravar no banco)" : "IMPORTAÇÃO REAL"}`
  );
  console.log(`Arquivos encontrados: ${files.length}`);

  const allParsed: ParsedClientePlanilha[] = [];
  for (const file of files) {
    const parsedSheets = await parsePlanilhaClienteXlsx(file);
    allParsed.push(...parsedSheets);
  }

  for (const item of allParsed) {
    printPlanilhaReport(item);
  }

  if (dryRun) {
    console.log(
      "\nSimulação concluída (--dry-run). Nenhum dado foi gravado no banco."
    );
    console.log(
      "Se o relatório acima estiver correto, rode novamente sem --dry-run para gravar."
    );
    return;
  }

  await persistToDatabase(allParsed);
}

main().catch((error) => {
  console.error("\nErro ao executar importação:", error);
  process.exit(1);
});
