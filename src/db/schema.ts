import { sql, relations } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { GradeTamanhos } from "@/lib/validators/pedido";
import type { RoteiroCenas } from "@/lib/validators/conteudo";

// ==========================================
// ENUMS
// ==========================================
export const tipoPessoaEnum = pgEnum("tipo_pessoa", ["PJ", "PF"]);

export const tipoEnderecoEnum = pgEnum("tipo_endereco", [
  "FATURAMENTO",
  "ENTREGA",
  "FILIAL",
]);

export const templatePdfFornecedorEnum = pgEnum("template_pdf_fornecedor", [
  "BONES_MOCKUP",
  "CONFECCAO_GRADE",
  "PADRAO",
]);

export const statusPedidoEnum = pgEnum("status_pedido", [
  "ORCAMENTO_RASCUNHO",
  "AGUARDANDO_FORNECEDOR",
  "ORCAMENTO_ENVIADO",
  "APROVADO",
  "EM_PRODUCAO",
  "EM_TRANSITO",
  "ENTREGUE",
  "CANCELADO",
  "PERDIDO",
]);

export const formaPagamentoEnum = pgEnum("forma_pagamento", [
  "DEPOSITO",
  "BOLETO",
  "PIX",
  "OUTRO",
]);

export const tipoArquivoPedidoEnum = pgEnum("tipo_arquivo_pedido", [
  "PEDIDO_PDF",
  "MOCKUP",
  "ORDEM_COMPRA",
  "NOTA_FISCAL",
  "COMPROVANTE",
  "OUTRO",
]);

export const tipoInteracaoEnum = pgEnum("tipo_interacao", [
  "EMAIL",
  "WHATSAPP",
  "LIGACAO",
  "FOLLOWUP",
  "OBSERVACAO",
]);

export const formatoConteudoEnum = pgEnum("formato_conteudo", [
  "CARROSSEL",
  "REELS_SEM_APARECER",
  "FOTO_UNICA",
]);

export const statusConteudoEnum = pgEnum("status_conteudo", [
  "IDEIA",
  "ROTEIRO_PRONTO",
  "ARTE_CANVA",
  "POSTADO",
]);

// ==========================================
// 1. CLIENTES, ENDEREÇOS E COMPRADORES
// ==========================================
export const clientes = pgTable(
  "clientes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tipoPessoa: tipoPessoaEnum("tipo_pessoa").notNull().default("PJ"),
    razaoSocial: text("razao_social").notNull(),
    cpfCnpj: text("cpf_cnpj").unique(),
    inscricaoEstadual: text("inscricao_estadual"),
    dataNascimento: date("data_nascimento"),
    origemIndicacao: text("origem_indicacao"),
    observacoes: text("observacoes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_clientes_razao_social").on(table.razaoSocial)]
);

export const enderecos = pgTable(
  "enderecos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "cascade" }),
    tipo: tipoEnderecoEnum("tipo").notNull().default("FATURAMENTO"),
    rotulo: text("rotulo"),
    cnpjFilial: text("cnpj_filial"),
    ieFilial: text("ie_filial"),
    logradouro: text("logradouro").notNull(),
    bairro: text("bairro"),
    cidade: text("cidade").notNull(),
    uf: char("uf", { length: 2 }).notNull(),
    cep: text("cep"),
    principal: boolean("principal").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_enderecos_cliente").on(table.clienteId)]
);

export const compradores = pgTable(
  "compradores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "cascade" }),
    nome: text("nome").notNull(),
    email: text("email"),
    emailFinanceiro: text("email_financeiro"),
    telefone: text("telefone"),
    departamento: text("departamento"),
    ativo: boolean("ativo").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_compradores_cliente").on(table.clienteId)]
);

