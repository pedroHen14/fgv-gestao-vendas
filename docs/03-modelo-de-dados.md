# 03 — Modelo de Dados, Contratos Zod e Importação

## 1. Schema PostgreSQL Completo

> Nota: Já ajustado para usar **Supabase Storage** (`storage_path`, `mime_type`, `tamanho_bytes`), sem colunas de Google Drive.

```sql
-- ==========================================
-- ENUMS
-- ==========================================
CREATE TYPE tipo_pessoa AS ENUM ('PJ', 'PF');
CREATE TYPE tipo_endereco AS ENUM ('FATURAMENTO', 'ENTREGA', 'FILIAL');
CREATE TYPE template_pdf_fornecedor AS ENUM ('BONES_MOCKUP', 'CONFECCAO_GRADE', 'PADRAO');

CREATE TYPE status_pedido AS ENUM (
  'ORCAMENTO_RASCUNHO',
  'AGUARDANDO_FORNECEDOR',
  'ORCAMENTO_ENVIADO',
  'APROVADO',
  'EM_PRODUCAO',
  'EM_TRANSITO',
  'ENTREGUE',
  'CANCELADO',
  'PERDIDO'
);

CREATE TYPE forma_pagamento AS ENUM ('DEPOSITO', 'BOLETO', 'PIX', 'OUTRO');

CREATE TYPE tipo_arquivo_pedido AS ENUM (
  'PEDIDO_PDF',
  'MOCKUP',
  'ORDEM_COMPRA',
  'NOTA_FISCAL',
  'COMPROVANTE',
  'OUTRO'
);

CREATE TYPE tipo_interacao AS ENUM ('EMAIL', 'WHATSAPP', 'LIGACAO', 'FOLLOWUP', 'OBSERVACAO');

CREATE TYPE formato_conteudo AS ENUM ('CARROSSEL', 'REELS_SEM_APARECER', 'FOTO_UNICA');
CREATE TYPE status_conteudo AS ENUM ('IDEIA', 'ROTEIRO_PRONTO', 'ARTE_CANVA', 'POSTADO');

-- ==========================================
-- 1. CLIENTES, ENDEREÇOS E COMPRADORES
-- ==========================================
CREATE TABLE clientes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa         tipo_pessoa NOT NULL DEFAULT 'PJ',
  razao_social        TEXT NOT NULL,
  cpf_cnpj            TEXT UNIQUE,
  inscricao_estadual  TEXT,
  data_nascimento     DATE, -- produtores rurais / pessoa física
  origem_indicacao    TEXT, -- ex: "Agência indicada pela Syngenta"
  observacoes         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_clientes_razao_social ON clientes(razao_social);

CREATE TABLE enderecos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo          tipo_endereco NOT NULL DEFAULT 'FATURAMENTO',
  rotulo        TEXT, -- ex: "Matriz Bom Jesus" / "Filial Piracaia"
  cnpj_filial   TEXT,
  ie_filial     TEXT,
  logradouro    TEXT NOT NULL,
  bairro        TEXT,
  cidade        TEXT NOT NULL,
  uf            CHAR(2) NOT NULL,
  cep           TEXT,
  principal     BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enderecos_cliente ON enderecos(cliente_id);

CREATE TABLE compradores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  email             TEXT,
  email_financeiro  TEXT,
  telefone          TEXT,
  departamento      TEXT,
  ativo             BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_compradores_cliente ON compradores(cliente_id);

-- ==========================================
-- 2. FORNECEDORES / FABRICANTES
-- ==========================================
CREATE TABLE fornecedores (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                   TEXT NOT NULL UNIQUE, -- ex: DKS Bonés, Agatha, Elo Brindes
  template_pdf           template_pdf_fornecedor NOT NULL DEFAULT 'PADRAO',
  proximo_numero_pedido  INTEGER, -- opcional: sugere sequência própria da fábrica
  contato                TEXT,
  observacoes            TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==========================================
-- 3. ORÇAMENTOS & PEDIDOS (FLUXO UNIFICADO)
-- ==========================================
CREATE TABLE pedidos (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido             TEXT, -- string para aceitar "0464", "4712B", etc.
  cliente_id                UUID NOT NULL REFERENCES clientes(id),
  comprador_id              UUID REFERENCES compradores(id) ON DELETE SET NULL,
  fornecedor_id             UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  endereco_faturamento_id   UUID REFERENCES enderecos(id) ON DELETE SET NULL,
  endereco_entrega_id       UUID REFERENCES enderecos(id) ON DELETE SET NULL,
  entrega_mesmo_faturamento BOOLEAN NOT NULL DEFAULT true,
  ac_entrega                TEXT, -- "A/C de" na entrega

  vendedor                  TEXT NOT NULL DEFAULT 'Flavio',
  status                    status_pedido NOT NULL DEFAULT 'ORCAMENTO_RASCUNHO',

  condicao_pagamento        TEXT, -- ex: "30 DIAS", "21 DIAS", "76 dias, deposito"
  forma_pagamento           forma_pagamento,
  ordem_compra              TEXT,

  data_orcamento            DATE DEFAULT CURRENT_DATE,
  data_pedido               DATE,
  proximo_followup          DATE, -- usado para alertas diários
  prazo_entrega_dias        INTEGER,
  data_saida_fabrica        DATE,
  data_entrega_cliente      DATE,

  subtotal                  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  desconto                  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  valor_total               NUMERIC(12, 2) NOT NULL DEFAULT 0,

  evento_feira              TEXT, -- ex: "AGRISHOW", "EXPO DIRETO", "SHOW RURAL"
  obs_nota_fiscal           TEXT, -- ex: "MENCIONAR NA NOTA FISCAL RESGATE ..."
  observacoes               TEXT, -- observações gerais do pedido
  ocorrencias               TEXT, -- problemas com fornecedor/entrega

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_fornecedor ON pedidos(fornecedor_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);
CREATE INDEX idx_pedidos_followup ON pedidos(proximo_followup) WHERE proximo_followup IS NOT NULL;
CREATE INDEX idx_pedidos_saida_fabrica ON pedidos(data_saida_fabrica) WHERE data_saida_fabrica IS NOT NULL;

-- ==========================================
-- 4. ITENS DO PEDIDO & GRADE (JSONB)
-- ==========================================
CREATE TABLE pedido_itens (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id          UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  descricao_tecnica  TEXT NOT NULL,
  quantidade         INTEGER NOT NULL CHECK (quantidade > 0),
  valor_unitario     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  valor_total        NUMERIC(12, 2) NOT NULL DEFAULT 0,
  grade_tamanhos     JSONB, -- null para brindes/bonés; preenchido para confecção
  mockup_storage_path TEXT, -- caminho no bucket privado (quando o item tem arte/mockup)
  ordem              INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_pedido_itens_pedido ON pedido_itens(pedido_id);

-- ==========================================
-- 5. ARQUIVOS DA PASTA DO PEDIDO
-- ==========================================
CREATE TABLE pedido_arquivos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id      UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  tipo           tipo_arquivo_pedido NOT NULL DEFAULT 'OUTRO',
  nome_original  TEXT NOT NULL,
  storage_path   TEXT NOT NULL, -- caminho dentro do bucket privado "pedidos-arquivos"
  mime_type      TEXT,
  tamanho_bytes  INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pedido_arquivos_pedido ON pedido_arquivos(pedido_id);

-- ==========================================
-- 6. HISTÓRICO DE INTERAÇÕES (E-MAILS / FOLLOW-UP)
-- ==========================================
CREATE TABLE interacoes_cliente (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  pedido_id       UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  comprador_id    UUID REFERENCES compradores(id) ON DELETE SET NULL,
  tipo            tipo_interacao NOT NULL DEFAULT 'EMAIL',
  resumo          TEXT NOT NULL,
  data_interacao  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interacoes_cliente ON interacoes_cliente(cliente_id);

-- ==========================================
-- 7. CALENDÁRIO DE CONTEÚDO & IA (FASE 2)
-- ==========================================
CREATE TABLE conteudos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tema              TEXT NOT NULL,
  formato           formato_conteudo NOT NULL DEFAULT 'CARROSSEL',
  ocasiao_feira     TEXT, -- ex: "Feiras do Agro", "SIPAT", "Fim de Ano"
  data_publicacao   DATE,
  status            status_conteudo NOT NULL DEFAULT 'IDEIA',
  legenda_ia        TEXT,
  roteiro_cenas_ia  JSONB, -- array estruturado de cenas/slides
  link_canva        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 2. Contratos de Validação (Zod / JSONB)

### 2.1. `pedido_itens.grade_tamanhos`
```typescript
import { z } from "zod";

