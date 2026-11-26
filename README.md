# FGV — Gestão de Vendas, Pedidos e Conteúdo

Sistema web interno para a **FGV Representações Comerciais**, projetado para eliminar retrabalho operacional no pós-venda (emissão de pedidos por fabricante, histórico de clientes, acompanhamento de entregas e montagem de pastas) e estruturar o planejamento de conteúdo com apoio de IA.

## Stack Principal
- **Next.js (App Router) + TypeScript**
- **Tailwind CSS + shadcn/ui + React Hook Form + Zod**
- **Supabase** (PostgreSQL, Auth fechado e Storage privado)
- **Drizzle ORM**
- **`@react-pdf/renderer`** (templates de pedido por fabricante)
- **`jszip`** (download da pasta completa do pedido para o computador)
- **Vercel Cron + Resend** (alertas diários de follow-up e prazos)
- **Gemini Flash API** (geração de legendas e roteiros de cenas na Fase 2)

## Documentação Base
- [`AGENTS.md`](./AGENTS.md) — Regras de engenharia, UX e operação para agentes de IA.
- [`docs/01-visao-geral-e-regras-de-negocio.md`](./docs/01-visao-geral-e-regras-de-negocio.md) — Diagnóstico, fluxo de 7 etapas e regras dos fabricantes.
- [`docs/02-arquitetura-e-stack.md`](./docs/02-arquitetura-e-stack.md) — Arquitetura, pastas, PDFs, `.zip` e ambiente.
- [`docs/03-modelo-de-dados.md`](./docs/03-modelo-de-dados.md) — Schema SQL, contratos JSONB/Zod, RLS e importação `.xlsx`.
- [`docs/04-telas-pdfs-e-roadmap.md`](./docs/04-telas-pdfs-e-roadmap.md) — Telas, templates de PDF e checklist das Sprints 1 a 5.

## Como Iniciar com o Antigravity
1. Inicialize o repositório Git com esta pasta base.
2. Copie `.env.example` para `.env.local` e preencha as chaves do Supabase.
3. Peça ao agente para ler `AGENTS.md` e toda a pasta `docs/` e iniciar a **Sprint 1**.
