# AGENTS.md — Diretrizes do Projeto (FGV Gestão de Vendas & Conteúdo)

Este arquivo define as regras obrigatórias para agentes de IA (Antigravity, Cursor, Claude Code) que atuam neste repositório. **Leia os arquivos em `docs/` antes de implementar qualquer funcionalidade.**

---

## 1. Contexto e Objetivo
Sistema web interno para a **FGV Representações Comerciais** (brindes corporativos, bonés, uniformes sociais, polos e camisas de pescaria personalizados, com forte atuação em grandes contas e feiras do Agronegócio).

O sistema substitui planilhas manuais por cliente, caderno de orçamentos, edição manual de fichas de pedido e montagem manual de pastas de arquivos, além de apoiar na geração de conteúdo para Instagram (sem a usuária aparecer em vídeo).

### Regra de Ouro de UX (Crítica)
- A usuária principal **não tem perfil técnico**. Toda interface deve ser em **Português do Brasil (PT-BR)**, limpa, com textos diretos, botões claros e grandes, sem jargões técnicos ("UUID", "JSON", "Storage", "Webhook", "Slug").
- Evite formulários gigantes numa tela só: use etapas simples, valores padrão inteligentes (ex.: `entrega_mesmo_faturamento = true`, sugestão de `proximo_numero_pedido`, soma automática de itens e grade de tamanhos) e feedback visual claro (toasts de sucesso/erro em PT-BR).
- Nunca exija que a usuária redigite dados que já existem no cadastro do cliente, filial ou comprador.

---

## 2. Stack Obrigatória (Não Alterar sem Aprovação)
- **Framework:** Next.js (App Router) + TypeScript (`strict: true`).
- **Estilização e UI:** Tailwind CSS + `shadcn/ui` + `lucide-react`.
- **Formulários e Validação:** React Hook Form + Zod (validação compartilhada entre client e server).
- **Banco de Dados e Auth:** Supabase (PostgreSQL + `@supabase/ssr`).
- **ORM:** Drizzle ORM conectado ao PostgreSQL do Supabase (Transaction Pooler).
- **Arquivos e Pastas:** Supabase Storage (bucket privado `pedidos-arquivos`) + `jszip` para download da pasta completa no computador local. **Não integrar Google Drive.**
- **Geração de PDF:** `@react-pdf/renderer` (sem headless browser / Puppeteer).
- **Alertas e E-mail:** Vercel Cron + Resend.
- **IA (Fase 2):** Google Gemini API (`gemini-2.5-flash` ou versão Flash atual via `@google/genai`), retornando JSON estruturado.
- **Hospedagem:** Vercel (Hobby / Free Tier).

---

## 3. Regras de Engenharia e Segurança
1. **Acesso Interno Fechado:** Não implementar fluxo público de cadastro (`/signup`). Apenas usuários criados manualmente no Supabase Auth podem autenticar. Todas as rotas do dashboard e APIs (exceto `/api/cron/alertas`, protegida por `CRON_SECRET`) devem validar sessão autenticada.
2. **RLS e Service Role:** Ativar Row Level Security (RLS) nas tabelas e manter o bucket `pedidos-arquivos` **privado**. Usar `SUPABASE_SERVICE_ROLE_KEY` apenas em rotas/serviços estritamente server-side (ex.: cron, importador, geração de signed URLs e empacotamento `.zip`). Nunca expor chaves privadas no client.
3. **Integridade Financeira e de Grade:**
   - Sempre salvar `pedidos` + `pedido_itens` dentro de transação Drizzle (`db.transaction`).
   - Recalcular `valor_total` de cada item, `subtotal` e `valor_total` do pedido (`subtotal - desconto`) no servidor.
   - Quando `grade_tamanhos` estiver preenchido em um item, validar com Zod que a soma das quantidades da grade é igual a `pedido_itens.quantidade`.
4. **Limites do Free Tier:**
   - Comprimir imagens de mockup antes ou durante o upload (máx. 1600px de largura, JPEG/WebP ~80%) para preservar a cota de 1 GB do Supabase Storage.
   - Em PDFs gerados com `@react-pdf/renderer`, converter imagens do bucket privado para `Buffer` ou Signed URL temporária no servidor antes de renderizar `<Image />`.
5. **Orçamento e Pedido Unificados:** Orçamento e Pedido vivem na mesma tabela (`pedidos`). Converter orçamento em pedido significa atualizar o `status`, preencher `data_pedido` e `numero_pedido` — nunca duplicar registro.
6. **Qualidade de Código:**
   - Separar regras de negócio em `src/lib/` e ações/handlers finos em `src/app/`.
   - Validar toda entrada de Server Actions e Route Handlers com Zod.
   - Rodar `npm run lint` e `npm run build` (ou `tsc --noEmit`) antes de encerrar cada sprint/entrega.

---

## 4. Documentação de Referência
Consulte sempre na ordem:
1. `docs/01-visao-geral-e-regras-de-negocio.md` — Dores, fluxo de 7 etapas e regras reais dos fabricantes e planilhas.
2. `docs/02-arquitetura-e-stack.md` — Arquitetura serverless, estrutura de pastas, fluxo `.zip`, PDFs e variáveis de ambiente.
3. `docs/03-modelo-de-dados.md` — Schema SQL/PostgreSQL, contratos Zod (`grade_tamanhos`, `roteiro_cenas_ia`), RLS/Storage e especificação do importador `.xlsx`.
4. `docs/04-telas-pdfs-e-roadmap.md` — Especificação das telas, layout dos 3 templates de PDF e checklist das Sprints 1 a 5.

---

## 5. Como Trabalhar nas Sprints
- Execute **uma sprint por vez**, seguindo o checklist de `docs/04-telas-pdfs-e-roadmap.md`.
- Não antecipe funcionalidades de fases futuras (ex.: IA de conteúdo só entra na Sprint 5).
- Sempre apresente um resumo objetivo do que foi criado, arquivos alterados e passos manuais necessários (como variáveis de ambiente ou migrations) ao finalizar cada etapa.