export const gradeTamanhosSchema = z.object({
  modelo: z.enum(["MASCULINO", "FEMININO", "UNISSEX", "INFANTIL"]),
  tamanhos: z.record(z.string(), z.number().int().min(0)),
  // Chaves padrão na UI: PP, P, M, G, GG, 3G, 4G, 5G, ESP
});

export type GradeTamanhos = z.infer<typeof gradeTamanhosSchema>;
```
**Regra obrigatória:** quando `grade_tamanhos` não for `null`, a soma de `Object.values(grade_tamanhos.tamanhos)` deve ser exatamente igual a `pedido_itens.quantidade` (na UI, digitar os números da grade pode preencher `quantidade` automaticamente).

### 2.2. `conteudos.roteiro_cenas_ia`
```typescript
export const roteiroCenasSchema = z.array(
  z.object({
    ordem: z.number().int().positive(),
    duracao_ou_slide: z.string(), // ex: "0-3s" ou "Slide 1"
    visual_sugerido: z.string(),  // ex: "Foto de perto do bordado da polo"
    texto_tela: z.string(),       // texto curto para colar no Canva
  })
);
```

---

## 3. Segurança no Supabase (RLS e Storage)

Como o sistema é **interno e fechado** (apenas equipe FGV autenticada, sem multi-tenant):

```sql
-- Ativar RLS em todas as tabelas
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enderecos ENABLE ROW LEVEL SECURITY;
ALTER TABLE compradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_arquivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE interacoes_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteudos ENABLE ROW LEVEL SECURITY;

