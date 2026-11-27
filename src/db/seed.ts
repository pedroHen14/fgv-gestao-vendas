import { config } from "dotenv";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import {
  clientes,
  compradores,
  conteudos,
  enderecos,
  fornecedores,
  interacoesCliente,
  pedidoArquivos,
  pedidoItens,
  pedidos,
} from "./schema";
import { generateMockupPng, generateSimplePdf } from "./seed-assets";
import {
  addDaysToIsoDate,
  getMonthRangeFromIso,
  getTodayIsoDate,
} from "../lib/formatters";
import {
  calcularTotaisPedido,
  gradeTamanhosSchema,
  type GradeTamanhos,
} from "../lib/validators/pedido";
import { roteiroCenasSchema, type RoteiroCenas } from "../lib/validators/conteudo";
import { createSupabaseAdminClient } from "../lib/supabase/admin";
import { PEDIDOS_BUCKET } from "../lib/storage";

config({ path: ".env.local" });
config({ path: ".env" });

// ==========================================
// AUXILIARES DE DATA E GRADE
// ==========================================

function clampDateToCurrentMonth(
  hojeIso: string,
  daysBeforeToday: number
): string {
  const { startIso } = getMonthRangeFromIso(hojeIso);
  const candidate = addDaysToIsoDate(hojeIso, -daysBeforeToday);
  return candidate < startIso ? startIso : candidate;
}

function isoDateToDateAtHour(isoDate: string, hourUtc = 14): Date {
  return new Date(`${isoDate}T${String(hourUtc).padStart(2, "0")}:00:00.000Z`);
}

function makeGrade(
  modelo: GradeTamanhos["modelo"],
  parciais: Partial<
    Record<"PP" | "P" | "M" | "G" | "GG" | "3G" | "4G" | "5G" | "ESP", number>
  >
): { grade: GradeTamanhos; total: number } {
  const tamanhos: Record<string, number> = {
    PP: parciais.PP ?? 0,
    P: parciais.P ?? 0,
    M: parciais.M ?? 0,
    G: parciais.G ?? 0,
    GG: parciais.GG ?? 0,
    "3G": parciais["3G"] ?? 0,
    "4G": parciais["4G"] ?? 0,
    "5G": parciais["5G"] ?? 0,
    ESP: parciais.ESP ?? 0,
  };
  const grade = gradeTamanhosSchema.parse({ modelo, tamanhos });
  const total = Object.values(grade.tamanhos).reduce((acc, q) => acc + q, 0);
  return { grade, total };
}

// ==========================================
// 1. FORNECEDORES / FABRICANTES
// ==========================================

const FORNECEDORES_SEED = [
  {
    nome: "DKS Bonés",
    templatePdf: "BONES_MOCKUP" as const,
    proximoNumeroPedido: 468,
    contato: "Renata (Comercial DKS) — (43) 3422-8810 / pedidos@dksbones.com.br",
    observacoes:
      "Bonés personalizados. Numeração na faixa 04xx. Layout com mockup técnico em destaque.",
  },
  {
    nome: "Agatha",
    templatePdf: "CONFECCAO_GRADE" as const,
    proximoNumeroPedido: 4720,
    contato: "Patrícia (PCP Agatha) — (19) 3461-4420 / pcp@agathaconfeccoes.com.br",
    observacoes:
      "Confecção e uniformes. Numeração na faixa 4xxx (aceita sufixo alfanumérico, ex.: 4712B). Layout com grade de tamanhos.",
  },
  {
    nome: "Elo Brindes",
    templatePdf: "PADRAO" as const,
    proximoNumeroPedido: 115,
    contato: "Marcelo (Atendimento Elo) — (11) 2954-7100 / vendas@elobrindes.com.br",
    observacoes:
      "Brindes corporativos diversos (guarda-chuvas, chaveiros, kits SIPAT). Layout padrão FGV.",
  },
  {
    nome: "Sul Tex Uniformes",
    templatePdf: "CONFECCAO_GRADE" as const,
    proximoNumeroPedido: 2045,
    contato: "Juliana (Sul Tex) — (47) 3326-5900 / atendimento@sultexuniformes.com.br",
    observacoes:
      "Especialista em camisas de pescaria UV50+, sublimação total e camisetas promocionais para feiras do agro.",
  },
  {
    nome: "Brindes Paulista",
    templatePdf: "PADRAO" as const,
    proximoNumeroPedido: 310,
    contato: "Ricardo — (11) 3876-2240 / comercial@brindespaulista.com.br",
    observacoes:
      "Garrafas térmicas inox, copos térmicos, canetas metálicas e kits executivos gravados a laser.",
  },
];

// ==========================================
// 2. CLIENTES, ENDEREÇOS E COMPRADORES
// ==========================================

const SEED_CLIENTES_DOCS = [
  "14829310000142", // AgroForte Sementes
  "27415902000188", // Eventos Campo & Negócio
  "38492017854", // João Carlos Mendes (PF)
  "09318455000161", // Cooperativa Agrícola Vale Verde
  "18650234000119", // TerraSul Máquinas Agrícolas
  "33912748000105", // NutriCampo Nutrição Animal
  "52910483912", // Maria Helena Nogueira (PF)
  "41208765000173", // BioSolo Fertilizantes Especiais (sem pedidos)
];

interface SeedClienteDef {
  key: string;
  tipoPessoa: "PJ" | "PF";
  razaoSocial: string;
  cpfCnpj: string;
  inscricaoEstadual: string | null;
  dataNascimento: string | null;
  origemIndicacao: string | null;
  observacoes: string | null;
  enderecos: Array<{
    key: string;
    tipo: "FATURAMENTO" | "ENTREGA" | "FILIAL";
    rotulo: string;
    cnpjFilial?: string | null;
    ieFilial?: string | null;
    logradouro: string;
    bairro?: string | null;
    cidade: string;
    uf: string;
    cep?: string | null;
    principal: boolean;
  }>;
  compradores: Array<{
    key: string;
    nome: string;
    email?: string | null;
    emailFinanceiro?: string | null;
    telefone?: string | null;
    departamento?: string | null;
    ativo: boolean;
  }>;
}

