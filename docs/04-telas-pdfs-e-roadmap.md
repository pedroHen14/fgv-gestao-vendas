# 04 — Telas, Templates de PDF e Roadmap de Sprints

## 1. Mapa de Telas (Foco em Simplicidade para a Usuária)

### 1.1. Painel do Dia (`/`)
Tela inicial limpa mostrando apenas o que pede ação hoje:
- **3 botões grandes no topo:** `+ Novo Orçamento`, `+ Lançar Pedido`, `+ Novo Cliente`.
- **Card "Orçamentos para Cobrar":** itens com `proximo_followup <= hoje`.
- **Card "Fábricas / Entregas Próximas":** pedidos `EM_PRODUCAO` próximos da `data_saida_fabrica` e pedidos `EM_TRANSITO`.
- **Resumo rápido do mês:** quantidade de pedidos fechados e valor total.

### 1.2. Pedidos e Orçamentos (`/pedidos` e `/pedidos/[id]`)
- **Visão principal:** Alternância entre **Kanban visual** (colunas: *Orçamentos*, *Aprovado*, *Em Produção*, *Em Trânsito*, *Entregue*) e **Tabela filtrável** (por cliente, fabricante, nº do pedido, feira ou período).
- **Formulário guiado (`/pedidos/novo`):**
  1. Seleciona Cliente (com busca instantânea) → carrega automaticamente Compradores e Endereços.
  2. Escolhe Fabricante → sugere `numero_pedido` se configurado e habilita automaticamente o bloco de **Grade de Tamanhos** (se `CONFECCAO_GRADE`) ou **Upload de Mockup** (se `BONES_MOCKUP`).
  3. Adiciona 1 ou mais itens → calcula `subtotal` e `valor_total` (`subtotal - desconto`) ao vivo.
- **Tela de Detalhe (`/pedidos/[id]`):**
  - Barra de progresso das 7 etapas (clique simples para avançar status).
  - Botão de destaque **"Gerar PDF do Pedido"** e **"Salvar PDF na Pasta"**.
  - Bloco **"Pasta do Pedido (Arquivos)"**: upload com drag-and-drop categorizado (*Mockup*, *Ordem de Compra*, *Nota Fiscal*, *Comprovante*, *Outro*) + botão grande **"Baixar Pasta Completa (.zip)"** para salvar no computador local.

### 1.3. Ficha do Cliente (`/clientes` e `/clientes/[id]`)
Substitui definitivamente o arquivo `.xlsx` individual por empresa:
- Dados cadastrais (PJ ou PF + Data de Nascimento), origem/indicação e observações.
- Abas limpas: **Histórico de Pedidos** (com soma acumulada e botão **"Exportar Planilha (.xlsx)"**), **Compradores**, **Endereços / Filiais** e **Linha do Tempo de Contatos** (botão rápido *"Registrar E-mail Enviado"*).

### 1.4. Fornecedores (`/fornecedores`)
Cadastro enxuto: Nome, Template de PDF (`BONES_MOCKUP`, `CONFECCAO_GRADE`, `PADRAO`), Próximo Nº de Pedido (opcional) e Contato.

### 1.5. Conteúdo & Posts — Fase 2 (`/conteudos`)
- Visualização em **Calendário** com lembretes antecipados (60–90 dias) das principais feiras do Agro e datas corporativas.
- Ao abrir/criar um post (informando tema/produto, formato e ocasião), o botão **"Gerar Legenda e Roteiro com IA"** chama o Gemini Flash e preenche automaticamente:
  - Legenda pronta para copiar no Instagram + hashtags.
  - Roteiro passo a passo de cenas/slides (**sem aparecer**, focado em fotos/vídeos curtos do produto + textos na tela para montar no Canva).
  - Campo para salvar o link da arte no Canva.

---

## 2. Especificação dos 3 Templates de PDF (`@react-pdf/renderer`)

### Template 1: `BONES_MOCKUP` (Ex.: DKS Bonés)
- **Topo:** Nome do Fabricante em destaque + `PEDIDO {numero_pedido}` + imagem grande do mockup/arte técnica (quando houver).
- **Bloco Dados para Faturamento:** Empresa/Nome, Data de Nascimento (exibir quando PF), Endereço, Cidade, Estado, CEP, CNPJ ou CPF, Inscrição Estadual, Pagamento (`condicao_pagamento`).
- **Bloco Local para Entrega:** Se `entrega_mesmo_faturamento = true`, exibir `MESMO ACIMA A/C {ac_entrega}`; caso contrário, imprimir endereço completo de entrega.
- **Tabela de Itens:** `QUANTIDADE` | `DESCRIÇÃO` | `UNITÁRIO` | `TOTAL`.
- **Rodapé técnico:**
  - Destaque para `obs_nota_fiscal` (quando preenchido, ex.: código de resgate).
  - `Prazo de entrega: {prazo_entrega_dias} DIAS` e `Vendedor: {vendedor}`.
  - Assinatura institucional: `FGV REPRESENTAÇÕES COMERCIAIS` | `E-mail: comercialfgv@terra.com.br` | `SP, {data_pedido}`.