-- Política padrão: apenas usuários autenticados têm acesso total
CREATE POLICY "authenticated_all" ON clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON enderecos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON compradores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON pedidos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON pedido_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON pedido_arquivos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON interacoes_cliente FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_all" ON conteudos FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### Bucket no Storage
- Criar bucket privado chamado `pedidos-arquivos` (`public = false`).
- Política de Storage em `storage.objects`: permitir `SELECT`, `INSERT`, `UPDATE`, `DELETE` somente para `authenticated` onde `bucket_id = 'pedidos-arquivos'`.

---

## 4. Regras do Importador de Planilhas Antigas (`scripts/import-xlsx.ts`)
As fichas antigas por cliente (`.xlsx`) seguem um padrão semiestruturado que o script CLI deve tratar com segurança:
1. **Cabeçalho (linhas superiores antes de `HISTORICO`):**
   - Extrair `EMPRESA`, `ENDEREÇO`, `BAIRRO`, `CIDADE`, `ESTADO`, `CEP`, `CNPJ`, `INSCR. EST.`, `FONE`, `COMPRADOR`, `DEPTO`, observações de origem/indicação e eventuais colunas à direita contendo dados de **Filial** (outro endereço/CNPJ/IE).
   - Extrair todos os e-mails e telefones espalhados nas colunas adjacentes criando registros em `compradores` (deduplicando por e-mail).
2. **Tabela `HISTORICO` (colunas `DATA`, `DESCRIÇÃO`, `PAGTO`, `QUANT`, `PREÇO`, `No. PED.`, `TOTAL`, `VENDEDOR` + colunas extras sem título):**
   - Linhas cuja `DESCRIÇÃO` contenha apenas `"ENVIADO E-MAIL"` devem ser importadas para `interacoes_cliente` (tipo `EMAIL`), nunca para `pedidos`.
   - Linhas marcadas com `CANCELADO` entram em `pedidos` com status `CANCELADO`; demais pedidos históricos entram como `ENTREGUE`.
   - Quando a coluna `PREÇO` tiver múltiplos valores (ex.: `69,90/73,90`), preservar o `valor_total` real da planilha no pedido e registrar o preço composto na descrição ou dividir itens quando identificável, marcando log para conferência.
   - Colunas extras contendo `COMP. NOME` vinculam ao comprador; nomes de feiras (`AGRISHOW`, `EXPO DIRETO`, `SHOW RURAL`, etc.) preenchem `evento_feira`; nomes de fabricantes (`DKS BONES`, `ELO BRINDES`) vinculam ao `fornecedor_id`; textos longos de problema vão para `ocorrencias`.
3. **Idempotência:** Rodar o script em modo `--dry-run` primeiro para revisar o relatório antes de gravar no banco.