const CLIENTES_SEED: SeedClienteDef[] = [
  {
    key: "agroforte",
    tipoPessoa: "PJ",
    razaoSocial: "AgroForte Sementes e Insumos Ltda",
    cpfCnpj: "14829310000142",
    inscricaoEstadual: "582.441.908.112",
    dataNascimento: null,
    origemIndicacao: "Indicação da diretoria comercial na Agrishow",
    observacoes:
      "Conta recorrente de grande porte. Compra bonés e polos para Agrishow, Show Rural e convenção anual da equipe técnica.",
    enderecos: [
      {
        key: "agroforte_matriz",
        tipo: "FATURAMENTO",
        rotulo: "Matriz Ribeirão Preto",
        logradouro: "Av. Presidente Vargas, 2121, Sala 804",
        bairro: "Jardim América",
        cidade: "Ribeirão Preto",
        uf: "SP",
        cep: "14020260",
        principal: true,
      },
      {
        key: "agroforte_filial",
        tipo: "FILIAL",
        rotulo: "Filial Piracaia (Centro de Distribuição)",
        cnpjFilial: "14829310000223",
        ieFilial: "535.118.204.009",
        logradouro: "Rod. Januário Carmelo, Km 14, Galpão 3",
        bairro: "Distrito Industrial",
        cidade: "Piracaia",
        uf: "SP",
        cep: "12970000",
        principal: false,
      },
      {
        key: "agroforte_entrega",
        tipo: "ENTREGA",
        rotulo: "Galpão Eventos Agrishow",
        logradouro: "Rua Antônio Duarte Nogueira, 480",
        bairro: "Parque Industrial",
        cidade: "Sertãozinho",
        uf: "SP",
        cep: "14175000",
        principal: false,
      },
    ],
    compradores: [
      {
        key: "agroforte_camila",
        nome: "Camila Duarte",
        email: "camila.duarte@agrofortesementes.com.br",
        emailFinanceiro: "contasapagar@agrofortesementes.com.br",
        telefone: "16991428830",
        departamento: "Marketing & Feiras",
        ativo: true,
      },
      {
        key: "agroforte_rodrigo",
        nome: "Rodrigo Bastos",
        email: "rodrigo.bastos@agrofortesementes.com.br",
        emailFinanceiro: "contasapagar@agrofortesementes.com.br",
        telefone: "1639114500",
        departamento: "Suprimentos",
        ativo: true,
      },
      {
        key: "agroforte_antiga",
        nome: "Fernanda Lemos",
        email: "fernanda.lemos@agrofortesementes.com.br",
        emailFinanceiro: null,
        telefone: "16992014411",
        departamento: "Eventos (ex-compradora)",
        ativo: false,
      },
    ],
  },
  {
    key: "campo_negocio",
    tipoPessoa: "PJ",
    razaoSocial: "Eventos Campo & Negócio Agência Ltda",
    cpfCnpj: "27415902000188",
    inscricaoEstadual: "149.882.310.117",
    dataNascimento: null,
    origemIndicacao: "Agência indicada pela Syngenta",
    observacoes:
      "Atende diversas marcas do agronegócio em feiras nacionais. Sempre exige número da Ordem de Compra na NF e envio prévio de mockup.",
    enderecos: [
      {
        key: "campo_matriz",
        tipo: "FATURAMENTO",
        rotulo: "Matriz Pinheiros",
        logradouro: "Rua dos Pinheiros, 870, Conj. 91",
        bairro: "Pinheiros",
        cidade: "São Paulo",
        uf: "SP",
        cep: "05422001",
        principal: true,
      },
      {
        key: "campo_deposito",
        tipo: "ENTREGA",
        rotulo: "Depósito Logística Barueri",
        logradouro: "Alameda Caiapós, 315, Doca B",
        bairro: "Tamboré",
        cidade: "Barueri",
        uf: "SP",
        cep: "06460110",
        principal: false,
      },
    ],
    compradores: [
      {
        key: "campo_larissa",
        nome: "Larissa Monteiro",
        email: "larissa@campoenegocioeventos.com.br",
        emailFinanceiro: "financeiro@campoenegocioeventos.com.br",
        telefone: "11988451290",
        departamento: "Produção — Conta Agrishow",
        ativo: true,
      },
      {
        key: "campo_thiago",
        nome: "Thiago Prado",
        email: "thiago.prado@campoenegocioeventos.com.br",
        emailFinanceiro: "financeiro@campoenegocioeventos.com.br",
        telefone: "11974123309",
        departamento: "Produção — Conta Show Rural",
        ativo: true,
      },
      {
        key: "campo_beatriz",
        nome: "Beatriz Salles",
        email: "beatriz@campoenegocioeventos.com.br",
        emailFinanceiro: "financeiro@campoenegocioeventos.com.br",
        telefone: "1130459980",
        departamento: "Eventos Corporativos & SIPAT",
        ativo: true,
      },
    ],
  },
  {
    key: "joao_mendes",
    tipoPessoa: "PF",
    razaoSocial: "João Carlos Mendes — Fazenda Santa Clara",
    cpfCnpj: "38492017854",
    inscricaoEstadual: "094.812.665-PR",
    dataNascimento: "1974-08-15",
    origemIndicacao: "Indicação do representante regional na Bahia Farm Show",
    observacoes:
      "Produtor rural de soja e algodão no oeste baiano. Faturamento sempre no CPF com data de nascimento e IE de produtor rural.",
    enderecos: [
      {
        key: "joao_fazenda",
        tipo: "FATURAMENTO",
        rotulo: "Fazenda Santa Clara (Sede)",
        logradouro: "Rod. BR-242, Km 880, Zona Rural",
        bairro: "Setor Agrícola",
        cidade: "Luís Eduardo Magalhães",
        uf: "BA",
        cep: "47850000",
        principal: true,
      },
      {
        key: "joao_escritorio",
        tipo: "ENTREGA",
        rotulo: "Escritório Cidade (Recebimento Transportadora)",
        logradouro: "Rua Paraná, 1420, Sala 02",
        bairro: "Centro",
        cidade: "Barreiras",
        uf: "BA",
        cep: "47800050",
        principal: false,
      },
    ],
    compradores: [
      {
        key: "joao_claudia",
        nome: "Cláudia Mendes",
        email: "adm@fazendasantaclara-ba.com.br",
        emailFinanceiro: "financeiro@fazendasantaclara-ba.com.br",
        telefone: "77999184420",
        departamento: "Administração da Fazenda",
        ativo: true,
      },
    ],
  },
  {
    key: "vale_verde",
    tipoPessoa: "PJ",
    razaoSocial: "Cooperativa Agrícola Vale Verde",
    cpfCnpj: "09318455000161",
    inscricaoEstadual: "902.54718-40",
    dataNascimento: null,
    origemIndicacao: "Prospecção ativa para Show Rural Coopavel",
    observacoes:
      "Compra uniformes de campo, polos sociais para consultores e brindes para dia de campo com cooperados.",
    enderecos: [
      {
        key: "vale_matriz",
        tipo: "FATURAMENTO",
        rotulo: "Matriz Cascavel",
        logradouro: "Av. Tancredo Neves, 3450",
        bairro: "Santo Onofre",
        cidade: "Cascavel",
        uf: "PR",
        cep: "85806470",
        principal: true,
      },
      {
        key: "vale_filial",
        tipo: "FILIAL",
        rotulo: "Filial Toledo",
        cnpjFilial: "09318455000323",
        ieFilial: "904.11280-12",
        logradouro: "Rua Maripá, 1890",
        bairro: "Jardim La Salle",
        cidade: "Toledo",
        uf: "PR",
        cep: "85902010",
        principal: false,
      },
    ],
    compradores: [
      {
        key: "vale_rafael",
        nome: "Rafael Zimmer",
        email: "rafael.zimmer@coopvaleverde.com.br",
        emailFinanceiro: "nfe@coopvaleverde.com.br",
        telefone: "45999412018",
        departamento: "Comunicação & Marketing",
        ativo: true,
      },
      {
        key: "vale_simone",
        nome: "Simone Becker",
        email: "simone.becker@coopvaleverde.com.br",
        emailFinanceiro: "nfe@coopvaleverde.com.br",
        telefone: "4532208900",
        departamento: "Compras Corporativas",
        ativo: true,
      },
    ],
  },
  {
    key: "terrasul",
    tipoPessoa: "PJ",
    razaoSocial: "TerraSul Máquinas Agrícolas S.A.",
    cpfCnpj: "18650234000119",
    inscricaoEstadual: "084/0094218",
    dataNascimento: null,
    origemIndicacao: "Indicação de cliente na Expo Direto Cotrijal",
    observacoes:
      "Rede de concessionárias de implementos e colheitadeiras. Alta exigência no bordado em alto relevo da logomarca.",
    enderecos: [
      {
        key: "terrasul_matriz",
        tipo: "FATURAMENTO",
        rotulo: "Matriz Não-Me-Toque",
        logradouro: "Av. Alto Jacuí, 1120",
        bairro: "Centro",
        cidade: "Não-Me-Toque",
        uf: "RS",
        cep: "99470000",
        principal: true,
      },
      {
        key: "terrasul_filial",
        tipo: "FILIAL",
        rotulo: "Filial Passo Fundo",
        cnpjFilial: "18650234000208",
        ieFilial: "091/0218440",
        logradouro: "Rod. BR-285, Km 294",
        bairro: "São José",
        cidade: "Passo Fundo",
        uf: "RS",
        cep: "99052900",
        principal: false,
      },
    ],
    compradores: [
      {
        key: "terrasul_eduardo",
        nome: "Eduardo Klein",
        email: "eduardo.klein@terrasulmaquinas.com.br",
        emailFinanceiro: "fiscal@terrasulmaquinas.com.br",
        telefone: "54996127740",
        departamento: "Marketing Regional",
        ativo: true,
      },
      {
        key: "terrasul_vanessa",
        nome: "Vanessa Moraes",
        email: "vanessa.moraes@terrasulmaquinas.com.br",
        emailFinanceiro: "fiscal@terrasulmaquinas.com.br",
        telefone: "5433321900",
        departamento: "Compras",
        ativo: true,
      },
    ],
  },
  {
    key: "nutricampo",
    tipoPessoa: "PJ",
    razaoSocial: "NutriCampo Nutrição Animal Ltda",
    cpfCnpj: "33912748000105",
    inscricaoEstadual: "701.348920.00-44",
    dataNascimento: null,
    origemIndicacao: "Contato via Instagram (@fgvrepresentacoes)",
    observacoes:
      "Realiza SIPAT anual e participa da Femagri e ExpoZebu. Prefere pagamento via boleto 28 dias.",
    enderecos: [
      {
        key: "nutricampo_matriz",
        tipo: "FATURAMENTO",
        rotulo: "Unidade Industrial Uberaba",
        logradouro: "Av. Filomena Cartafina, 4180",
        bairro: "Distrito Industrial III",
        cidade: "Uberaba",
        uf: "MG",
        cep: "38044750",
        principal: true,
      },
    ],
    compradores: [
      {
        key: "nutricampo_paula",
        nome: "Paula Rezende",
        email: "paula.rezende@nutricampo.ind.br",
        emailFinanceiro: "pagamentos@nutricampo.ind.br",
        telefone: "34991805512",
        departamento: "RH & Endomarketing",
        ativo: true,
      },
      {
        key: "nutricampo_lucas",
        nome: "Lucas Ferreira",
        email: "lucas.ferreira@nutricampo.ind.br",
        emailFinanceiro: "pagamentos@nutricampo.ind.br",
        telefone: "3433194100",
        departamento: "Comercial",
        ativo: true,
      },
    ],
  },
  {
    key: "maria_nogueira",
    tipoPessoa: "PF",
    razaoSocial: "Maria Helena Nogueira — Haras & Agro Nogueira",
    cpfCnpj: "52910483912",
    inscricaoEstadual: "13.784.229-0",
    dataNascimento: "1981-03-22",
    origemIndicacao: "Indicação da Fazenda Santa Clara",
    observacoes:
      "Produtora rural e organizadora de leilão de gado no norte do MT. Encomenda camisas de pescaria UV50+ e bonés premium para equipe e convidados.",
    enderecos: [
      {
        key: "maria_sede",
        tipo: "FATURAMENTO",
        rotulo: "Escritório Sorriso",
        logradouro: "Av. Natalino João Brescansin, 910",
        bairro: "Centro",
        cidade: "Sorriso",
        uf: "MT",
        cep: "78890000",
        principal: true,
      },
    ],
    compradores: [
      {
        key: "maria_comprador",
        nome: "Maria Helena Nogueira",
        email: "mariahelena@agronogueiramt.com.br",
        emailFinanceiro: "contabil@agronogueiramt.com.br",
        telefone: "66999441188",
        departamento: "Proprietária",
        ativo: true,
      },
    ],
  },
  {
    key: "biosolo",
    tipoPessoa: "PJ",
    razaoSocial: "BioSolo Fertilizantes Especiais Ltda",
    cpfCnpj: "41208765000173",
    inscricaoEstadual: "908.11422-75",
    dataNascimento: null,
    origemIndicacao: "Contato captado pelo catálogo digital",
    observacoes:
      "Cliente novo em fase de prospecção (sem pedidos lançados ainda — útil para testar novo orçamento e exclusão de cadastro).",
    enderecos: [
      {
        key: "biosolo_matriz",
        tipo: "FATURAMENTO",
        rotulo: "Matriz Londrina",
        logradouro: "Av. Madre Leônia Milito, 1377, Sala 602",
        bairro: "Gleba Palhano",
        cidade: "Londrina",
        uf: "PR",
        cep: "86050270",
        principal: true,
      },
    ],
    compradores: [
      {
        key: "biosolo_andre",
        nome: "André Vasconcelos",
        email: "andre.vasconcelos@biosolofert.com.br",
        emailFinanceiro: "financeiro@biosolofert.com.br",
        telefone: "43991237760",
        departamento: "Marketing",
        ativo: true,
      },
    ],
  },
];

// ==========================================
// 3. ANEXOS / MOCKUPS NO SUPABASE STORAGE
// ==========================================

interface SeedAssetBundle {
  boneAgroPath: string;
  boneAgroSize: number;
  boneMaquinasPath: string;
  boneMaquinasSize: number;
  poloAgathaPath: string;
  poloAgathaSize: number;
  kitEloPath: string;
  kitEloSize: number;
  ocPdfPath: string;
  ocPdfSize: number;
  nfPdfPath: string;
  nfPdfSize: number;
  compPdfPath: string;
  compPdfSize: number;
}

