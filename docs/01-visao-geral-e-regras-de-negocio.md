# 01 — Visão Geral e Regras de Negócio

## 1. Contexto da Empresa
- **Empresa:** FGV Representações Comerciais (`comercialfgv@terra.com.br`).
- **Segmento:** Representação comercial B2B de brindes corporativos e uniformes personalizados (bonés bordados/silk alto relevo, camisas sociais, polos, camisas de pescaria, camisetas gola careca, guarda-chuvas, chaveiros, kits corporativos).
- **Vendedor padrão nos pedidos:** `Flavio` (campo editável para suportar outros vendedores).
- **Perfil de clientes:** Grandes contas corporativas, agências de eventos e produtores rurais/empresas do **Agronegócio** (demanda recorrente ligada a grandes feiras como Agrishow, Show Rural, Expo Direto, Hortitec, Femagri, Show Safra, Showtec, Agrotins, ANDAV, além de SIPAT e eventos corporativos).

---

## 2. Dores Mapeadas da Usuária Principal
Levantamento realizado diretamente com a responsável por vendas, relacionamento com clientes/fornecedores e geração de conteúdo:

1. **Dor nº 1 (Pós-venda burocrático):** Redigitar os mesmos dados do pedido em múltiplos lugares — emitir o arquivo do pedido para impressão/fábrica, lançar na planilha individual de histórico do cliente e montar/arquivar pastas com todos os documentos.
2. **Dor nº 2 (Controle de orçamentos e prazos):** Orçamentos enviados por e-mail ficam anotados em **caderno/agenda de papel**, gerando risco de esquecer follow-ups com clientes e necessidade de lembrar manualmente de cobrar fornecedores antes do prazo de entrega.
3. **Dor nº 3 (Captação e geração de conteúdo):** Posta 2 a 3 vezes por semana (usando Canva e ChatGPT), mas os clientes novos ainda vêm majoritariamente de indicação/boca a boca. Trava em:
   - Ter ideias do que postar alinhadas ao calendário comercial.
   - Produzir fotos/vídeos dos produtos.
   - Montar as artes no Canva.
   - **Restrição importante:** Ela **não aparece** em vídeos nem grava falas para câmera. Todo roteiro de Reels/vídeo deve ser no formato **"sem aparecer"** (sequência de fotos/trechos curtos do produto + textos curtos na tela + música).

---

## 3. Fluxo Real de 7 Etapas (O que o Sistema Deve Unificar)

| Etapa Atual | Como Funciona no Sistema |
| :--- | :--- |
| **1. Orçamento e tratativa com cliente** | Criação do registro em `pedidos` com status `ORCAMENTO_RASCUNHO` / `AGUARDANDO_FORNECEDOR` / `ORCAMENTO_ENVIADO`, definindo `proximo_followup` e registrando interações de e-mail/WhatsApp. |
| **2. Venda realizada** | Conversão em **1 clique** do mesmo registro para `APROVADO`, preenchendo `data_pedido`, `numero_pedido` (sugerido pelo fabricante), condição/forma de pagamento e grade/arte. |
| **3. Pedido impresso pós-finalização** | Geração automática do **PDF do pedido** no layout exato do fabricante (`BONES_MOCKUP`, `CONFECCAO_GRADE` ou `PADRAO`), já salvo na pasta virtual do pedido. |
| **4. Lançamento na planilha de vendas** | **Eliminado como passo manual.** Todo pedido aprovado já compõe automaticamente o histórico do cliente e os relatórios/exportação `.xlsx`. |
| **5. Acompanhamento com o fornecedor** | Status `EM_PRODUCAO` com controle de `prazo_entrega_dias` e `data_saida_fabrica`, destacando alertas no painel e no resumo diário por e-mail. |
| **6. Lançamento de entrega** | Status `EM_TRANSITO` até a confirmação como `ENTREGUE` (`data_entrega_cliente`), mantendo registro de ocorrências de qualidade ou atraso. |
| **7. Montagem das pastas do pedido** | Todos os anexos (PDF do pedido, mockup, ordem de compra, NF, comprovantes) ficam centralizados no card do pedido (Supabase Storage) com botão **1 clique para baixar tudo em `.zip`** no computador local. |

---

## 4. Regras de Negócio Extraídas dos Documentos Reais

