CREATE TYPE "public"."forma_pagamento" AS ENUM('DEPOSITO', 'BOLETO', 'PIX', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."formato_conteudo" AS ENUM('CARROSSEL', 'REELS_SEM_APARECER', 'FOTO_UNICA');--> statement-breakpoint
CREATE TYPE "public"."status_conteudo" AS ENUM('IDEIA', 'ROTEIRO_PRONTO', 'ARTE_CANVA', 'POSTADO');--> statement-breakpoint
CREATE TYPE "public"."status_pedido" AS ENUM('ORCAMENTO_RASCUNHO', 'AGUARDANDO_FORNECEDOR', 'ORCAMENTO_ENVIADO', 'APROVADO', 'EM_PRODUCAO', 'EM_TRANSITO', 'ENTREGUE', 'CANCELADO', 'PERDIDO');--> statement-breakpoint
CREATE TYPE "public"."template_pdf_fornecedor" AS ENUM('BONES_MOCKUP', 'CONFECCAO_GRADE', 'PADRAO');--> statement-breakpoint
CREATE TYPE "public"."tipo_arquivo_pedido" AS ENUM('PEDIDO_PDF', 'MOCKUP', 'ORDEM_COMPRA', 'NOTA_FISCAL', 'COMPROVANTE', 'OUTRO');--> statement-breakpoint
CREATE TYPE "public"."tipo_endereco" AS ENUM('FATURAMENTO', 'ENTREGA', 'FILIAL');--> statement-breakpoint
CREATE TYPE "public"."tipo_interacao" AS ENUM('EMAIL', 'WHATSAPP', 'LIGACAO', 'FOLLOWUP', 'OBSERVACAO');--> statement-breakpoint
CREATE TYPE "public"."tipo_pessoa" AS ENUM('PJ', 'PF');--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo_pessoa" "tipo_pessoa" DEFAULT 'PJ' NOT NULL,
	"razao_social" text NOT NULL,
	"cpf_cnpj" text,
	"inscricao_estadual" text,
	"data_nascimento" date,
	"origem_indicacao" text,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clientes_cpf_cnpj_unique" UNIQUE("cpf_cnpj")
);
--> statement-breakpoint
CREATE TABLE "compradores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"email" text,
	"email_financeiro" text,
	"telefone" text,
	"departamento" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conteudos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tema" text NOT NULL,
	"formato" "formato_conteudo" DEFAULT 'CARROSSEL' NOT NULL,
	"ocasiao_feira" text,
	"data_publicacao" date,
	"status" "status_conteudo" DEFAULT 'IDEIA' NOT NULL,
	"legenda_ia" text,
	"roteiro_cenas_ia" jsonb,
	"link_canva" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enderecos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"tipo" "tipo_endereco" DEFAULT 'FATURAMENTO' NOT NULL,
	"rotulo" text,
	"cnpj_filial" text,
	"ie_filial" text,
	"logradouro" text NOT NULL,
	"bairro" text,
	"cidade" text NOT NULL,
	"uf" char(2) NOT NULL,
	"cep" text,
	"principal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fornecedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"template_pdf" "template_pdf_fornecedor" DEFAULT 'PADRAO' NOT NULL,
	"proximo_numero_pedido" integer,
	"contato" text,
	"observacoes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fornecedores_nome_unique" UNIQUE("nome")
);
--> statement-breakpoint
CREATE TABLE "interacoes_cliente" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cliente_id" uuid NOT NULL,
	"pedido_id" uuid,
	"comprador_id" uuid,
	"tipo" "tipo_interacao" DEFAULT 'EMAIL' NOT NULL,
	"resumo" text NOT NULL,
	"data_interacao" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_arquivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"tipo" "tipo_arquivo_pedido" DEFAULT 'OUTRO' NOT NULL,
	"nome_original" text NOT NULL,
	"storage_path" text NOT NULL,
	"mime_type" text,
	"tamanho_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_itens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pedido_id" uuid NOT NULL,
	"descricao_tecnica" text NOT NULL,
	"quantidade" integer NOT NULL,
	"valor_unitario" numeric(12, 2) DEFAULT '0' NOT NULL,
	"valor_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"grade_tamanhos" jsonb,
	"mockup_storage_path" text,
	"ordem" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "chk_pedido_itens_quantidade_positiva" CHECK ("pedido_itens"."quantidade" > 0)
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero_pedido" text,
	"cliente_id" uuid NOT NULL,
	"comprador_id" uuid,
	"fornecedor_id" uuid,
	"endereco_faturamento_id" uuid,
	"endereco_entrega_id" uuid,
	"entrega_mesmo_faturamento" boolean DEFAULT true NOT NULL,
	"ac_entrega" text,
	"vendedor" text DEFAULT 'Flavio' NOT NULL,
	"status" "status_pedido" DEFAULT 'ORCAMENTO_RASCUNHO' NOT NULL,
	"condicao_pagamento" text,
	"forma_pagamento" "forma_pagamento",
	"ordem_compra" text,
	"data_orcamento" date DEFAULT CURRENT_DATE,
	"data_pedido" date,
	"proximo_followup" date,
	"prazo_entrega_dias" integer,
	"data_saida_fabrica" date,
	"data_entrega_cliente" date,
	"subtotal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"desconto" numeric(12, 2) DEFAULT '0' NOT NULL,
	"valor_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"evento_feira" text,
	"obs_nota_fiscal" text,
	"observacoes" text,
	"ocorrencias" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "compradores" ADD CONSTRAINT "compradores_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enderecos" ADD CONSTRAINT "enderecos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interacoes_cliente" ADD CONSTRAINT "interacoes_cliente_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interacoes_cliente" ADD CONSTRAINT "interacoes_cliente_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interacoes_cliente" ADD CONSTRAINT "interacoes_cliente_comprador_id_compradores_id_fk" FOREIGN KEY ("comprador_id") REFERENCES "public"."compradores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_arquivos" ADD CONSTRAINT "pedido_arquivos_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_itens" ADD CONSTRAINT "pedido_itens_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_comprador_id_compradores_id_fk" FOREIGN KEY ("comprador_id") REFERENCES "public"."compradores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_fornecedor_id_fornecedores_id_fk" FOREIGN KEY ("fornecedor_id") REFERENCES "public"."fornecedores"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_endereco_faturamento_id_enderecos_id_fk" FOREIGN KEY ("endereco_faturamento_id") REFERENCES "public"."enderecos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_endereco_entrega_id_enderecos_id_fk" FOREIGN KEY ("endereco_entrega_id") REFERENCES "public"."enderecos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_clientes_razao_social" ON "clientes" USING btree ("razao_social");--> statement-breakpoint
CREATE INDEX "idx_compradores_cliente" ON "compradores" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "idx_enderecos_cliente" ON "enderecos" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "idx_interacoes_cliente" ON "interacoes_cliente" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "idx_interacoes_pedido" ON "interacoes_cliente" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "idx_pedido_arquivos_pedido" ON "pedido_arquivos" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "idx_pedido_itens_pedido" ON "pedido_itens" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "idx_pedidos_cliente" ON "pedidos" USING btree ("cliente_id");--> statement-breakpoint
CREATE INDEX "idx_pedidos_comprador" ON "pedidos" USING btree ("comprador_id");--> statement-breakpoint
CREATE INDEX "idx_pedidos_fornecedor" ON "pedidos" USING btree ("fornecedor_id");--> statement-breakpoint
CREATE INDEX "idx_pedidos_status" ON "pedidos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pedidos_followup" ON "pedidos" USING btree ("proximo_followup") WHERE "pedidos"."proximo_followup" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_pedidos_saida_fabrica" ON "pedidos" USING btree ("data_saida_fabrica") WHERE "pedidos"."data_saida_fabrica" IS NOT NULL;