async function uploadSeedAssets(): Promise<SeedAssetBundle> {
  const supabase = createSupabaseAdminClient();

  const files: Array<{
    key: keyof Omit<
      SeedAssetBundle,
      | "boneAgroSize"
      | "boneMaquinasSize"
      | "poloAgathaSize"
      | "kitEloSize"
      | "ocPdfSize"
      | "nfPdfSize"
      | "compPdfSize"
    >;
    path: string;
    contentType: string;
    buffer: Buffer;
  }> = [
    {
      key: "boneAgroPath",
      path: "seed/2026/mockups/mockup_dks_bone_agro_trucker.png",
      contentType: "image/png",
      buffer: generateMockupPng({
        variant: "BONE",
        titulo: "BONE TRUCKER DKS",
        subtitulo: "BORDADO 3D VERDE AGRO",
        corPrincipal: [21, 94, 59],
        corDetalhe: [217, 119, 6],
      }),
    },
    {
      key: "boneMaquinasPath",
      path: "seed/2026/mockups/mockup_dks_bone_terrasul.png",
      contentType: "image/png",
      buffer: generateMockupPng({
        variant: "BONE",
        titulo: "BONE ABA CURVA DKS",
        subtitulo: "SILK ALTO RELEVO",
        corPrincipal: [30, 58, 138],
        corDetalhe: [234, 179, 8],
      }),
    },
    {
      key: "poloAgathaPath",
      path: "seed/2026/mockups/mockup_agatha_polo_piquet.png",
      contentType: "image/png",
      buffer: generateMockupPng({
        variant: "POLO",
        titulo: "POLO PIQUET AGATHA",
        subtitulo: "BORDADO PEITO + MANGA",
        corPrincipal: [20, 83, 45],
        corDetalhe: [180, 83, 9],
      }),
    },
    {
      key: "kitEloPath",
      path: "seed/2026/mockups/mockup_elo_kit_corporativo.png",
      contentType: "image/png",
      buffer: generateMockupPng({
        variant: "KIT",
        titulo: "KIT BRINDE SIPAT",
        subtitulo: "GRAVACAO LASER INOX",
        corPrincipal: [15, 118, 110],
        corDetalhe: [51, 65, 85],
      }),
    },
    {
      key: "ocPdfPath",
      path: "seed/2026/documentos/ordem_compra_exemplo.pdf",
      contentType: "application/pdf",
      buffer: generateSimplePdf("ORDEM DE COMPRA - DOCUMENTO DE TESTE", [
        "Emitente: Departamento de Compras Corporativas",
        "Representante: FGV Representacoes Comerciais (comercialfgv@terra.com.br)",
        "Referencia: Fornecimento de brindes e uniformes personalizados",
        "Condicao comercial aprovada conforme proposta enviada.",
        "Observacao: Informar numero da OC no campo de observacoes da NF-e.",
      ]),
    },
    {
      key: "nfPdfPath",
      path: "seed/2026/documentos/nota_fiscal_exemplo.pdf",
      contentType: "application/pdf",
      buffer: generateSimplePdf("DANFE SIMPLIFICADO - NOTA FISCAL DE TESTE", [
        "NF-e Serie 001 - Documento auxiliar gerado para testes da plataforma FGV",
        "Natureza da Operacao: Venda de mercadoria personalizada",
        "Transporte: Frete CIF conforme combinado no pedido",
        "Status SEFAZ: Autorizado o uso da NF-e (ambiente de demonstracao)",
      ]),
    },
    {
      key: "compPdfPath",
      path: "seed/2026/documentos/comprovante_pagamento_exemplo.pdf",
      contentType: "application/pdf",
      buffer: generateSimplePdf("COMPROVANTE DE PAGAMENTO - TESTE", [
        "Tipo: Transferencia / Liquidacao de Titulo",
        "Favorecido: Fabrica Parceira FGV",
        "Situacao: Pagamento confirmado pelo financeiro do cliente",
        "Arquivo anexado automaticamente pela seed de testes.",
      ]),
    },
  ];

  const sizes: Record<string, number> = {};
  const paths: Record<string, string> = {};

  for (const file of files) {
    const { error } = await supabase.storage
      .from(PEDIDOS_BUCKET)
      .upload(file.path, file.buffer, {
        contentType: file.contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(
        `Falha ao enviar arquivo de seed (${file.path}) para o bucket ${PEDIDOS_BUCKET}: ${error.message}`
      );
    }

    paths[file.key] = file.path;
    sizes[file.key] = file.buffer.length;
  }

  return {
    boneAgroPath: paths.boneAgroPath,
    boneAgroSize: sizes.boneAgroPath,
    boneMaquinasPath: paths.boneMaquinasPath,
    boneMaquinasSize: sizes.boneMaquinasPath,
    poloAgathaPath: paths.poloAgathaPath,
    poloAgathaSize: sizes.poloAgathaPath,
    kitEloPath: paths.kitEloPath,
    kitEloSize: sizes.kitEloPath,
    ocPdfPath: paths.ocPdfPath,
    ocPdfSize: sizes.ocPdfPath,
    nfPdfPath: paths.nfPdfPath,
    nfPdfSize: sizes.nfPdfPath,
    compPdfPath: paths.compPdfPath,
    compPdfSize: sizes.compPdfPath,
  };
}

// ==========================================
// 4. EXECUÇÃO PRINCIPAL
// ==========================================

async function seed() {
  const isReset = process.argv.includes("--reset");
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Defina DIRECT_URL ou DATABASE_URL no arquivo .env.local antes de executar o seed."
    );
  }

  const client = postgres(connectionString, {
    prepare: false,
    max: 1,
    ssl:
      connectionString.includes("localhost") ||
      connectionString.includes("127.0.0.1")
        ? false
        : "require",
  });
  const db = drizzle(client, { schema });

  try {
    const hojeIso = getTodayIsoDate();
    console.log(
      `\nIniciando seed completo da plataforma FGV (data de referência: ${hojeIso})${isReset ? " [MODO --reset]" : ""}...`
    );

    if (isReset) {
      console.log("Limpando dados anteriores antes de recriar o ambiente de testes...");
      await db.transaction(async (tx) => {
        await tx.delete(conteudos);
        await tx.delete(interacoesCliente);
        await tx.delete(pedidoArquivos);
        await tx.delete(pedidoItens);
        await tx.delete(pedidos);
        await tx.delete(compradores);
        await tx.delete(enderecos);
        await tx.delete(clientes);
        await tx.delete(fornecedores);
      });
    } else {
      const existingSeedClientes = await db
        .select({ id: clientes.id, razaoSocial: clientes.razaoSocial })
        .from(clientes)
        .where(inArray(clientes.cpfCnpj, SEED_CLIENTES_DOCS));

      if (existingSeedClientes.length > 0) {
        console.log(
          `Seed de testes já aplicado (${existingSeedClientes.length} clientes de demonstração encontrados).`
        );
        console.log(
          "Se quiser zerar e recriar tudo com datas atualizadas para hoje, execute: npm run db:seed -- --reset"
        );
        return;
      }
    }

    // 1) Enviar mockups PNG e PDFs de exemplo para o bucket privado pedidos-arquivos
    console.log("Enviando mockups e anexos de exemplo para o Supabase Storage...");
    const assets = await uploadSeedAssets();
    console.log("Arquivos enviados para o bucket privado pedidos-arquivos (7 arquivos).");

    // 2) Fornecedores (insere ou enriquece os iniciais sem perder IDs)
    console.log("Cadastrando fabricantes / fornecedores...");
    const fornecedorMap = new Map<string, string>();

    for (const f of FORNECEDORES_SEED) {
      const existing = await db.query.fornecedores.findFirst({
        where: eq(fornecedores.nome, f.nome),
      });

      if (existing) {
        await db
          .update(fornecedores)
          .set({
            proximoNumeroPedido:
              existing.proximoNumeroPedido ?? f.proximoNumeroPedido,
            contato: existing.contato ?? f.contato,
            observacoes: existing.observacoes ?? f.observacoes,
          })
          .where(eq(fornecedores.id, existing.id));
        fornecedorMap.set(f.nome, existing.id);
      } else {
        const [inserted] = await db
          .insert(fornecedores)
          .values(f)
          .returning({ id: fornecedores.id });
        fornecedorMap.set(f.nome, inserted.id);
      }
    }

    const fornDks = fornecedorMap.get("DKS Bonés")!;
    const fornAgatha = fornecedorMap.get("Agatha")!;
    const fornElo = fornecedorMap.get("Elo Brindes")!;
    const fornSulTex = fornecedorMap.get("Sul Tex Uniformes")!;
    const fornPaulista = fornecedorMap.get("Brindes Paulista")!;

    // 3) Clientes, Endereços/Filiais e Compradores
    console.log("Cadastrando clientes (PJ e PF), filiais e compradores...");
    const clienteMap = new Map<string, string>();
    const enderecoMap = new Map<string, string>();
    const compradorMap = new Map<string, string>();

    await db.transaction(async (tx) => {
      for (const c of CLIENTES_SEED) {
        const [createdCliente] = await tx
          .insert(clientes)
          .values({
            tipoPessoa: c.tipoPessoa,
            razaoSocial: c.razaoSocial,
            cpfCnpj: c.cpfCnpj,
            inscricaoEstadual: c.inscricaoEstadual,
            dataNascimento: c.dataNascimento,
            origemIndicacao: c.origemIndicacao,
            observacoes: c.observacoes,
          })
          .returning({ id: clientes.id });

        clienteMap.set(c.key, createdCliente.id);

        for (const end of c.enderecos) {
          const [createdEnd] = await tx
            .insert(enderecos)
            .values({
              clienteId: createdCliente.id,
              tipo: end.tipo,
              rotulo: end.rotulo,
              cnpjFilial: end.cnpjFilial ?? null,
              ieFilial: end.ieFilial ?? null,
              logradouro: end.logradouro,
              bairro: end.bairro ?? null,
              cidade: end.cidade,
              uf: end.uf,
              cep: end.cep ?? null,
              principal: end.principal,
            })
            .returning({ id: enderecos.id });
          enderecoMap.set(end.key, createdEnd.id);
        }

        for (const comp of c.compradores) {
          const [createdComp] = await tx
            .insert(compradores)
            .values({
              clienteId: createdCliente.id,
              nome: comp.nome,
              email: comp.email ?? null,
              emailFinanceiro: comp.emailFinanceiro ?? null,
              telefone: comp.telefone ?? null,
              departamento: comp.departamento ?? null,
              ativo: comp.ativo,
            })
            .returning({ id: compradores.id });
          compradorMap.set(comp.key, createdComp.id);
        }
      }
    });

    // 4) Pedidos & Orçamentos (todos os 9 status, 3 templates, alertas, grades, mockups)
    console.log("Criando orçamentos, pedidos, itens com grade e arquivos da pasta...");

    interface SeedPedidoItemDef {
      descricaoTecnica: string;
      quantidade: number;
      valorUnitario: number;
      gradeTamanhos?: GradeTamanhos | null;
      mockupStoragePath?: string | null;
    }

    interface SeedPedidoArquivoDef {
      tipo: "PEDIDO_PDF" | "MOCKUP" | "ORDEM_COMPRA" | "NOTA_FISCAL" | "COMPROVANTE" | "OUTRO";
      nomeOriginal: string;
      storagePath: string;
      mimeType: string;
      tamanhoBytes: number;
    }

    interface SeedPedidoDef {
      key: string;
      numeroPedido: string | null;
      clienteKey: string;
      compradorKey: string;
      fornecedorId: string;
      enderecoFaturamentoKey: string;
      enderecoEntregaKey?: string | null;
      entregaMesmoFaturamento: boolean;
      acEntrega?: string | null;
      vendedor?: string;
      status:
        | "ORCAMENTO_RASCUNHO"
        | "AGUARDANDO_FORNECEDOR"
        | "ORCAMENTO_ENVIADO"
        | "APROVADO"
        | "EM_PRODUCAO"
        | "EM_TRANSITO"
        | "ENTREGUE"
        | "CANCELADO"
        | "PERDIDO";
      condicaoPagamento?: string | null;
      formaPagamento?: "DEPOSITO" | "BOLETO" | "PIX" | "OUTRO" | null;
      ordemCompra?: string | null;
      dataOrcamento: string;
      dataPedido?: string | null;
      proximoFollowup?: string | null;
      prazoEntregaDias?: number | null;
      dataSaidaFabrica?: string | null;
      dataEntregaCliente?: string | null;
      desconto?: number;
      eventoFeira?: string | null;
      obsNotaFiscal?: string | null;
      observacoes?: string | null;
      ocorrencias?: string | null;
      itens: SeedPedidoItemDef[];
      arquivos?: SeedPedidoArquivoDef[];
    }

    // Grades pré-calculadas (soma sempre 100% consistente com quantidade)
    const gPescariaHortitec = makeGrade("UNISSEX", { P: 15, M: 35, G: 40, GG: 20, "3G": 10 }); // 120
    const gSocialMascAguard = makeGrade("MASCULINO", { P: 8, M: 18, G: 22, GG: 10, "3G": 2 }); // 60
    const gSocialFemAguard = makeGrade("FEMININO", { PP: 6, P: 14, M: 14, G: 6 }); // 40
    const gPoloMascVale = makeGrade("MASCULINO", { P: 10, M: 30, G: 35, GG: 18, "3G": 7 }); // 100
    const gPoloFemVale = makeGrade("FEMININO", { PP: 5, P: 15, M: 18, G: 10, GG: 2 }); // 50
    const gPoloMasc4712B = makeGrade("MASCULINO", { P: 12, M: 28, G: 36, GG: 16, "3G": 6, "4G": 2 }); // 100
    const gPoloFem4712B = makeGrade("FEMININO", { PP: 8, P: 18, M: 22, G: 10, GG: 2 }); // 60
    const gSocialMasc4718 = makeGrade("MASCULINO", { P: 10, M: 24, G: 26, GG: 14, "3G": 6 }); // 80
    const gSocialFem4718 = makeGrade("FEMININO", { PP: 6, P: 16, M: 18, G: 8, GG: 2 }); // 50
    const gCareca4718 = makeGrade("UNISSEX", { P: 25, M: 55, G: 65, GG: 35, "3G": 15, "4G": 5 }); // 200
    const gPescaria2044 = makeGrade("UNISSEX", { P: 10, M: 25, G: 30, GG: 18, "3G": 10, "4G": 5, ESP: 2 }); // 100
    const gPoloMasc4715 = makeGrade("MASCULINO", { P: 10, M: 20, G: 25, GG: 15, "3G": 5 }); // 75
    const gInfantil4715 = makeGrade("INFANTIL", { PP: 5, P: 10, M: 10, G: 5 }); // 30
    const gSocial4698 = makeGrade("MASCULINO", { P: 12, M: 25, G: 28, GG: 15 }); // 80

    const PEDIDOS_SEED: SeedPedidoDef[] = [
      // ------------------------------------------
      // 1. ORCAMENTO_RASCUNHO
      // ------------------------------------------
      {
        key: "orc_rascunho_hortitec",
        numeroPedido: null,
        clienteKey: "vale_verde",
        compradorKey: "vale_rafael",
        fornecedorId: fornSulTex,
        enderecoFaturamentoKey: "vale_matriz",
        entregaMesmoFaturamento: true,
        acEntrega: "Rafael Zimmer (Marketing)",
        status: "ORCAMENTO_RASCUNHO",
        condicaoPagamento: "28 DIAS",
        formaPagamento: "BOLETO",
        dataOrcamento: hojeIso,
        proximoFollowup: addDaysToIsoDate(hojeIso, 6),
        prazoEntregaDias: 25,
        eventoFeira: "HORTITEC",
        observacoes:
          "Rascunho inicial aguardando definição da arte final com o marketing da cooperativa antes de enviar proposta.",
        itens: [
          {
            descricaoTecnica:
              "Camisa de Pescaria manga longa tecido Dry UV50+, sublimação total frente/costas/mangas com logo Vale Verde e punho anatômico",
            quantidade: gPescariaHortitec.total,
            valorUnitario: 68.5,
            gradeTamanhos: gPescariaHortitec.grade,
          },
        ],
      },

      // ------------------------------------------
      // 2. AGUARDANDO_FORNECEDOR (1 atrasado para alerta + 1 futuro)
      // ------------------------------------------
      {
        key: "orc_aguard_agatha_atrasado",
        numeroPedido: null,
        clienteKey: "terrasul",
        compradorKey: "terrasul_eduardo",
        fornecedorId: fornAgatha,
        enderecoFaturamentoKey: "terrasul_matriz",
        entregaMesmoFaturamento: true,
        acEntrega: "Eduardo Klein",
        status: "AGUARDANDO_FORNECEDOR",
        condicaoPagamento: "30 DIAS",
        formaPagamento: "BOLETO",
        dataOrcamento: addDaysToIsoDate(hojeIso, -6),
        proximoFollowup: addDaysToIsoDate(hojeIso, -1), // ALERTA: atrasado há 1 dia
        prazoEntregaDias: 30,
        eventoFeira: "EXPO DIRETO",
        observacoes:
          "Solicitada cotação atualizada de tecido tricoline fio 60 para a Agatha. Cobrar retorno da Patrícia hoje.",
        itens: [
          {
            descricaoTecnica:
              "Camisa Social Masculina manga longa tricoline azul-marinho com bordado TerraSul no bolso esquerdo",
            quantidade: gSocialMascAguard.total,
            valorUnitario: 98.0,
            gradeTamanhos: gSocialMascAguard.grade,
          },
          {
            descricaoTecnica:
              "Camisa Social Feminina manga longa tricoline azul-marinho acinturada com bordado TerraSul no peito esquerdo",
            quantidade: gSocialFemAguard.total,
            valorUnitario: 96.0,
            gradeTamanhos: gSocialFemAguard.grade,
          },
        ],
      },
      {
        key: "orc_aguard_dks_futuro",
        numeroPedido: null,
        clienteKey: "maria_nogueira",
        compradorKey: "maria_comprador",
        fornecedorId: fornDks,
        enderecoFaturamentoKey: "maria_sede",
        entregaMesmoFaturamento: true,
        acEntrega: "Maria Helena",
        status: "AGUARDANDO_FORNECEDOR",
        condicaoPagamento: "50% ENTRADA + 50% NA ENTREGA",
        formaPagamento: "PIX",
        dataOrcamento: addDaysToIsoDate(hojeIso, -2),
        proximoFollowup: addDaysToIsoDate(hojeIso, 4),
        prazoEntregaDias: 20,
        eventoFeira: "SHOW SAFRA",
        observacoes:
          "Aguardando foto da piloto do bordado dourado na DKS Bonés para encaminhar à cliente.",
        itens: [
          {
            descricaoTecnica:
              "Boné modelo Americano sarja marrom café com tela bege, bordado frontal em alto relevo dourado Haras Nogueira e fecho snapback",
            quantidade: 150,
            valorUnitario: 34.9,
          },
        ],
      },

      // ------------------------------------------
      // 3. ORCAMENTO_ENVIADO (2 alertas no Painel do Dia + 1 futuro)
      // ------------------------------------------
      {
        key: "orc_enviado_agroforte_atrasado",
        numeroPedido: null,
        clienteKey: "agroforte",
        compradorKey: "agroforte_camila",
        fornecedorId: fornDks,
        enderecoFaturamentoKey: "agroforte_matriz",
        enderecoEntregaKey: "agroforte_entrega",
        entregaMesmoFaturamento: false,
        acEntrega: "Camila Duarte / Galpão Feiras",
        status: "ORCAMENTO_ENVIADO",
        condicaoPagamento: "30 DIAS",
        formaPagamento: "BOLETO",
        dataOrcamento: addDaysToIsoDate(hojeIso, -8),
        proximoFollowup: addDaysToIsoDate(hojeIso, -3), // ALERTA: atrasado há 3 dias
        prazoEntregaDias: 20,
        eventoFeira: "AGRISHOW",
        observacoes:
          "Orçamento enviado por e-mail para Camila Duarte. Cliente avaliando fechamento para o lote principal da Agrishow.",
        itens: [
          {
            descricaoTecnica:
              "Boné Trucker frente espuma verde bandeira, tela traseira branca, aba curva com sanduíche amarelo e bordado frontal 3D AgroForte",
            quantidade: 500,
            valorUnitario: 27.9,
            mockupStoragePath: assets.boneAgroPath,
          },
          {
            descricaoTecnica:
              "Boné Premium sarja tinturada verde musgo com patch emborrachado frontal (linha VIP produtores)",
            quantidade: 100,
            valorUnitario: 39.5,
          },
        ],
        arquivos: [
          {
            tipo: "MOCKUP",
            nomeOriginal: "mockup_bone_agroforte_agrishow.png",
            storagePath: assets.boneAgroPath,
            mimeType: "image/png",
            tamanhoBytes: assets.boneAgroSize,
          },
        ],
      },
      {
        key: "orc_enviado_campo_hoje",
        numeroPedido: null,
        clienteKey: "campo_negocio",
        compradorKey: "campo_beatriz",
        fornecedorId: fornElo,
        enderecoFaturamentoKey: "campo_matriz",
        enderecoEntregaKey: "campo_deposito",
        entregaMesmoFaturamento: false,
        acEntrega: "Beatriz Salles — Doca B",
        status: "ORCAMENTO_ENVIADO",
        condicaoPagamento: "21 DIAS",
        formaPagamento: "DEPOSITO",
        dataOrcamento: addDaysToIsoDate(hojeIso, -5),
        proximoFollowup: hojeIso, // ALERTA: vence hoje
        prazoEntregaDias: 15,
        eventoFeira: "SIPAT",
        observacoes:
          "Proposta enviada para evento corporativo de cliente final atendido pela agência. Retornar hoje à tarde para confirmar OC.",
        itens: [
          {
            descricaoTecnica:
              "Garrafa Térmica Inox parede dupla 650ml preta fosca com gravação a laser 1 lado",
            quantidade: 250,
            valorUnitario: 52.0,
            mockupStoragePath: assets.kitEloPath,
          },
          {
            descricaoTecnica:
              "Chaveiro metálico corporativo com resina personalizada frente e verso + caixa presente",
            quantidade: 250,
            valorUnitario: 11.4,
          },
        ],
        arquivos: [
          {
            tipo: "MOCKUP",
            nomeOriginal: "mockup_kit_sipat_elo.png",
            storagePath: assets.kitEloPath,
            mimeType: "image/png",
            tamanhoBytes: assets.kitEloSize,
          },
        ],
      },
      {
        key: "orc_enviado_vale_futuro",
        numeroPedido: null,
        clienteKey: "vale_verde",
        compradorKey: "vale_simone",
        fornecedorId: fornAgatha,
        enderecoFaturamentoKey: "vale_matriz",
        entregaMesmoFaturamento: true,
        acEntrega: "Simone Becker (Suprimentos)",
        status: "ORCAMENTO_ENVIADO",
        condicaoPagamento: "30/45 DIAS",
        formaPagamento: "BOLETO",
        dataOrcamento: addDaysToIsoDate(hojeIso, -2),
        proximoFollowup: addDaysToIsoDate(hojeIso, 5), // futuro, não alerta hoje
        prazoEntregaDias: 28,
        desconto: 300,
        eventoFeira: "SHOW RURAL",
        observacoes:
          "Desconto comercial concedido pela quantidade total de 150 peças.",
        itens: [
          {
            descricaoTecnica:
              "Camisa Polo Piquet PA Masculina verde bandeira com gola retilínea contrastante e bordado Vale Verde no peito",
            quantidade: gPoloMascVale.total,
            valorUnitario: 74.9,
            gradeTamanhos: gPoloMascVale.grade,
          },
          {
            descricaoTecnica:
              "Camisa Polo Piquet PA Feminina baby look verde bandeira com bordado Vale Verde no peito",
            quantidade: gPoloFemVale.total,
            valorUnitario: 71.9,
            gradeTamanhos: gPoloFemVale.grade,
          },
        ],
      },

      // ------------------------------------------
      // 4. APROVADO (2 pedidos: 1 DKS Bonés PF + 1 Agatha 4712B com grade & desconto)
      // ------------------------------------------
      {
        key: "ped_aprovado_0465_pf",
        numeroPedido: "0465",
        clienteKey: "joao_mendes",
        compradorKey: "joao_claudia",
        fornecedorId: fornDks,
        enderecoFaturamentoKey: "joao_fazenda",
        entregaMesmoFaturamento: true,
        acEntrega: "Cláudia Mendes (Escritório Fazenda)",
        status: "APROVADO",
        condicaoPagamento: "21 DIAS",
        formaPagamento: "PIX",
        ordemCompra: "RESGATE-AGRO-2026-884",
        dataOrcamento: clampDateToCurrentMonth(hojeIso, 6),
        dataPedido: clampDateToCurrentMonth(hojeIso, 2),
        prazoEntregaDias: 18,
        dataSaidaFabrica: addDaysToIsoDate(hojeIso, 15),
        eventoFeira: "SHOW SAFRA",
        obsNotaFiscal:
          "MENCIONAR NA NOTA FISCAL: RESGATE PROGRAMA DE PONTOS SAFRA 2026 — CÓD. 884-BA. FATURAR NO CPF DE PRODUTOR RURAL COM IE.",
        observacoes:
          "Arte aprovada via WhatsApp por Cláudia Mendes. Enviar amostra fotográfica do primeiro boné bordado antes da produção em série.",
        itens: [
          {
            descricaoTecnica:
              "Boné Trucker DKS frente sarja verde musgo, tela bege, aba curva com costura contrastante, bordado 3D frontal Fazenda Santa Clara e escrita lateral",
            quantidade: 300,
            valorUnitario: 31.5,
            mockupStoragePath: assets.boneAgroPath,
          },
        ],
        arquivos: [
          {
            tipo: "MOCKUP",
            nomeOriginal: "mockup_aprovado_0465_fazenda_santa_clara.png",
            storagePath: assets.boneAgroPath,
            mimeType: "image/png",
            tamanhoBytes: assets.boneAgroSize,
          },
          {
            tipo: "ORDEM_COMPRA",
            nomeOriginal: "autorizacao_resgate_0465.pdf",
            storagePath: assets.ocPdfPath,
            mimeType: "application/pdf",
            tamanhoBytes: assets.ocPdfSize,
          },
        ],
      },
      {
        key: "ped_aprovado_4712B_agatha",
        numeroPedido: "4712B",
        clienteKey: "agroforte",
        compradorKey: "agroforte_camila",
        fornecedorId: fornAgatha,
        enderecoFaturamentoKey: "agroforte_matriz",
        enderecoEntregaKey: "agroforte_filial",
        entregaMesmoFaturamento: false,
        acEntrega: "Rodrigo Bastos — Recebimento CD Piracaia",
        status: "APROVADO",
        condicaoPagamento: "76 dias, depósito",
        formaPagamento: "DEPOSITO",
        ordemCompra: "OC-2026-0891",
        dataOrcamento: clampDateToCurrentMonth(hojeIso, 9),
        dataPedido: clampDateToCurrentMonth(hojeIso, 3),
        prazoEntregaDias: 25,
        dataSaidaFabrica: addDaysToIsoDate(hojeIso, 19),
        desconto: 450,
        eventoFeira: "AGRISHOW",
        obsNotaFiscal: "INDICAR OC-2026-0891 E ENDEREÇO DE ENTREGA FILIAL PIRACAIA/SP.",
        observacoes:
          "Pedido complementar (sufixo B) com grade definitiva validada pelo RH da AgroForte. Conferir bordado da manga direita.",
        itens: [
          {
            descricaoTecnica:
              "Camisa Polo Masculina Piquet 50% Algodão / 50% Poliéster verde institucional com friso branco na gola e bordado AgroForte peito + manga",
            quantidade: gPoloMasc4712B.total,
            valorUnitario: 73.9,
            gradeTamanhos: gPoloMasc4712B.grade,
            mockupStoragePath: assets.poloAgathaPath,
          },
          {
            descricaoTecnica:
              "Camisa Polo Feminina Piquet 50% Algodão / 50% Poliéster verde institucional modelagem baby look com bordado AgroForte peito + manga",
            quantidade: gPoloFem4712B.total,
            valorUnitario: 69.9,
            gradeTamanhos: gPoloFem4712B.grade,
          },
        ],
        arquivos: [
          {
            tipo: "MOCKUP",
            nomeOriginal: "mockup_polos_4712B_agroforte.png",
            storagePath: assets.poloAgathaPath,
            mimeType: "image/png",
            tamanhoBytes: assets.poloAgathaSize,
          },
          {
            tipo: "ORDEM_COMPRA",
            nomeOriginal: "OC-2026-0891_AgroForte.pdf",
            storagePath: assets.ocPdfPath,
            mimeType: "application/pdf",
            tamanhoBytes: assets.ocPdfSize,
          },
        ],
      },

      // ------------------------------------------
      // 5. EM_PRODUCAO (3 alertas de fábrica + 1 no prazo)
      // ------------------------------------------
      {
        key: "ped_prod_0466_atrasado",
        numeroPedido: "0466",
        clienteKey: "terrasul",
        compradorKey: "terrasul_eduardo",
        fornecedorId: fornDks,
        enderecoFaturamentoKey: "terrasul_matriz",
        enderecoEntregaKey: "terrasul_filial",
        entregaMesmoFaturamento: false,
        acEntrega: "Eduardo Klein — Filial Passo Fundo",
        status: "EM_PRODUCAO",
        condicaoPagamento: "30 DIAS",
        formaPagamento: "BOLETO",
        ordemCompra: "TS-4412",
        dataOrcamento: addDaysToIsoDate(hojeIso, -24),
        dataPedido: clampDateToCurrentMonth(hojeIso, 14),
        prazoEntregaDias: 18,
        dataSaidaFabrica: addDaysToIsoDate(hojeIso, -2), // ALERTA URGENTE: atrasado há 2 dias
        eventoFeira: "EXPO DIRETO",
        observacoes:
          "Cobrar posição imediata da DKS Bonés — prazo para Expo Direto está apertado.",
        ocorrencias:
          "Fábrica informou atraso de 48h na chegada do regulador plástico azul-marinho; cobrado embarque prioritário.",
        itens: [
          {
            descricaoTecnica:
              "Boné modelo 6 gomos sarja azul-marinho com silk alto relevo frontal TerraSul Máquinas e etiqueta clip traseira",
            quantidade: 400,
            valorUnitario: 29.9,
            mockupStoragePath: assets.boneMaquinasPath,
          },
        ],
        arquivos: [
          {
            tipo: "MOCKUP",
            nomeOriginal: "mockup_bone_0466_terrasul.png",
            storagePath: assets.boneMaquinasPath,
            mimeType: "image/png",
            tamanhoBytes: assets.boneMaquinasSize,
          },
          {
            tipo: "ORDEM_COMPRA",
            nomeOriginal: "OC_TS-4412_TerraSul.pdf",
            storagePath: assets.ocPdfPath,
            mimeType: "application/pdf",
            tamanhoBytes: assets.ocPdfSize,
          },
        ],
      },
      {
        key: "ped_prod_4718_amanha",
        numeroPedido: "4718",
        clienteKey: "campo_negocio",
        compradorKey: "campo_larissa",
        fornecedorId: fornAgatha,
        enderecoFaturamentoKey: "campo_matriz",
        enderecoEntregaKey: "campo_deposito",
        entregaMesmoFaturamento: false,
        acEntrega: "Larissa Monteiro — Expedição Agrishow",
        status: "EM_PRODUCAO",
        condicaoPagamento: "30 DIAS",
        formaPagamento: "BOLETO",
        ordemCompra: "AG-9034/2026",
        dataOrcamento: addDaysToIsoDate(hojeIso, -26),
        dataPedido: clampDateToCurrentMonth(hojeIso, 12),
        prazoEntregaDias: 20,
        dataSaidaFabrica: addDaysToIsoDate(hojeIso, 1), // ALERTA: sai amanhã!
        desconto: 620,
        eventoFeira: "AGRISHOW",
        obsNotaFiscal: "MENCIONAR OC AG-9034/2026 E PROJETO ESTANDE AGRISHOW.",
        observacoes:
          "Embalar peças individualmente em saco plástico com etiqueta visível de tamanho para agilizar distribuição no estande.",
        itens: [
          {
            descricaoTecnica:
              "Camisa Social Masculina manga longa algodão egípcio branca com bordado discreto no peito",
            quantidade: gSocialMasc4718.total,
            valorUnitario: 109.0,
            gradeTamanhos: gSocialMasc4718.grade,
            mockupStoragePath: assets.poloAgathaPath,
          },
          {
            descricaoTecnica:
              "Camisa Social Feminina manga longa algodão egípcio branca com bordado discreto no peito",
            quantidade: gSocialFem4718.total,
            valorUnitario: 105.0,
            gradeTamanhos: gSocialFem4718.grade,
          },
          {
            descricaoTecnica:
              "Camiseta gola careca 100% algodão penteado fio 30.1 verde escuro com silk frente e costas (equipe montagem)",
            quantidade: gCareca4718.total,
            valorUnitario: 36.5,
            gradeTamanhos: gCareca4718.grade,
          },
        ],
        arquivos: [
          {
            tipo: "MOCKUP",
            nomeOriginal: "mockup_uniformes_4718_agrishow.png",
            storagePath: assets.poloAgathaPath,
            mimeType: "image/png",
            tamanhoBytes: assets.poloAgathaSize,
          },
          {
            tipo: "ORDEM_COMPRA",
            nomeOriginal: "OC_AG-9034_CampoNegocio.pdf",
            storagePath: assets.ocPdfPath,
            mimeType: "application/pdf",
            tamanhoBytes: assets.ocPdfSize,
          },
        ],
      },
      {
        key: "ped_prod_114_prazo_calculado",
        numeroPedido: "114",
        clienteKey: "nutricampo",
        compradorKey: "nutricampo_paula",
        fornecedorId: fornElo,
        enderecoFaturamentoKey: "nutricampo_matriz",
        entregaMesmoFaturamento: true,
        acEntrega: "Paula Rezende (RH / Portaria 1)",
        status: "EM_PRODUCAO",
        condicaoPagamento: "28 DIAS",
        formaPagamento: "BOLETO",
        ordemCompra: "NC-2026-312",
        dataOrcamento: addDaysToIsoDate(hojeIso, -18),
        dataPedido: addDaysToIsoDate(hojeIso, -13), // Sem dataSaidaFabrica; +15 dias = hoje + 2 dias!
        prazoEntregaDias: 15,
        dataSaidaFabrica: null, // Testa cálculo automático por prazo_entrega_dias!
        eventoFeira: "SIPAT",
        observacoes:
          "Entrega programada para abertura da semana SIPAT da fábrica em Uberaba.",
        itens: [
          {
            descricaoTecnica:
              "Guarda-chuva invertido 120cm tecido pongee preto/verde com silk 1 cor em 2 gomos (logo NutriCampo)",
            quantidade: 180,
            valorUnitario: 58.9,
            mockupStoragePath: assets.kitEloPath,
          },
          {
            descricaoTecnica:
              "Chaveiro mosquetão metálico gravação a laser SIPAT 2026",
            quantidade: 180,
            valorUnitario: 9.5,
          },
        ],
        arquivos: [
          {
            tipo: "MOCKUP",
            nomeOriginal: "mockup_kit_sipat_114_nutricampo.png",
            storagePath: assets.kitEloPath,
            mimeType: "image/png",
            tamanhoBytes: assets.kitEloSize,
          },
        ],
      },
      {
        key: "ped_prod_2044_no_prazo",
        numeroPedido: "2044",
        clienteKey: "maria_nogueira",
        compradorKey: "maria_comprador",
        fornecedorId: fornSulTex,
        enderecoFaturamentoKey: "maria_sede",
        entregaMesmoFaturamento: true,
        acEntrega: "Maria Helena Nogueira",
        status: "EM_PRODUCAO",
        condicaoPagamento: "50% ENTRADA + 50% EMBARQUE",
        formaPagamento: "PIX",
        ordemCompra: "LEILAO-2026-01",
        dataOrcamento: clampDateToCurrentMonth(hojeIso, 7),
        dataPedido: clampDateToCurrentMonth(hojeIso, 4),
        prazoEntregaDias: 22,
        dataSaidaFabrica: addDaysToIsoDate(hojeIso, 12), // Confortavelmente no prazo
        eventoFeira: "SHOW SAFRA",
        observacoes:
          "Entrada de 50% já paga via PIX. Enviar código de rastreio aéreo assim que despachar.",
        itens: [
          {
            descricaoTecnica:
              "Camisa de Pescaria UV50+ sublimação total estampa exclusiva Haras & Agro Nogueira com capuz removível",
            quantidade: gPescaria2044.total,
            valorUnitario: 78.0,
            gradeTamanhos: gPescaria2044.grade,
          },
        ],
        arquivos: [
          {
            tipo: "COMPROVANTE",
            nomeOriginal: "comprovante_pix_entrada_2044.pdf",
            storagePath: assets.compPdfPath,
            mimeType: "application/pdf",
            tamanhoBytes: assets.compPdfSize,
          },
        ],
      },

      // ------------------------------------------
      // 6. EM_TRANSITO (1 atrasado > 5 dias + 1 no prazo)
      // ------------------------------------------
      {
        key: "ped_transito_0467_atrasado",
        numeroPedido: "0467",
        clienteKey: "agroforte",
        compradorKey: "agroforte_rodrigo",
        fornecedorId: fornDks,
        enderecoFaturamentoKey: "agroforte_matriz",
        enderecoEntregaKey: "agroforte_filial",
        entregaMesmoFaturamento: false,
        acEntrega: "Recebimento CD Piracaia",
        status: "EM_TRANSITO",
        condicaoPagamento: "30 DIAS",
        formaPagamento: "BOLETO",
        ordemCompra: "OC-2026-0840",
        dataOrcamento: addDaysToIsoDate(hojeIso, -30),
        dataPedido: clampDateToCurrentMonth(hojeIso, 18),
        prazoEntregaDias: 15,
        dataSaidaFabrica: addDaysToIsoDate(hojeIso, -7), // ALERTA: 7 dias em trânsito (> 5 dias)
        eventoFeira: "SHOW RURAL",
        observacoes:
          "Despachado via Transportadora Rodonaves. Cobrar confirmação de entrega no CD Piracaia.",
        itens: [
          {
            descricaoTecnica:
              "Boné Trucker DKS verde oliva e bege com aplique bordado AgroForte Show Rural",
            quantidade: 350,
            valorUnitario: 28.5,
            mockupStoragePath: assets.boneAgroPath,
          },
        ],
        arquivos: [
          {
            tipo: "MOCKUP",
            nomeOriginal: "mockup_0467_agroforte_show_rural.png",
            storagePath: assets.boneAgroPath,
            mimeType: "image/png",
            tamanhoBytes: assets.boneAgroSize,
          },
          {
            tipo: "ORDEM_COMPRA",
            nomeOriginal: "OC-2026-0840.pdf",
            storagePath: assets.ocPdfPath,
            mimeType: "application/pdf",
            tamanhoBytes: assets.ocPdfSize,
          },
          {
            tipo: "NOTA_FISCAL",
            nomeOriginal: "NF-e_0467_DKS_Bones.pdf",
            storagePath: assets.nfPdfPath,
            mimeType: "application/pdf",
            tamanhoBytes: assets.nfPdfSize,
          },
        ],
      },
      {
        key: "ped_transito_309_normal",
        numeroPedido: "309",
        clienteKey: "vale_verde",
        compradorKey: "vale_rafael",
        fornecedorId: fornPaulista,
        enderecoFaturamentoKey: "vale_matriz",
        enderecoEntregaKey: "vale_filial",
        entregaMesmoFaturamento: false,
        acEntrega: "Filial Toledo — A/C Rafael Zimmer",
        status: "EM_TRANSITO",
        condicaoPagamento: "28 DIAS",
        formaPagamento: "DEPOSITO",
        ordemCompra: "CVV-1908",
        dataOrcamento: addDaysToIsoDate(hojeIso, -22),
        dataPedido: clampDateToCurrentMonth(hojeIso, 10),
        prazoEntregaDias: 12,
        dataSaidaFabrica: addDaysToIsoDate(hojeIso, -2), // 2 dias em trânsito (no prazo)
        eventoFeira: "HORTITEC",
        observacoes:
          "Volumes conferidos na saída da Brindes Paulista (6 caixas lacradas).",
        itens: [
          {
            descricaoTecnica:
              "Kit Executivo Copo Térmico Inox 500ml com abridor + Caneta metálica preta gravação a laser logo Cooperativa Vale Verde",
            quantidade: 120,
            valorUnitario: 79.9,
            mockupStoragePath: assets.kitEloPath,
          },
        ],
        arquivos: [
          {
            tipo: "NOTA_FISCAL",
            nomeOriginal: "NF_309_Brindes_Paulista.pdf",
            storagePath: assets.nfPdfPath,
            mimeType: "application/pdf",
            tamanhoBytes: assets.nfPdfSize,
          },
          {
            tipo: "COMPROVANTE",
            nomeOriginal: "comprovante_deposito_309.pdf",
            storagePath: assets.compPdfPath,
            mimeType: "application/pdf",
            tamanhoBytes: assets.compPdfSize,
          },
        ],
      },

      // ------------------------------------------
      // 7. ENTREGUE (1 no mês atual + 3 históricos para ficha/Excel)
      // ------------------------------------------
      {
        key: "ped_entregue_4715_mes_atual",
        numeroPedido: "4715",
        clienteKey: "agroforte",
        compradorKey: "agroforte_camila",
        fornecedorId: fornAgatha,
        enderecoFaturamentoKey: "agroforte_matriz",
        entregaMesmoFaturamento: true,
        acEntrega: "Camila Duarte (Recepção)",
        status: "ENTREGUE",
        condicaoPagamento: "30 DIAS",
        formaPagamento: "DEPOSITO",
        ordemCompra: "OC-2026-0795",
        dataOrcamento: addDaysToIsoDate(hojeIso, -25),
        dataPedido: clampDateToCurrentMonth(hojeIso, 15),
        prazoEntregaDias: 12,
        dataSaidaFabrica: clampDateToCurrentMonth(hojeIso, 4),
        dataEntregaCliente: clampDateToCurrentMonth(hojeIso, 1),
        desconto: 200,
        eventoFeira: "AGRISHOW",
        observacoes:
          "Entrega recebida sem ressalvas. Cliente elogiou o acabamento do bordado.",
        itens: [
          {
            descricaoTecnica:
              "Camisa Polo Piquet Masculina branca com gola verde institucional e bordado AgroForte",
            quantidade: gPoloMasc4715.total,
            valorUnitario: 72.0,
            gradeTamanhos: gPoloMasc4715.grade,
            mockupStoragePath: assets.poloAgathaPath,
          },
          {
            descricaoTecnica:
              "Camiseta Infantil 100% algodão verde agro (ação Dia da Família AgroForte)",
            quantidade: gInfantil4715.total,
            valorUnitario: 34.0,
            gradeTamanhos: gInfantil4715.grade,
          },
        ],
        arquivos: [
          {
            tipo: "MOCKUP",
            nomeOriginal: "mockup_polo_4715.png",
            storagePath: assets.poloAgathaPath,
            mimeType: "image/png",
            tamanhoBytes: assets.poloAgathaSize,
          },
          {
            tipo: "ORDEM_COMPRA",
            nomeOriginal: "OC-2026-0795.pdf",
            storagePath: assets.ocPdfPath,
            mimeType: "application/pdf",
            tamanhoBytes: assets.ocPdfSize,
          },
          {
            tipo: "NOTA_FISCAL",
            nomeOriginal: "NF-e_4715_Agatha.pdf",
            storagePath: assets.nfPdfPath,
            mimeType: "application/pdf",
            tamanhoBytes: assets.nfPdfSize,
          },
          {
            tipo: "COMPROVANTE",
            nomeOriginal: "comprovante_liquidacao_4715.pdf",
            storagePath: assets.compPdfPath,
            mimeType: "application/pdf",
            tamanhoBytes: assets.compPdfSize,
          },
        ],
      },
      {
        key: "ped_entregue_0459_historico",
        numeroPedido: "0459",
        clienteKey: "campo_negocio",
        compradorKey: "campo_thiago",
        fornecedorId: fornDks,
        enderecoFaturamentoKey: "campo_matriz",
        enderecoEntregaKey: "campo_deposito",
        entregaMesmoFaturamento: false,
        acEntrega: "Thiago Prado — Doca B",
        status: "ENTREGUE",
        condicaoPagamento: "30 DIAS",
        formaPagamento: "BOLETO",
        ordemCompra: "AG-8710/2026",
        dataOrcamento: addDaysToIsoDate(hojeIso, -68),
        dataPedido: addDaysToIsoDate(hojeIso, -62),
        prazoEntregaDias: 15,
        dataSaidaFabrica: addDaysToIsoDate(hojeIso, -46),
        dataEntregaCliente: addDaysToIsoDate(hojeIso, -44),
        eventoFeira: "FEMAGRI",
        observacoes: "Lote completo entregue antes da montagem da feira.",
        ocorrencias:
          "Fábrica atrasou 2 dias na expedição por falta de aviamento da aba; resolvido via envio aéreo sem custo adicional para a agência.",
        itens: [
          {
            descricaoTecnica:
              "Boné Trucker frente branca com tela verde e bordado frontal 3D campanha Café Forte",
            quantidade: 600,
            valorUnitario: 26.5,
          },
        ],
      },
      {
        key: "ped_entregue_4698_historico",
        numeroPedido: "4698",
        clienteKey: "vale_verde",
        compradorKey: "vale_simone",
        fornecedorId: fornAgatha,
        enderecoFaturamentoKey: "vale_matriz",
        entregaMesmoFaturamento: true,
        acEntrega: "Simone Becker",
        status: "ENTREGUE",
        condicaoPagamento: "28/56 DIAS",
        formaPagamento: "BOLETO",
        ordemCompra: "CVV-1755",
        dataOrcamento: addDaysToIsoDate(hojeIso, -102),
        dataPedido: addDaysToIsoDate(hojeIso, -95),
        prazoEntregaDias: 20,
        dataSaidaFabrica: addDaysToIsoDate(hojeIso, -76),
        dataEntregaCliente: addDaysToIsoDate(hojeIso, -73),
        eventoFeira: "ANDAV",
        observacoes: "Uniformes da diretoria e consultores comerciais no congresso ANDAV.",
        itens: [
          {
            descricaoTecnica:
              "Camisa Social Masculina manga longa algodão fio 60 azul-claro com bordado Cooperativa Vale Verde",
            quantidade: gSocial4698.total,
            valorUnitario: 102.0,
            gradeTamanhos: gSocial4698.grade,
          },
        ],
      },
      {
        key: "ped_entregue_108_historico",
        numeroPedido: "108",
        clienteKey: "terrasul",
        compradorKey: "terrasul_vanessa",
        fornecedorId: fornElo,
        enderecoFaturamentoKey: "terrasul_matriz",
        entregaMesmoFaturamento: true,
        acEntrega: "Vanessa Moraes",
        status: "ENTREGUE",
        condicaoPagamento: "30 DIAS",
        formaPagamento: "OUTRO",
        ordemCompra: "TS-4190",
        dataOrcamento: addDaysToIsoDate(hojeIso, -125),
        dataPedido: addDaysToIsoDate(hojeIso, -118),
        prazoEntregaDias: 15,
        dataSaidaFabrica: addDaysToIsoDate(hojeIso, -104),
        dataEntregaCliente: addDaysToIsoDate(hojeIso, -100),
        eventoFeira: "SHOWTEC",
        observacoes: "Pagamento via TED corporativo na entrega.",
        ocorrencias:
          "5 unidades chegaram com risco leve na tampa; fornecedor repôs as peças em 72h.",
        itens: [
          {
            descricaoTecnica:
              "Guarda-chuva grande reforçado fibra de carbono azul-marinho com capa personalizada TerraSul",
            quantidade: 200,
            valorUnitario: 64.0,
          },
        ],
      },

      // ------------------------------------------
      // 8. CANCELADO
      // ------------------------------------------
      {
        key: "ped_cancelado_0461",
        numeroPedido: "0461",
        clienteKey: "nutricampo",
        compradorKey: "nutricampo_lucas",
        fornecedorId: fornDks,
        enderecoFaturamentoKey: "nutricampo_matriz",
        entregaMesmoFaturamento: true,
        status: "CANCELADO",
        condicaoPagamento: "30 DIAS",
        formaPagamento: "BOLETO",
        dataOrcamento: addDaysToIsoDate(hojeIso, -40),
        dataPedido: addDaysToIsoDate(hojeIso, -36),
        prazoEntregaDias: 20,
        eventoFeira: "FEMAGRI",
        observacoes:
          "Pedido cancelado em comum acordo antes do início do corte — cliente alterou identidade visual da campanha.",
        ocorrencias:
          "Cancelamento sem multa junto à DKS Bonés pois o bordado ainda não havia entrado em máquina.",
        itens: [
          {
            descricaoTecnica:
              "Boné Sarja bege com bordado frontal antigo NutriCampo",
            quantidade: 200,
            valorUnitario: 29.0,
          },
        ],
      },

      // ------------------------------------------
      // 9. PERDIDO
      // ------------------------------------------
      {
        key: "orc_perdido_terrasul",
        numeroPedido: null,
        clienteKey: "terrasul",
        compradorKey: "terrasul_vanessa",
        fornecedorId: fornPaulista,
        enderecoFaturamentoKey: "terrasul_matriz",
        entregaMesmoFaturamento: true,
        status: "PERDIDO",
        condicaoPagamento: "21 DIAS",
        dataOrcamento: addDaysToIsoDate(hojeIso, -20),
        prazoEntregaDias: 10,
        eventoFeira: "EXPO DIRETO",
        observacoes:
          "Cliente precisava de entrega em 48h para inauguração relâmpago e optou por gráfica local.",
        itens: [
          {
            descricaoTecnica:
              "Caneta metálica executiva azul-marinho gravação laser + estojo veludo",
            quantidade: 300,
            valorUnitario: 14.5,
          },
        ],
      },
    ];

    const pedidoMap = new Map<string, string>();

    await db.transaction(async (tx) => {
      for (const p of PEDIDOS_SEED) {
        const totais = calcularTotaisPedido(
          p.itens.map((item) => ({
            quantidade: item.quantidade,
            valor_unitario: item.valorUnitario,
          })),
          p.desconto ?? 0
        );

        const [createdPedido] = await tx
          .insert(pedidos)
          .values({
            numeroPedido: p.numeroPedido,
            clienteId: clienteMap.get(p.clienteKey)!,
            compradorId: compradorMap.get(p.compradorKey)!,
            fornecedorId: p.fornecedorId,
            enderecoFaturamentoId: enderecoMap.get(p.enderecoFaturamentoKey)!,
            enderecoEntregaId: p.entregaMesmoFaturamento
              ? null
              : p.enderecoEntregaKey
                ? enderecoMap.get(p.enderecoEntregaKey)!
                : null,
            entregaMesmoFaturamento: p.entregaMesmoFaturamento,
            acEntrega: p.acEntrega ?? null,
            vendedor: p.vendedor ?? "Flavio",
            status: p.status,
            condicaoPagamento: p.condicaoPagamento ?? null,
            formaPagamento: p.formaPagamento ?? null,
            ordemCompra: p.ordemCompra ?? null,
            dataOrcamento: p.dataOrcamento,
            dataPedido: p.dataPedido ?? null,
            proximoFollowup: p.proximoFollowup ?? null,
            prazoEntregaDias: p.prazoEntregaDias ?? null,
            dataSaidaFabrica: p.dataSaidaFabrica ?? null,
            dataEntregaCliente: p.dataEntregaCliente ?? null,
            subtotal: totais.subtotal.toFixed(2),
            desconto: totais.desconto.toFixed(2),
            valorTotal: totais.valorTotal.toFixed(2),
            eventoFeira: p.eventoFeira ?? null,
            obsNotaFiscal: p.obsNotaFiscal ?? null,
            observacoes: p.observacoes ?? null,
            ocorrencias: p.ocorrencias ?? null,
          })
          .returning({ id: pedidos.id });

        pedidoMap.set(p.key, createdPedido.id);

        await tx.insert(pedidoItens).values(
          p.itens.map((item, idx) => ({
            pedidoId: createdPedido.id,
            descricaoTecnica: item.descricaoTecnica,
            quantidade: item.quantidade,
            valorUnitario: item.valorUnitario.toFixed(2),
            valorTotal: totais.itens[idx].valorTotal.toFixed(2),
            gradeTamanhos: item.gradeTamanhos ?? null,
            mockupStoragePath: item.mockupStoragePath ?? null,
            ordem: idx + 1,
          }))
        );

        if (p.arquivos && p.arquivos.length > 0) {
          await tx.insert(pedidoArquivos).values(
            p.arquivos.map((arq) => ({
              pedidoId: createdPedido.id,
              tipo: arq.tipo,
              nomeOriginal: arq.nomeOriginal,
              storagePath: arq.storagePath,
              mimeType: arq.mimeType,
              tamanhoBytes: arq.tamanhoBytes,
            }))
          );
        }
      }
    });

    // 5) Linha do Tempo de Interações com Clientes
    console.log("Registrando linha do tempo de contatos (interações)...");

    const INTERACOES_SEED: Array<{
      clienteKey: string;
      compradorKey?: string;
      pedidoKey?: string;
      tipo: "EMAIL" | "WHATSAPP" | "LIGACAO" | "FOLLOWUP" | "OBSERVACAO";
      resumo: string;
      daysAgo: number;
    }> = [
      {
        clienteKey: "agroforte",
        compradorKey: "agroforte_camila",
        pedidoKey: "orc_enviado_agroforte_atrasado",
        tipo: "EMAIL",
        resumo:
          "Enviado orçamento de 500 bonés Trucker + 100 bonés Premium com mockup técnico para Agrishow.",
        daysAgo: 8,
      },
      {
        clienteKey: "agroforte",
        compradorKey: "agroforte_camila",
        pedidoKey: "orc_enviado_agroforte_atrasado",
        tipo: "FOLLOWUP",
        resumo:
          "Cobrança de retorno via WhatsApp — Camila informou que diretoria aprovaria orçamento até o fim da semana.",
        daysAgo: 3,
      },
      {
        clienteKey: "agroforte",
        compradorKey: "agroforte_camila",
        pedidoKey: "ped_aprovado_4712B_agatha",
        tipo: "EMAIL",
        resumo:
          "Recebida OC-2026-0891 e planilha final de grade de tamanhos (160 polos) para o pedido 4712B.",
        daysAgo: 3,
      },
      {
        clienteKey: "agroforte",
        compradorKey: "agroforte_rodrigo",
        pedidoKey: "ped_transito_0467_atrasado",
        tipo: "LIGACAO",
        resumo:
          "Ligação para o CD Piracaia para acompanhar recebimento da NF do pedido 0467 (Show Rural).",
        daysAgo: 1,
      },
      {
        clienteKey: "campo_negocio",
        compradorKey: "campo_beatriz",
        pedidoKey: "orc_enviado_campo_hoje",
        tipo: "EMAIL",
        resumo:
          "Enviada proposta comercial de 250 kits garrafa térmica + chaveiro para campanha SIPAT.",
        daysAgo: 5,
      },
      {
        clienteKey: "campo_negocio",
        compradorKey: "campo_larissa",
        pedidoKey: "ped_prod_4718_amanha",
        tipo: "WHATSAPP",
        resumo:
          "Confirmada embalagem individual etiquetada por tamanho com a Agatha; saída programada para amanhã.",
        daysAgo: 1,
      },
      {
        clienteKey: "campo_negocio",
        compradorKey: "campo_thiago",
        pedidoKey: "ped_entregue_0459_historico",
        tipo: "OBSERVACAO",
        resumo:
          "Cliente muito satisfeito com a solução rápida do frete aéreo na Femagri; prometeu indicar nova conta.",
        daysAgo: 42,
      },
      {
        clienteKey: "joao_mendes",
        compradorKey: "joao_claudia",
        pedidoKey: "ped_aprovado_0465_pf",
        tipo: "WHATSAPP",
        resumo:
          "Cláudia aprovou o mockup 3D dos bonés da Fazenda Santa Clara e enviou o código de resgate para constar na NF.",
        daysAgo: 2,
      },
      {
        clienteKey: "joao_mendes",
        compradorKey: "joao_claudia",
        tipo: "EMAIL",
        resumo:
          "Enviado catálogo de camisas de pescaria UV50+ para próxima ação com equipe da fazenda.",
        daysAgo: 14,
      },
      {
        clienteKey: "vale_verde",
        compradorKey: "vale_rafael",
        pedidoKey: "ped_transito_309_normal",
        tipo: "EMAIL",
        resumo:
          "Enviada NF-e e código de rastreamento dos 120 kits copo térmico + caneta (Pedido 309).",
        daysAgo: 2,
      },
      {
        clienteKey: "vale_verde",
        compradorKey: "vale_simone",
        pedidoKey: "orc_enviado_vale_futuro",
        tipo: "EMAIL",
        resumo:
          "Enviado orçamento com desconto especial para 150 camisas polo Show Rural.",
        daysAgo: 2,
      },
      {
        clienteKey: "terrasul",
        compradorKey: "terrasul_eduardo",
        pedidoKey: "ped_prod_0466_atrasado",
        tipo: "LIGACAO",
        resumo:
          "Alinhado com Eduardo sobre o atraso de 48h na DKS Bonés; fábrica garantiu embarque expresso para Expo Direto.",
        daysAgo: 1,
      },
      {
        clienteKey: "terrasul",
        compradorKey: "terrasul_eduardo",
        pedidoKey: "orc_aguard_agatha_atrasado",
        tipo: "FOLLOWUP",
        resumo:
          "Aguardando tabela atualizada da Agatha para responder cotação de 100 camisas sociais.",
        daysAgo: 2,
      },
      {
        clienteKey: "nutricampo",
        compradorKey: "nutricampo_paula",
        pedidoKey: "ped_prod_114_prazo_calculado",
        tipo: "WHATSAPP",
        resumo:
          "Paula confirmou recebimento da amostra virtual do guarda-chuva invertido SIPAT e horário da portaria.",
        daysAgo: 6,
      },
      {
        clienteKey: "maria_nogueira",
        compradorKey: "maria_comprador",
        pedidoKey: "ped_prod_2044_no_prazo",
        tipo: "WHATSAPP",
        resumo:
          "Recebido comprovante do PIX de 50% de entrada das camisas UV50+ (Pedido 2044).",
        daysAgo: 4,
      },
      {
        clienteKey: "biosolo",
        compradorKey: "biosolo_andre",
        tipo: "EMAIL",
        resumo:
          "Enviada apresentação institucional da FGV Representações e catálogo de brindes para feiras do agro.",
        daysAgo: 7,
      },
      {
        clienteKey: "biosolo",
        compradorKey: "biosolo_andre",
        tipo: "WHATSAPP",
        resumo:
          "André pediu para retomar contato na próxima semana para orçar bonés e polos da equipe de vendas.",
        daysAgo: 2,
      },
    ];

    await db.insert(interacoesCliente).values(
      INTERACOES_SEED.map((i) => ({
        clienteId: clienteMap.get(i.clienteKey)!,
        compradorId: i.compradorKey ? compradorMap.get(i.compradorKey)! : null,
        pedidoId: i.pedidoKey ? pedidoMap.get(i.pedidoKey)! : null,
        tipo: i.tipo,
        resumo: i.resumo,
        dataInteracao: isoDateToDateAtHour(addDaysToIsoDate(hojeIso, -i.daysAgo), 15),
      }))
    );

    // 6) Conteúdos Editoriais (Fase 2 — já válidos com schema Zod)
    console.log("Cadastrando exemplos no calendário editorial (conteúdos)...");

    const CONTEUDOS_SEED: Array<{
      tema: string;
      formato: "CARROSSEL" | "REELS_SEM_APARECER" | "FOTO_UNICA";
      ocasiaoFeira: string;
      dataPublicacao: string;
      status: "IDEIA" | "ROTEIRO_PRONTO" | "ARTE_CANVA" | "POSTADO";
      legendaIa: string | null;
      roteiroCenasIa: RoteiroCenas | null;
      linkCanva: string | null;
    }> = [
      {
        tema: "Como escolher o boné ideal para se destacar na Agrishow (bordado 3D x patch emborrachado)",
        formato: "CARROSSEL",
        ocasiaoFeira: "AGRISHOW",
        dataPublicacao: addDaysToIsoDate(hojeIso, 5),
        status: "ROTEIRO_PRONTO",
        legendaIa:
          "Sua marca já está preparando os brindes da próxima feira do agro? 🌾🧢\n\nUm boné bem feito não fica esquecido no fundo da sacola — ele acompanha o produtor no campo o ano inteiro!\n\nArraste para o lado e veja qual acabamento valoriza mais a sua logomarca.\n\n📩 Peça seu orçamento personalizado pelo WhatsApp ou direct!\n\n#Agrishow #BrindesCorporativos #AgroNegocio #BonesPersonalizados #FGVRepresentacoes",
        roteiroCenasIa: roteiroCenasSchema.parse([
          {
            ordem: 1,
            duracao_ou_slide: "Slide 1",
            visual_sugerido: "Foto em close de 2 bonés personalizados sobre fundo limpo neutro",
            texto_tela: "Vai expor em feira do Agro? Escolha o boné que o cliente REALMENTE usa",
          },
          {
            ordem: 2,
            duracao_ou_slide: "Slide 2",
            visual_sugerido: "Detalhe aproximado do bordado 3D em alto relevo na frente do boné",
            texto_tela: "Bordado 3D Alto Relevo: clássico, durável e destaque imediato na logo",
          },
          {
            ordem: 3,
            duracao_ou_slide: "Slide 3",
            visual_sugerido: "Detalhe do aplique emborrachado em boné de sarja",
            texto_tela: "Patch Emborrachado: acabamento moderno para linhas VIP e marcas detalhadas",
          },
          {
            ordem: 4,
            duracao_ou_slide: "Slide 4",
            visual_sugerido: "Foto de caixa organizada com bonés prontos + selo FGV",
            texto_tela: "Antecipe seu pedido em 60 dias e garanta entrega sem correria. Chame no direct!",
          },
        ]),
        linkCanva: null,
      },
      {
        tema: "Detalhes que fazem diferença na camisa polo da sua equipe comercial",
        formato: "REELS_SEM_APARECER",
        ocasiaoFeira: "Feiras do Agro",
        dataPublicacao: addDaysToIsoDate(hojeIso, 10),
        status: "ARTE_CANVA",
        legendaIa:
          "Uniforme alinhado passa confiança antes mesmo da primeira palavra na negociação. 👔✨\n\nTrabalhamos com grade completa (do PP ao 5G + especial) e bordado de alta definição.\n\n💬 Comente 'ORÇAMENTO' ou chame no WhatsApp para receber as opções de tecido!\n\n#UniformesCorporativos #CamisaPoloBordada #VendasB2B #Agro #FGVRepresentacoes",
        roteiroCenasIa: roteiroCenasSchema.parse([
          {
            ordem: 1,
            duracao_ou_slide: "0-3s",
            visual_sugerido: "Take curto aproximando da gola e dos botões da camisa polo dobrada",
            texto_tela: "3 detalhes que elevam o uniforme da sua equipe",
          },
          {
            ordem: 2,
            duracao_ou_slide: "3-7s",
            visual_sugerido: "Close lento no bordado do peito e da manga com boa iluminação natural",
            texto_tela: "1. Bordado firme que não repuxa o tecido",
          },
          {
            ordem: 3,
            duracao_ou_slide: "7-11s",
            visual_sugerido: "Sequência rápida mostrando pilhas separadas por tamanho P, M, G, GG",
            texto_tela: "2. Grade completa masculina e feminina para vestir todo o time bem",
          },
          {
            ordem: 4,
            duracao_ou_slide: "11-15s",
            visual_sugerido: "Foto limpa das polos embaladas com logo FGV no canto",
            texto_tela: "Peça seu orçamento com antecedência. Link na bio!",
          },
        ]),
        linkCanva: "https://www.canva.com/",
      },
      {
        tema: "Ideias de kits corporativos úteis para SIPAT (além do básico)",
        formato: "CARROSSEL",
        ocasiaoFeira: "SIPAT",
        dataPublicacao: addDaysToIsoDate(hojeIso, 18),
        status: "IDEIA",
        legendaIa: null,
        roteiroCenasIa: null,
        linkCanva: null,
      },
      {
        tema: "Camisas de pescaria UV50+ personalizadas: conforto no campo e divulgação da sua marca",
        formato: "FOTO_UNICA",
        ocasiaoFeira: "SHOW SAFRA",
        dataPublicacao: addDaysToIsoDate(hojeIso, -4),
        status: "POSTADO",
        legendaIa:
          "Sol forte no campo pede proteção de verdade! ☀️🌿\n\nNossas camisas de pescaria com proteção UV50+ e sublimação total levam a identidade da sua empresa com leveza e durabilidade.\n\nSolicite uma cotação personalizada para sua equipe ou evento!\n\n#CamisaUV50 #AgroBrasil #BrindesPersonalizados #ShowSafra #FGVRepresentacoes",
        roteiroCenasIa: null,
        linkCanva: "https://www.canva.com/",
      },
    ];

    await db.insert(conteudos).values(CONTEUDOS_SEED);

    console.log("\n✅ Seed completo finalizado com sucesso!");
    console.log("Resumo dos dados criados:");
    console.log(`  • Fornecedores: ${FORNECEDORES_SEED.length}`);
    console.log(`  • Clientes: ${CLIENTES_SEED.length} (6 PJ + 2 PF / Produtores Rurais)`);
    console.log(`  • Pedidos / Orçamentos: ${PEDIDOS_SEED.length} (todos os 9 status)`);
    console.log(`  • Interações na linha do tempo: ${INTERACOES_SEED.length}`);
    console.log(`  • Conteúdos editoriais: ${CONTEUDOS_SEED.length}`);
    console.log("  • Arquivos reais no bucket privado pedidos-arquivos: 7 (4 mockups PNG + 3 PDFs)\n");
  } finally {
    await client.end();
  }
}

seed().catch((error) => {
  console.error("Erro ao executar seed:", error);
  process.exit(1);
});