### 4.1. Cadastro de Clientes e Compradores
- **Pessoa Jurídica e Pessoa Física (Produtor Rural):** Um cliente pode ser `PJ` (CNPJ + Inscrição Estadual) ou `PF` (CPF + Inscrição Estadual + **Data de Nascimento**, obrigatória em pedidos de produtores rurais para faturamento).
- **Múltiplas Unidades / Filiais:** Uma mesma empresa pode possuir Matriz e Filiais com endereços, CNPJs e Inscrições Estaduais diferentes.
- **Múltiplos Compradores:** Grandes clientes (ex.: agências de eventos e empresas do agro) possuem vários compradores ativos simultaneamente, cada um com seu próprio e-mail, telefone e departamento — além de um e-mail específico do departamento financeiro.
- **Origem / Indicação:** Guardar de onde veio o cliente (ex.: *"Agência indicada pela Syngenta"*).
- **Separação de Faturamento e Entrega:** Todo pedido tem um endereço de faturamento e um local de entrega, com opção rápida **"Mesmo endereço de faturamento"** + campo **"A/C de"**.

### 4.2. Fabricantes e Numeração Própria
Cada fabricante segue sua própria sequência numérica e layout de folha de pedido:
- **DKS Bonés (Template `BONES_MOCKUP`):**
  - Numeração na faixa `04xx` (ex.: `0464`).
  - Exibe dados de faturamento (suportando CPF + Data de Nascimento + IE ou CNPJ + IE), local de entrega, tabela de itens (`Quantidade`, `Descrição`, `Unitário`, `Total`).
  - Embute a **imagem grande do mockup/arte técnica** do boné/produto direto na folha.
  - Possui campo de **Observação para Nota Fiscal** (ex.: códigos de resgate / programa de pontos) e prazo de entrega em dias.
- **Agatha / Confecção (Template `CONFECCAO_GRADE`):**
  - Numeração na faixa `4xxx`, podendo conter **sufixo alfanumérico** (ex.: `4712B`). Por isso `numero_pedido` é sempre `TEXT`.
  - Campos específicos: `Data Orçamento`, `Data Pedido`, `Data Saída Fábrica`, `Ordem de Compra Nr`, seleção de forma de pagamento (`Depósito` ou `Boleto`), `E-mail Depto. Financeiro`.
  - Possui **Subtotal + Desconto / Valor Final**.
  - Possui tabela de **Grade de Tamanhos** (`PP`, `P`, `M`, `G`, `GG`, `3G`, `4G`, `5G`, `ESP`, `TOTAL`) associada ao modelo (`MASCULINO`, `FEMININO`, `UNISSEX`, `INFANTIL`).
- **Outros Fornecedores (Template `PADRAO`):**
  - Layout limpo contendo faturamento, entrega, itens, totais, observações e imagem opcional.
- **Sugestão de Número (`proximo_numero_pedido`):** Campo opcional no cadastro de `fornecedores`. Quando preenchido, o formulário sugere o próximo número ao selecionar a fábrica, mas permite edição livre (para casos como `4712B` ou quando a fábrica fornece o número).

### 4.3. Itens e Múltiplos Preços
- Nas planilhas antigas, pedidos com dois produtos diferentes apareciam em uma única linha (ex.: `69,90/73,90`). No sistema, **cada produto/variação de preço é uma linha separada em `pedido_itens`**, garantindo cálculo automático exato de `subtotal`, `desconto` e `valor_total`.

### 4.4. Histórico de Contatos e Ocorrências
- Registros como `"ENVIADO E-MAIL"` não entram na tabela de pedidos: ficam na linha do tempo `interacoes_cliente`.
- Problemas com fornecedores (ex.: entrega com logo fora do padrão, atraso) ficam registrados no campo `ocorrencias` do pedido para consulta futura.

### 4.5. Conteúdo e Sazonalidade B2B (Fase 2)
- O calendário editorial deve destacar oportunidades com **60 a 90 dias de antecedência** para grandes feiras do agronegócio e datas corporativas (SIPAT, Dia das Mães/Pais, Fim de Ano, Kits Onboarding).
- A IA gera: **legenda pronta para Instagram**, **hashtags**, **chamada para orçamento** e **roteiro estruturado por cenas/slides** (visual sugerido + texto curto na tela) para montagem rápida no Canva sem gravação pessoal.
