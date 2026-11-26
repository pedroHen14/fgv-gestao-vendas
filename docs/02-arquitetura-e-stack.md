# 02 — Arquitetura e Stack Tecnológica

## 1. Visão Geral da Arquitetura
Arquitetura **100% serverless (Monolito Full-stack)** projetada para 1 a 3 usuários internos, com custo operacional alvo de **R$ 0/mês** no free tier e baixa necessidade de manutenção.

```text
[Browser (Next.js App Router + shadcn/ui)]
       │
       ├── Server Components / Server Actions (Drizzle ORM) ──► [Supabase PostgreSQL]
       ├── Auth (@supabase/ssr + Middleware)                 ──► [Supabase Auth (Fechado)]
       ├── Upload/Download de Arquivos                       ──► [Supabase Storage (Privado)]
       ├── GET /api/pedidos/[id]/pdf (@react-pdf/renderer)   ──► PDF sob demanda + opcional salvar no Storage
       ├── GET /api/pedidos/[id]/zip (jszip)                 ──► Baixa pasta completa .zip no PC local
       ├── GET /api/cron/alertas (Vercel Cron diário 08h)    ──► Consulta prazos/follow-ups ──► [Resend E-mail]
       └── POST /api/ia/conteudo (Fase 2)                    ──► [Gemini Flash API]
```

---

## 2. Stack Consolidada

| Camada | Tecnologia | Motivo da Escolha |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) + TypeScript | Deploy único, SSR, Server Actions e Route Handlers tipados ponta a ponta. |
| **UI & Forms** | Tailwind CSS + `shadcn/ui` + React Hook Form + Zod | Visual limpo, acessível para usuária não técnica e validação compartilhada. |
| **Banco de Dados** | Supabase PostgreSQL | Relacional robusto com suporte nativo a `ENUM` e `JSONB`. |
| **ORM** | Drizzle ORM (`postgres` driver) | Leve em serverless, excelente suporte a transações e tipagem fiel ao SQL. |
| **Autenticação** | Supabase Auth (`@supabase/ssr`) | Sessão por cookies HTTP-only; cadastro público desativado no painel. |
| **Arquivos / Pastas** | Supabase Storage (bucket privado) + `jszip` | Zero custo/setup de OAuth Google Drive + botão de download da pasta completa no PC. |
| **Motor de PDF** | `@react-pdf/renderer` | Roda nativamente em Node/Vercel Serverless sem depender de Chromium/Docker. |
| **Exportação Excel** | `exceljs` ou `xlsx` (opcional) | Permite baixar o histórico de qualquer cliente no formato de planilha conhecido. |
| **Cron & E-mail** | Vercel Cron + Resend | Dispara resumo diário de follow-ups/fornecedores e mantém o Supabase Free ativo. |
| **IA (Fase 2)** | Google Gemini API (Flash) | Custo mínimo/gratuito para 2–3 posts/semana com saída em JSON estruturado. |
| **Hospedagem** | Vercel (Hobby) | Deploy contínuo via GitHub. |

---

## 3. Estrutura de Pastas Recomendada

```text
src/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx                    # Login simples (e-mail e senha)
│   ├── (dashboard)/
│   │   ├── layout.tsx                        # Sidebar limpa + cabeçalho + botão sair
│   │   ├── page.tsx                          # Painel do Dia (alertas, prazos, atalhos rápidos)
│   │   ├── pedidos/
│   │   │   ├── page.tsx                      # Kanban + Lista (Orçamento -> Entregue)
│   │   │   ├── novo/page.tsx                 # Formulário guiado de Orçamento/Pedido
│   │   │   └── [id]/page.tsx                 # Detalhe do pedido, itens, grade, arquivos, PDF e ZIP
│   │   ├── clientes/
│   │   │   ├── page.tsx                      # Busca por razão social, CNPJ/CPF ou comprador
│   │   │   ├── novo/page.tsx                 # Cadastro de cliente + endereço + comprador inicial
│   │   │   └── [id]/page.tsx                 # Ficha do cliente (histórico, filiais, compradores, timeline)
│   │   ├── fornecedores/
│   │   │   └── page.tsx                      # Cadastro de fábricas, template PDF e próximo nº
│   │   └── conteudos/
│   │       └── page.tsx                      # Fase 2: Calendário editorial + gerador com Gemini
│   └── api/
│       ├── pedidos/
│       │   └── [id]/
│       │       ├── pdf/route.ts              # Gera PDF via @react-pdf/renderer (?download=1 ou ?save=1)
│       │       └── zip/route.ts              # Empacota PDF + anexos do Storage em .zip
│       ├── clientes/
│       │   └── [id]/export-xlsx/route.ts     # Exporta histórico do cliente em .xlsx
│       ├── cron/
│       │   └── alertas/route.ts              # Job diário (08h BRT) protegido por CRON_SECRET
│       └── ia/
│           └── conteudo/route.ts             # Fase 2: chama Gemini Flash e salva legenda/roteiro
├── components/
│   ├── ui/                                   # Componentes shadcn/ui
│   ├── layout/                               # Sidebar, Header, EmptyState, ConfirmDialog
│   ├── clientes/                             # Formulários de cliente, endereços/filiais, compradores
│   ├── pedidos/                              # Kanban, Form de pedido, Editor de grade, Uploader
│   ├── conteudos/                            # Calendário, Drawer de post, Botão Gerar com IA
│   └── pdf/
│       ├── template-bones-mockup.tsx         # Layout DKS Bonés
│       ├── template-confeccao.tsx            # Layout Agatha / Confecção
│       ├── template-padrao.tsx               # Layout genérico
│       └── render-pedido-pdf.ts              # Seleciona template e retorna Buffer do PDF
├── db/
│   ├── index.ts                              # Instância Drizzle + cliente postgres (prepare: false p/ pooler)
│   ├── schema.ts                             # Definição completa das tabelas e enums
│   └── migrations/                           # Migrations geradas pelo drizzle-kit
├── lib/
│   ├── supabase/
│   │   ├── client.ts                         # Browser client (@supabase/ssr)
│   │   ├── server.ts                         # Server client com cookies
│   │   ├── admin.ts                          # Service Role client (uso estrito em server/cron/zip)
│   │   └── middleware.ts                     # Atualização de sessão e proteção de rotas
│   ├── validators/
│   │   ├── cliente.ts                        # Schemas Zod de cliente, endereço e comprador
│   │   ├── pedido.ts                         # Schemas Zod de pedido, item e grade_tamanhos
│   │   └── conteudo.ts                       # Schema Zod de conteúdo e resposta da IA
│   ├── formatters.ts                         # Moeda BRL, datas PT-BR, máscaras CPF/CNPJ/CEP
│   └── storage.ts                            # Helpers de path, upload, compressão e signed URLs
├── scripts/
│   └── import-xlsx.ts                        # CLI para importar planilhas antigas de clientes
└── middleware.ts                             # Intercepta rotas privadas redirecionando para /login
```

