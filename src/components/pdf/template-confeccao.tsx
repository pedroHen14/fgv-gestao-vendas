import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { MODELO_GRADE_LABELS } from "@/lib/constants";
import {
  formatCpfCnpj,
  formatCurrencyBRL,
  formatDateBR,
  formatTelefone,
} from "@/lib/formatters";
import {
  TAMANHOS_PADRAO,
  somarGradeTamanhos,
} from "@/lib/validators/pedido";
import {
  formatEnderecoResumo,
  resolveFaturamentoDoc,
  type PedidoPdfDocumentProps,
} from "@/components/pdf/pdf-types";

const styles = StyleSheet.create({
  page: {
    paddingTop: 22,
    paddingBottom: 24,
    paddingHorizontal: 26,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  topBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#155e3b",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  topBannerLeft: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 0.4,
  },
  topBannerRight: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  datesBar: {
    flexDirection: "row",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    marginBottom: 8,
  },
  dateCell: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
  },
  dateCellLast: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    textTransform: "uppercase",
  },
  value: {
    fontSize: 9,
    color: "#0f172a",
    marginTop: 1.5,
  },
  valueBold: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 1.5,
  },
  gridBox: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    marginBottom: 8,
  },
  gridHeader: {
    backgroundColor: "#ecf3ef",
    paddingVertical: 3.5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  gridHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#14532d",
    textTransform: "uppercase",
  },
  gridRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  gridRowLast: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
    paddingVertical: 4.5,
    paddingHorizontal: 7,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  cell2: {
    flex: 2,
    paddingVertical: 4.5,
    paddingHorizontal: 7,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  cellLast: {
    flex: 1,
    paddingVertical: 4.5,
    paddingHorizontal: 7,
  },
  cell2Last: {
    flex: 2,
    paddingVertical: 4.5,
    paddingHorizontal: 7,
  },
  paymentChecks: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  checkItem: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  table: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    marginBottom: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#155e3b",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  colQty: {
    width: "10%",
    textAlign: "right",
    paddingRight: 8,
  },
  colDesc: {
    width: "58%",
    paddingRight: 6,
  },
  colUnit: {
    width: "16%",
    textAlign: "right",
    paddingRight: 6,
  },
  colTotal: {
    width: "16%",
    textAlign: "right",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingVertical: 4.5,
    paddingHorizontal: 8,
    backgroundColor: "#f8fafc",
    gap: 14,
  },
  summaryFinalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#155e3b",
    paddingVertical: 5.5,
    paddingHorizontal: 8,
    backgroundColor: "#ecf3ef",
    gap: 14,
  },
  gradeCard: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    marginBottom: 8,
  },
  gradeTitleBar: {
    backgroundColor: "#ecf3ef",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gradeTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#14532d",
    textTransform: "uppercase",
  },
  gradeSubtitle: {
    fontSize: 7.5,
    color: "#475569",
    maxWidth: 260,
  },
  gradeTableRow: {
    flexDirection: "row",
  },
  gradeHeaderCell: {
    flex: 1,
    paddingVertical: 3.5,
    textAlign: "center",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
    backgroundColor: "#f8fafc",
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  gradeHeaderTotal: {
    flex: 1.2,
    paddingVertical: 3.5,
    textAlign: "center",
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    backgroundColor: "#155e3b",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  gradeValueCell: {
    flex: 1,
    paddingVertical: 5,
    textAlign: "center",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
  },
  gradeValueTotal: {
    flex: 1.2,
    paddingVertical: 5,
    textAlign: "center",
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#155e3b",
    backgroundColor: "#ecf3ef",
  },
  mockupRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 8,
    justifyContent: "center",
  },
  mockupImage: {
    width: 170,
    height: 115,
    objectFit: "contain",
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
  },
  obsBox: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    padding: 7,
    marginBottom: 8,
    minHeight: 36,
  },
  footerSign: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    backgroundColor: "#f8fafc",
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  instFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#475569",
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 5,
  },
});