// ==========================================
// 2. FORNECEDORES / FABRICANTES
// ==========================================
export const fornecedores = pgTable("fornecedores", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull().unique(),
  templatePdf: templatePdfFornecedorEnum("template_pdf")
    .notNull()
    .default("PADRAO"),
  proximoNumeroPedido: integer("proximo_numero_pedido"),
  contato: text("contato"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ==========================================
// 3. ORÇAMENTOS & PEDIDOS (FLUXO UNIFICADO)
// ==========================================
export const pedidos = pgTable(
  "pedidos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    numeroPedido: text("numero_pedido"),
    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => clientes.id),
    compradorId: uuid("comprador_id").references(() => compradores.id, {
      onDelete: "set null",
    }),
    fornecedorId: uuid("fornecedor_id").references(() => fornecedores.id, {
      onDelete: "set null",
    }),
    enderecoFaturamentoId: uuid("endereco_faturamento_id").references(
      () => enderecos.id,
      { onDelete: "set null" }
    ),
    enderecoEntregaId: uuid("endereco_entrega_id").references(
      () => enderecos.id,
      { onDelete: "set null" }
    ),
    entregaMesmoFaturamento: boolean("entrega_mesmo_faturamento")
      .notNull()
      .default(true),
    acEntrega: text("ac_entrega"),

    vendedor: text("vendedor").notNull().default("Flavio"),
    status: statusPedidoEnum("status").notNull().default("ORCAMENTO_RASCUNHO"),

    condicaoPagamento: text("condicao_pagamento"),
    formaPagamento: formaPagamentoEnum("forma_pagamento"),
    ordemCompra: text("ordem_compra"),

    dataOrcamento: date("data_orcamento").default(sql`CURRENT_DATE`),
    dataPedido: date("data_pedido"),
    proximoFollowup: date("proximo_followup"),
    prazoEntregaDias: integer("prazo_entrega_dias"),
    dataSaidaFabrica: date("data_saida_fabrica"),
    dataEntregaCliente: date("data_entrega_cliente"),

    subtotal: numeric("subtotal", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    desconto: numeric("desconto", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    valorTotal: numeric("valor_total", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),

    eventoFeira: text("evento_feira"),
    obsNotaFiscal: text("obs_nota_fiscal"),
    observacoes: text("observacoes"),
    ocorrencias: text("ocorrencias"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_pedidos_cliente").on(table.clienteId),
    index("idx_pedidos_comprador").on(table.compradorId),
    index("idx_pedidos_fornecedor").on(table.fornecedorId),
    index("idx_pedidos_status").on(table.status),
    index("idx_pedidos_followup")
      .on(table.proximoFollowup)
      .where(sql`${table.proximoFollowup} IS NOT NULL`),
    index("idx_pedidos_saida_fabrica")
      .on(table.dataSaidaFabrica)
      .where(sql`${table.dataSaidaFabrica} IS NOT NULL`),
  ]
);

// ==========================================
// 4. ITENS DO PEDIDO & GRADE (JSONB)
// ==========================================
export const pedidoItens = pgTable(
  "pedido_itens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pedidoId: uuid("pedido_id")
      .notNull()
      .references(() => pedidos.id, { onDelete: "cascade" }),
    descricaoTecnica: text("descricao_tecnica").notNull(),
    quantidade: integer("quantidade").notNull(),
    valorUnitario: numeric("valor_unitario", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    valorTotal: numeric("valor_total", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    gradeTamanhos: jsonb("grade_tamanhos").$type<GradeTamanhos | null>(),
    mockupStoragePath: text("mockup_storage_path"),
    ordem: integer("ordem").notNull().default(1),
  },
  (table) => [
    index("idx_pedido_itens_pedido").on(table.pedidoId),
    check("chk_pedido_itens_quantidade_positiva", sql`${table.quantidade} > 0`),
  ]
);

// ==========================================
// 5. ARQUIVOS DA PASTA DO PEDIDO
// ==========================================
export const pedidoArquivos = pgTable(
  "pedido_arquivos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pedidoId: uuid("pedido_id")
      .notNull()
      .references(() => pedidos.id, { onDelete: "cascade" }),
    tipo: tipoArquivoPedidoEnum("tipo").notNull().default("OUTRO"),
    nomeOriginal: text("nome_original").notNull(),
    storagePath: text("storage_path").notNull(),
    mimeType: text("mime_type"),
    tamanhoBytes: integer("tamanho_bytes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_pedido_arquivos_pedido").on(table.pedidoId)]
);

// ==========================================
// 6. HISTÓRICO DE INTERAÇÕES (E-MAILS / FOLLOW-UP)
// ==========================================
export const interacoesCliente = pgTable(
  "interacoes_cliente",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clienteId: uuid("cliente_id")
      .notNull()
      .references(() => clientes.id, { onDelete: "cascade" }),
    pedidoId: uuid("pedido_id").references(() => pedidos.id, {
      onDelete: "set null",
    }),
    compradorId: uuid("comprador_id").references(() => compradores.id, {
      onDelete: "set null",
    }),
    tipo: tipoInteracaoEnum("tipo").notNull().default("EMAIL"),
    resumo: text("resumo").notNull(),
    dataInteracao: timestamp("data_interacao", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_interacoes_cliente").on(table.clienteId),
    index("idx_interacoes_pedido").on(table.pedidoId),
  ]
);

// ==========================================
// 7. CALENDÁRIO DE CONTEÚDO & IA (FASE 2)
// ==========================================
export const conteudos = pgTable("conteudos", {
  id: uuid("id").defaultRandom().primaryKey(),
  tema: text("tema").notNull(),
  formato: formatoConteudoEnum("formato").notNull().default("CARROSSEL"),
  ocasiaoFeira: text("ocasiao_feira"),
  dataPublicacao: date("data_publicacao"),
  status: statusConteudoEnum("status").notNull().default("IDEIA"),
  legendaIa: text("legenda_ia"),
  roteiroCenasIa: jsonb("roteiro_cenas_ia").$type<RoteiroCenas | null>(),
  linkCanva: text("link_canva"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ==========================================
// RELATIONS (DRIZZLE RELATIONAL QUERIES)
// ==========================================
export const clientesRelations = relations(clientes, ({ many }) => ({
  enderecos: many(enderecos),
  compradores: many(compradores),
  pedidos: many(pedidos),
  interacoes: many(interacoesCliente),
}));

export const enderecosRelations = relations(enderecos, ({ one }) => ({
  cliente: one(clientes, {
    fields: [enderecos.clienteId],
    references: [clientes.id],
  }),
}));

export const compradoresRelations = relations(compradores, ({ one, many }) => ({
  cliente: one(clientes, {
    fields: [compradores.clienteId],
    references: [clientes.id],
  }),
  pedidos: many(pedidos),
  interacoes: many(interacoesCliente),
}));

export const fornecedoresRelations = relations(fornecedores, ({ many }) => ({
  pedidos: many(pedidos),
}));

export const pedidosRelations = relations(pedidos, ({ one, many }) => ({
  cliente: one(clientes, {
    fields: [pedidos.clienteId],
    references: [clientes.id],
  }),
  comprador: one(compradores, {
    fields: [pedidos.compradorId],
    references: [compradores.id],
  }),
  fornecedor: one(fornecedores, {
    fields: [pedidos.fornecedorId],
    references: [fornecedores.id],
  }),
  enderecoFaturamento: one(enderecos, {
    fields: [pedidos.enderecoFaturamentoId],
    references: [enderecos.id],
    relationName: "endereco_faturamento",
  }),
  enderecoEntrega: one(enderecos, {
    fields: [pedidos.enderecoEntregaId],
    references: [enderecos.id],
    relationName: "endereco_entrega",
  }),
  itens: many(pedidoItens),
  arquivos: many(pedidoArquivos),
  interacoes: many(interacoesCliente),
}));

export const pedidoItensRelations = relations(pedidoItens, ({ one }) => ({
  pedido: one(pedidos, {
    fields: [pedidoItens.pedidoId],
    references: [pedidos.id],
  }),
}));

export const pedidoArquivosRelations = relations(pedidoArquivos, ({ one }) => ({
  pedido: one(pedidos, {
    fields: [pedidoArquivos.pedidoId],
    references: [pedidos.id],
  }),
}));

export const interacoesClienteRelations = relations(
  interacoesCliente,
  ({ one }) => ({
    cliente: one(clientes, {
      fields: [interacoesCliente.clienteId],
      references: [clientes.id],
    }),
    pedido: one(pedidos, {
      fields: [interacoesCliente.pedidoId],
      references: [pedidos.id],
    }),
    comprador: one(compradores, {
      fields: [interacoesCliente.compradorId],
      references: [compradores.id],
    }),
  })
);