---

## 4. Detalhes Técnicos Críticos

### 4.1. Organização do Storage e Download da Pasta Completa (`.zip`)
- **Bucket privado:** `pedidos-arquivos`.
- **Padrão de caminho no bucket:**
  `{ano}/{cliente_slug}/{numero_pedido_ou_id}/{tipo}_{timestamp}_{nome_sanitizado}`
- **Compressão de imagens:** Imagens de mockup (`image/png`, `image/jpeg`, `image/webp`) devem ser redimensionadas (máx. 1600px) e comprimidas no cliente antes do upload (ou via `sharp` no servidor) para economizar espaço no free tier (1 GB).
- **Fluxo do botão "Baixar Pasta Completa (.zip)":**
  1. Usuário clica em **Baixar Pasta (.zip)** na tela do pedido (`/pedidos/[id]`).
  2. `GET /api/pedidos/[id]/zip` valida sessão, busca o pedido e todos os registros em `pedido_arquivos`.
  3. Gera o PDF atualizado do pedido em memória (garantindo que `01_PEDIDO_{numero}.pdf` sempre vá atualizado no pacote).
  4. Baixa os anexos do Supabase Storage usando o client admin server-side e adiciona no `JSZip` com prefixos ordenados (`02_MOCKUP_...`, `03_ORDEM_COMPRA_...`, `04_NOTA_FISCAL_...`, `05_COMPROVANTE_...`).
  5. Retorna o `.zip` com `Content-Disposition: attachment; filename="PED_{numero}_{cliente}.zip"`.

### 4.2. Geração de PDF com `@react-pdf/renderer`
- Os endpoints `/api/pedidos/[id]/pdf` e `/api/pedidos/[id]/zip` devem declarar `export const runtime = 'nodejs'`.
- Em `next.config.ts`, incluir `serverExternalPackages: ['@react-pdf/renderer']` caso necessário na versão do Next.js utilizada.
- **Imagens privadas no PDF:** Nunca passar URL pública inexistente para `<Image />`. Buscar o arquivo do Supabase Storage no servidor como `Buffer` (ou base64 data URI) antes de chamar `renderToBuffer`.

### 4.3. Banco de Dados e Drizzle no Supabase Serverless
- Usar `DATABASE_URL` apontando para o **Transaction Pooler (porta 6543)** com `{ prepare: false }` no driver `postgres` para evitar esgotamento de conexões em funções serverless.
- Usar `DIRECT_URL` (porta 5432) apenas no `drizzle.config.ts` para rodar `drizzle-kit migrate` / `push`.

### 4.4. Cron Diário e Manutenção do Free Tier
- Configurar `vercel.json`:
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/alertas",
        "schedule": "0 11 * * 1-5"
      }
    ]
  }
  ```
  *(11:00 UTC = 08:00 horário de Brasília, de segunda a sexta).*
- O endpoint valida `Authorization: Bearer ${process.env.CRON_SECRET}`, consulta:
  1. Orçamentos com `proximo_followup <= hoje` e status `ORCAMENTO_ENVIADO` ou `AGUARDANDO_FORNECEDOR`.
  2. Pedidos `EM_PRODUCAO` cuja `data_saida_fabrica` (ou `data_pedido + prazo_entrega_dias`) vence nos próximos 3 dias ou está atrasada.
  3. Pedidos `EM_TRANSITO` há mais de 5 dias sem confirmação de entrega.
- Se houver pendências, envia um e-mail organizado via **Resend**. Como roda todo dia útil consultando o PostgreSQL, também impede que o projeto gratuito do Supabase entre em pausa automática por inatividade (7 dias).