export function TemplateConfeccao({ pedido, mockups }: PedidoPdfDocumentProps) {
  const docInfo = resolveFaturamentoDoc(pedido);
  const endFat = formatEnderecoResumo(pedido.enderecoFaturamento);
  const endEnt = formatEnderecoResumo(pedido.enderecoEntrega);
  const fabricanteNome = (pedido.fornecedor?.nome || "CONFECÇÃO").toUpperCase();
  const numeroStr = pedido.numeroPedido?.trim() || "ORÇAMENTO";
  const descontoNum = Number(pedido.desconto ?? 0);

  const itensComGrade = pedido.itens.filter((item) => Boolean(item.gradeTamanhos));
  const forma = pedido.formaPagamento;

  const obsCombinadas = [
    pedido.obsNotaFiscal ? `NOTA FISCAL: ${pedido.obsNotaFiscal}` : null,
    pedido.observacoes,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Document title={`Pedido ${fabricanteNome} ${numeroStr} - ${pedido.cliente.razaoSocial}`}>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.topBanner}>
          <Text style={styles.topBannerLeft}>DADOS PARA FATURAMENTO</Text>
          <Text style={styles.topBannerRight}>
            PEDIDO {fabricanteNome} NR: {numeroStr}
          </Text>
        </View>

        <View style={styles.datesBar}>
          <View style={styles.dateCell}>
            <Text style={styles.label}>Data Pedido</Text>
            <Text style={styles.valueBold}>{formatDateBR(pedido.dataPedido)}</Text>
          </View>
          <View style={styles.dateCell}>
            <Text style={styles.label}>Data Orçamento</Text>
            <Text style={styles.value}>{formatDateBR(pedido.dataOrcamento)}</Text>
          </View>
          <View style={styles.dateCellLast}>
            <Text style={styles.label}>Data Saída Fábrica</Text>
            <Text style={styles.valueBold}>
              {formatDateBR(pedido.dataSaidaFabrica)}
            </Text>
          </View>
        </View>

        {/* Bloco Cliente & Pagamento */}
        <View style={styles.gridBox} wrap={false}>
          <View style={styles.gridRow}>
            <View style={styles.cell2}>
              <Text style={styles.label}>Empresa</Text>
              <Text style={styles.valueBold}>{pedido.cliente.razaoSocial}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.label}>{docInfo.docLabel}</Text>
              <Text style={styles.valueBold}>{docInfo.docValue}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.label}>Inscrição Estadual</Text>
              <Text style={styles.value}>{docInfo.ie}</Text>
            </View>
          </View>

          <View style={styles.gridRowLast}>
            <View style={styles.cell}>
              <Text style={styles.label}>Cond. Pagto.</Text>
              <Text style={styles.valueBold}>
                {pedido.condicaoPagamento || "—"}
              </Text>
            </View>
            <View style={styles.cell2}>
              <Text style={styles.label}>Forma de Pagamento</Text>
              <View style={styles.paymentChecks}>
                <Text style={styles.checkItem}>
                  [{forma === "DEPOSITO" ? "X" : " "}] DEPÓSITO
                </Text>
                <Text style={styles.checkItem}>
                  [{forma === "BOLETO" ? "X" : " "}] BOLETO
                </Text>
                <Text style={styles.checkItem}>
                  [{forma === "PIX" ? "X" : " "}] PIX
                </Text>
                {forma === "OUTRO" ? (
                  <Text style={styles.checkItem}>[X] OUTRO</Text>
                ) : null}
              </View>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.label}>Ordem de Compra Nr</Text>
              <Text style={styles.valueBold}>{pedido.ordemCompra || "—"}</Text>
            </View>
          </View>
        </View>

        {/* Bloco Endereço & Contato */}
        <View style={styles.gridBox} wrap={false}>
          <View style={styles.gridHeader}>
            <Text style={styles.gridHeaderText}>Endereço e Contato</Text>
          </View>
          <View style={styles.gridRow}>
            <View style={styles.cell2}>
              <Text style={styles.label}>Endereço</Text>
              <Text style={styles.value}>{endFat.logradouro}</Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.label}>Bairro</Text>
              <Text style={styles.value}>{endFat.bairro}</Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.label}>CEP</Text>
              <Text style={styles.value}>{endFat.cep}</Text>
            </View>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.cell2}>
              <Text style={styles.label}>Cidade / UF</Text>
              <Text style={styles.value}>
                {endFat.cidade} / {endFat.uf}
              </Text>
            </View>
            <View style={styles.cell}>
              <Text style={styles.label}>Comprador</Text>
              <Text style={styles.valueBold}>
                {pedido.comprador?.nome || "—"}
              </Text>
            </View>
            <View style={styles.cellLast}>
              <Text style={styles.label}>Fone Comprador</Text>
              <Text style={styles.value}>
                {formatTelefone(pedido.comprador?.telefone)}
              </Text>
            </View>
          </View>

          <View style={styles.gridRowLast}>
            <View style={styles.cell2}>
              <Text style={styles.label}>E-mail Comprador</Text>
              <Text style={styles.value}>{pedido.comprador?.email || "—"}</Text>
            </View>
            <View style={styles.cell2Last}>
              <Text style={styles.label}>E-mail Depto. Financeiro</Text>
              <Text style={styles.value}>
                {pedido.comprador?.emailFinanceiro || "—"}
              </Text>
            </View>
          </View>
        </View>

        {/* Bloco Local de Entrega */}
        <View style={styles.gridBox} wrap={false}>
          <View style={styles.gridHeader}>
            <Text style={styles.gridHeaderText}>Local de Entrega</Text>
          </View>
          {pedido.entregaMesmoFaturamento ? (
            <View style={styles.gridRowLast}>
              <View style={styles.cell2}>
                <Text style={styles.label}>Endereço</Text>
                <Text style={styles.valueBold}>MESMO ACIMA</Text>
              </View>
              <View style={styles.cellLast}>
                <Text style={styles.label}>A/C de</Text>
                <Text style={styles.valueBold}>{pedido.acEntrega || "—"}</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.gridRow}>
                <View style={styles.cell2}>
                  <Text style={styles.label}>Empresa / Unidade</Text>
                  <Text style={styles.valueBold}>
                    {pedido.enderecoEntrega?.rotulo
                      ? `${pedido.cliente.razaoSocial} (${pedido.enderecoEntrega.rotulo})`
                      : pedido.cliente.razaoSocial}
                  </Text>
                </View>
                <View style={styles.cellLast}>
                  <Text style={styles.label}>CNPJ / CPF Entrega</Text>
                  <Text style={styles.value}>
                    {formatCpfCnpj(
                      pedido.enderecoEntrega?.cnpjFilial || pedido.cliente.cpfCnpj
                    )}
                  </Text>
                </View>
              </View>
              <View style={styles.gridRow}>
                <View style={styles.cell2}>
                  <Text style={styles.label}>Endereço</Text>
                  <Text style={styles.value}>{endEnt.logradouro}</Text>
                </View>
                <View style={styles.cell}>
                  <Text style={styles.label}>Bairro</Text>
                  <Text style={styles.value}>{endEnt.bairro}</Text>
                </View>
                <View style={styles.cellLast}>
                  <Text style={styles.label}>CEP</Text>
                  <Text style={styles.value}>{endEnt.cep}</Text>
                </View>
              </View>
              <View style={styles.gridRowLast}>
                <View style={styles.cell2}>
                  <Text style={styles.label}>Cidade / UF</Text>
                  <Text style={styles.value}>
                    {endEnt.cidade} / {endEnt.uf}
                  </Text>
                </View>
                <View style={styles.cellLast}>
                  <Text style={styles.label}>A/C de</Text>
                  <Text style={styles.valueBold}>{pedido.acEntrega || "—"}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Tabela de Itens */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>QUANT.</Text>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>
              DESCRIÇÃO DOS PRODUTOS
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colUnit]}>VL. UNIT.</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>TOTAL</Text>
          </View>

          {pedido.itens.map((item) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <Text style={[styles.colQty, { fontFamily: "Helvetica-Bold" }]}>
                {item.quantidade}
              </Text>
              <Text style={styles.colDesc}>{item.descricaoTecnica}</Text>
              <Text style={styles.colUnit}>
                {formatCurrencyBRL(item.valorUnitario)}
              </Text>
              <Text style={[styles.colTotal, { fontFamily: "Helvetica-Bold" }]}>
                {formatCurrencyBRL(item.valorTotal)}
              </Text>
            </View>
          ))}

          <View style={styles.summaryRow} wrap={false}>
            <Text style={{ fontFamily: "Helvetica-Bold", color: "#475569" }}>
              SUBTOTAL:
            </Text>
            <Text style={{ fontFamily: "Helvetica-Bold", width: 85, textAlign: "right" }}>
              {formatCurrencyBRL(pedido.subtotal)}
            </Text>
          </View>

          {descontoNum > 0 ? (
            <View style={styles.summaryRow} wrap={false}>
              <Text style={{ fontFamily: "Helvetica-Bold", color: "#155e3b" }}>
                DESCONTO:
              </Text>
              <Text
                style={{
                  fontFamily: "Helvetica-Bold",
                  color: "#155e3b",
                  width: 85,
                  textAlign: "right",
                }}
              >
                - {formatCurrencyBRL(pedido.desconto)}
              </Text>
            </View>
          ) : null}

          <View style={styles.summaryFinalRow} wrap={false}>
            <Text
              style={{
                fontSize: 9.5,
                fontFamily: "Helvetica-Bold",
                color: "#14532d",
              }}
            >
              VALOR FINAL:
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontFamily: "Helvetica-Bold",
                color: "#14532d",
                width: 85,
                textAlign: "right",
              }}
            >
              {formatCurrencyBRL(pedido.valorTotal)}
            </Text>
          </View>
        </View>

        {/* Tabelas de Grade de Tamanhos */}
        {itensComGrade.map((item, idx) => {
          const grade = item.gradeTamanhos!;
          const resumoItem =
            item.descricaoTecnica.length > 52
              ? `${item.descricaoTecnica.slice(0, 52)}...`
              : item.descricaoTecnica;

          return (
            <View key={item.id} style={styles.gradeCard} wrap={false}>
              <View style={styles.gradeTitleBar}>
                <Text style={styles.gradeTitle}>
                  GRADE ITEM {idx + 1} — MODELO{" "}
                  {MODELO_GRADE_LABELS[grade.modelo].toUpperCase()}
                </Text>
                <Text style={styles.gradeSubtitle}>{resumoItem}</Text>
              </View>
              <View style={styles.gradeTableRow}>
                {TAMANHOS_PADRAO.map((tam) => (
                  <Text key={tam} style={styles.gradeHeaderCell}>
                    {tam}
                  </Text>
                ))}
                <Text style={styles.gradeHeaderTotal}>TOTAL</Text>
              </View>
              <View style={styles.gradeTableRow}>
                {TAMANHOS_PADRAO.map((tam) => (
                  <Text key={tam} style={styles.gradeValueCell}>
                    {grade.tamanhos[tam] ?? 0}
                  </Text>
                ))}
                <Text style={styles.gradeValueTotal}>
                  {somarGradeTamanhos(grade)}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Mockup / Arte Opcional */}
        {mockups.length > 0 ? (
          <View style={styles.gridBox} wrap={false}>
            <View style={styles.gridHeader}>
              <Text style={styles.gridHeaderText}>Arte / Mockup de Referência</Text>
            </View>
            <View style={styles.mockupRow}>
              {mockups.slice(0, 3).map((img, idx) => (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image key={idx} src={img.dataUri} style={styles.mockupImage} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Observações */}
        <View style={styles.obsBox} wrap={false}>
          <Text style={styles.label}>OBS</Text>
          <Text style={[styles.value, { lineHeight: 1.35 }]}>
            {obsCombinadas || "—"}
          </Text>
        </View>

        {/* Rodapé Vendedor / Comprador */}
        <View style={styles.footerSign} wrap={false}>
          <Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>VENDEDOR: </Text>
            {pedido.vendedor}
          </Text>
          <Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>COMPRADOR: </Text>
            {pedido.comprador?.nome || "—"}
          </Text>
        </View>

        <View style={styles.instFooter} wrap={false}>
          <Text>FGV REPRESENTAÇÕES COMERCIAIS</Text>
          <Text>comercialfgv@terra.com.br</Text>
        </View>
      </Page>
    </Document>
  );
}