### Template 2: `CONFECCAO_GRADE` (Ex.: Agatha / Uniformes)
- **Cabeçalho:** `DADOS PARA FATURAMENTO`, `PEDIDO {fornecedor} NR: {numero_pedido}`, `DATA PEDIDO`, `DATA ORÇAMENTO`, `DATA SAÍDA FÁBRICA`.
- **Bloco Cliente & Pagamento:** Empresa, CNPJ, Inscrição Estadual, `COND. PAGTO.`, caixas marcáveis `[X] DEPÓSITO` / `[ ] BOLETO` / `[ ] PIX`, `ORDEM DE COMPRA NR`.
- **Bloco Endereço & Contato:** Endereço, Bairro, Cidade/UF, CEP, Fone Empresa, Comprador, Fone Comprador, E-mail, E-mail Depto. Financeiro.
- **Bloco Local de Entrega:** Empresa (ou `MESMO ACIMA`), CNPJ, Endereço, Bairro, Cidade, CEP, `A/C DE`.
- **Tabela de Itens:** `QUANT.` | `DESCRIÇÃO DOS PRODUTOS` | `VL. UNIT.` | `TOTAL` + linha de Subtotal + linha destacada de **Desconto / Valor Final** (quando `desconto > 0`).
- **Tabela de Grade de Tamanhos** (uma tabela por item que possuir grade):
  - Título do modelo (ex.: `POLO MODELO MASCULINO`).
  - Colunas: `PP | P | M | G | GG | 3G | 4G | 5G | ESP | TOTAL`.
- **Rodapé:** `OBS`, `VENDEDOR`, `COMPRADOR`.

### Template 3: `PADRAO`
- Layout corporativo limpo da FGV contendo faturamento, entrega, tabela de itens, totais, imagem opcional, observações e assinatura institucional.

---

## 3. Roadmap de Execução (Sprints)

### Sprint 1 — Fundação, Auth e Banco
- [ ] Inicializar projeto Next.js (App Router, TS, Tailwind, `shadcn/ui`).
- [ ] Configurar Drizzle ORM + schema completo (`src/db/schema.ts`) + migrations no Supabase.
- [ ] Aplicar RLS nas tabelas e criar bucket privado `pedidos-arquivos` no Supabase Storage.
- [ ] Configurar Supabase Auth fechado (`@supabase/ssr`, middleware e tela `/login`).
- [ ] Criar layout base do dashboard (sidebar PT-BR + header + logout).
- [ ] Criar seed inicial de fabricantes (`DKS Bonés`, `Agatha`, `Elo Brindes`).

### Sprint 2 — Clientes, Fornecedores e Pedidos (Core)
- [ ] CRUD de `fornecedores` (com template PDF e `proximo_numero_pedido`).
- [ ] CRUD de `clientes` (PJ/PF, endereços/filiais, múltiplos compradores e timeline de interações).
- [ ] Script importador CLI (`scripts/import-xlsx.ts`) com `--dry-run` validado nas planilhas antigas.
- [ ] Formulário unificado de Orçamento → Pedido com múltiplos itens, editor visual de `grade_tamanhos` (validação Zod da soma) e cálculo automático de `subtotal` / `desconto` / `valor_total`.
- [ ] Conversão de orçamento em pedido em 1 clique + atualização automática opcional do `proximo_numero_pedido`.

### Sprint 3 — Dor nº 1: PDFs, Pasta Virtual e Download `.zip`
- [ ] Implementar os 3 templates em `@react-pdf/renderer` (`BONES_MOCKUP`, `CONFECCAO_GRADE`, `PADRAO`).
- [ ] Endpoint `GET /api/pedidos/[id]/pdf` com carregamento seguro de imagens do bucket privado e opção de salvar direto na pasta do pedido.
- [ ] Uploader de arquivos na tela `/pedidos/[id]` (com compressão de imagens de mockup antes do envio).
- [ ] Endpoint `GET /api/pedidos/[id]/zip` empacotando PDF atualizado + todos os anexos da pasta para download local.
- [ ] Exportação `.xlsx` do histórico na ficha do cliente (`/clientes/[id]`).

### Sprint 4 — Fluxo Visual, Painel do Dia e Alertas
- [ ] Visão Kanban + Tabela filtrável em `/pedidos` com mudança rápida de status.
- [ ] Painel do Dia (`/`) com atalhos rápidos, follow-ups vencidos e entregas próximas.
- [ ] Endpoint `GET /api/cron/alertas` + `vercel.json` + envio de resumo diário via Resend.

### Sprint 5 — Conteúdo & IA (Fase 2)
- [ ] Tela `/conteudos` com calendário editorial + presets de feiras do Agro e datas corporativas.
- [ ] Endpoint `POST /api/ia/conteudo` integrando Gemini Flash com saída JSON estruturada (legenda, hashtags e roteiro de cenas/slides sem aparecer).
- [ ] Botões de "Copiar Legenda" e "Copiar Roteiro" em 1 clique para colar direto no Canva/Instagram.
