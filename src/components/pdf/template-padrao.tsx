import React from "react";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import {
  FORMA_PAGAMENTO_LABELS,
  MODELO_GRADE_LABELS,
} from "@/lib/constants";
import {
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
  getPedidoDataReferencia,
  getPedidoTituloNumero,
  resolveFaturamentoDoc,
  type PedidoPdfDocumentProps,
} from "@/components/pdf/pdf-types";

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingBottom: 28,
    paddingHorizontal: 30,
    fontSize: 9.5,
    fontFamily: "Helvetica",
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#155e3b",
    paddingBottom: 10,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#155e3b",
  },
  brandSub: {
    fontSize: 8.5,
    color: "#475569",
    marginTop: 2,
  },
  badgeBox: {
    backgroundColor: "#ecf3ef",
    borderWidth: 1,
    borderColor: "#155e3b",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: "flex-end",
  },
  badgeTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#155e3b",
  },
  badgeSub: {
    fontSize: 8,
    color: "#334155",
    marginTop: 2,
  },
  twoCols: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
  },
  cardHeader: {
    backgroundColor: "#ecf3ef",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  cardTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#14532d",
    textTransform: "uppercase",
  },
  cardBody: {
    padding: 8,
    gap: 3,
  },
  label: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    textTransform: "uppercase",
  },
  value: {
    fontSize: 9,
    color: "#0f172a",
  },
  valueBold: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  metaStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    backgroundColor: "#f8fafc",
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 10,
    gap: 12,
  },
  metaItem: {
    minWidth: 95,
  },
  table: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#155e3b",
    paddingVertical: 5.5,
    paddingHorizontal: 7,
  },
  tableHeaderCell: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingVertical: 6,
    paddingHorizontal: 7,
  },
  colQty: {
    width: "11%",
    textAlign: "right",
    paddingRight: 8,
  },
  colDesc: {
    width: "55%",
    paddingRight: 6,
  },
  colUnit: {
    width: "17%",
    textAlign: "right",
    paddingRight: 6,
  },
  colTotal: {
    width: "17%",
    textAlign: "right",
  },
  totalsBox: {
    alignSelf: "flex-end",
    width: 220,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: "#f8fafc",
    marginBottom: 10,
    gap: 3,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalsFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 4,
    marginTop: 2,
  },
  mockupSection: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    marginBottom: 10,
  },
  mockupBody: {
    padding: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  mockupImg: {
    width: 220,
    maxHeight: 160,
    objectFit: "contain",
  },
  obsSection: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
    gap: 4,
  },
  footer: {
    borderTopWidth: 1.5,
    borderTopColor: "#155e3b",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gradeMini: {
    marginTop: 4,
    fontSize: 8,
    color: "#334155",
  },
});

export function TemplatePadrao({ pedido, mockups }: PedidoPdfDocumentProps) {
  const docInfo = resolveFaturamentoDoc(pedido);
  const endFat = formatEnderecoResumo(pedido.enderecoFaturamento);
  const endEnt = formatEnderecoResumo(pedido.enderecoEntrega);
  const dataRef = getPedidoDataReferencia(pedido);
  const tituloNumero = getPedidoTituloNumero(pedido);
  const descontoNum = Number(pedido.desconto ?? 0);

  return (
    <Document title={`${tituloNumero} - ${pedido.cliente.razaoSocial}`}>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho institucional */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>FGV REPRESENTAÇÕES COMERCIAIS</Text>
            <Text style={styles.brandSub}>
              E-mail: comercialfgv@terra.com.br
              {pedido.fornecedor
                ? `  •  Fabricante: ${pedido.fornecedor.nome}`
                : ""}
            </Text>
          </View>
          <View style={styles.badgeBox}>
            <Text style={styles.badgeTitle}>{tituloNumero}</Text>
            <Text style={styles.badgeSub}>Data: {dataRef}</Text>
          </View>
        </View>

        {/* Faturamento + Entrega lado a lado */}
        <View style={styles.twoCols} wrap={false}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Dados para Faturamento</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.valueBold}>{pedido.cliente.razaoSocial}</Text>
              <Text style={styles.value}>
                {docInfo.docLabel}: {docInfo.docValue}
                {docInfo.ie !== "—" ? `  •  IE: ${docInfo.ie}` : ""}
              </Text>
              {docInfo.dataNascimento ? (
                <Text style={styles.value}>
                  Data de Nascimento: {docInfo.dataNascimento}
                </Text>
              ) : null}
              <Text style={styles.value}>{endFat.completo}</Text>
              {pedido.comprador ? (
                <Text style={[styles.value, { marginTop: 2 }]}>
                  Comprador: {pedido.comprador.nome}
                  {pedido.comprador.telefone
                    ? ` (${formatTelefone(pedido.comprador.telefone)})`
                    : ""}
                </Text>
              ) : null}
              {pedido.comprador?.email ? (
                <Text style={styles.value}>E-mail: {pedido.comprador.email}</Text>
              ) : null}
              {pedido.comprador?.emailFinanceiro ? (
                <Text style={styles.value}>
                  Financeiro: {pedido.comprador.emailFinanceiro}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Local de Entrega</Text>
            </View>
            <View style={styles.cardBody}>
              {pedido.entregaMesmoFaturamento ? (
                <Text style={styles.valueBold}>
                  Mesmo endereço de faturamento
                </Text>
              ) : (
                <Text style={styles.value}>{endEnt.completo}</Text>
              )}
              {pedido.acEntrega ? (
                <Text style={[styles.valueBold, { marginTop: 3 }]}>
                  A/C: {pedido.acEntrega}
                </Text>
              ) : null}
              {pedido.eventoFeira ? (
                <Text style={[styles.value, { marginTop: 6 }]}>
                  Feira / Evento: {pedido.eventoFeira}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Condições Comerciais */}
        <View style={styles.metaStrip} wrap={false}>
          <View style={styles.metaItem}>
            <Text style={styles.label}>Cond. Pagamento</Text>
            <Text style={styles.valueBold}>
              {pedido.condicaoPagamento || "—"}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.label}>Forma</Text>
            <Text style={styles.value}>
              {pedido.formaPagamento
                ? FORMA_PAGAMENTO_LABELS[pedido.formaPagamento]
                : "—"}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.label}>Ordem de Compra</Text>
            <Text style={styles.valueBold}>{pedido.ordemCompra || "—"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.label}>Prazo Entrega</Text>
            <Text style={styles.value}>
              {pedido.prazoEntregaDias
                ? `${pedido.prazoEntregaDias} dias`
                : "A combinar"}
            </Text>
          </View>
          {pedido.dataSaidaFabrica ? (
            <View style={styles.metaItem}>
              <Text style={styles.label}>Saída Fábrica</Text>
              <Text style={styles.valueBold}>
                {formatDateBR(pedido.dataSaidaFabrica)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Tabela de Itens */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>QTD.</Text>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>
              DESCRIÇÃO DO PRODUTO
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colUnit]}>UNITÁRIO</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>TOTAL</Text>
          </View>

          {pedido.itens.map((item) => (
            <View key={item.id} style={styles.tableRow} wrap={false}>
              <Text style={[styles.colQty, { fontFamily: "Helvetica-Bold" }]}>
                {item.quantidade}
              </Text>
              <View style={styles.colDesc}>
                <Text>{item.descricaoTecnica}</Text>
                {item.gradeTamanhos ? (
                  <Text style={styles.gradeMini}>
                    Grade ({MODELO_GRADE_LABELS[item.gradeTamanhos.modelo]}):{" "}
                    {TAMANHOS_PADRAO.filter(
                      (t) => (item.gradeTamanhos?.tamanhos[t] ?? 0) > 0
                    )
                      .map((t) => `${t}: ${item.gradeTamanhos?.tamanhos[t]}`)
                      .join(" | ")}{" "}
                    (Total: {somarGradeTamanhos(item.gradeTamanhos)})
                  </Text>
                ) : null}
              </View>
              <Text style={styles.colUnit}>
                {formatCurrencyBRL(item.valorUnitario)}
              </Text>
              <Text style={[styles.colTotal, { fontFamily: "Helvetica-Bold" }]}>
                {formatCurrencyBRL(item.valorTotal)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totais */}
        <View style={styles.totalsBox} wrap={false}>
          {descontoNum > 0 ? (
            <>
              <View style={styles.totalsRow}>
                <Text>Subtotal</Text>
                <Text>{formatCurrencyBRL(pedido.subtotal)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text>Desconto</Text>
                <Text>- {formatCurrencyBRL(pedido.desconto)}</Text>
              </View>
            </>
          ) : null}
          <View style={descontoNum > 0 ? styles.totalsFinal : styles.totalsRow}>
            <Text
              style={{
                fontSize: 10,
                fontFamily: "Helvetica-Bold",
                color: "#155e3b",
              }}
            >
              VALOR TOTAL
            </Text>
            <Text
              style={{
                fontSize: 10.5,
                fontFamily: "Helvetica-Bold",
                color: "#155e3b",
              }}
            >
              {formatCurrencyBRL(pedido.valorTotal)}
            </Text>
          </View>
        </View>

        {/* Imagem Opcional */}
        {mockups.length > 0 ? (
          <View style={styles.mockupSection} wrap={false}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Arte / Mockup de Referência</Text>
            </View>
            <View style={styles.mockupBody}>
              {mockups.slice(0, 2).map((img, idx) => (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image key={idx} src={img.dataUri} style={styles.mockupImg} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Observações */}
        {pedido.obsNotaFiscal || pedido.observacoes ? (
          <View style={styles.obsSection} wrap={false}>
            {pedido.obsNotaFiscal ? (
              <View>
                <Text style={styles.label}>Observação para Nota Fiscal</Text>
                <Text style={[styles.valueBold, { marginTop: 1 }]}>
                  {pedido.obsNotaFiscal}
                </Text>
              </View>
            ) : null}
            {pedido.observacoes ? (
              <View style={{ marginTop: pedido.obsNotaFiscal ? 4 : 0 }}>
                <Text style={styles.label}>Observações Gerais</Text>
                <Text style={[styles.value, { marginTop: 1, lineHeight: 1.35 }]}>
                  {pedido.observacoes}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Rodapé */}
        <View style={styles.footer} wrap={false}>
          <View>
            <Text style={styles.valueBold}>Vendedor: {pedido.vendedor}</Text>
            <Text style={styles.brandSub}>
              FGV Representações Comerciais • comercialfgv@terra.com.br
            </Text>
          </View>
          <Text style={styles.valueBold}>SP, {dataRef}</Text>
        </View>
      </Page>
    </Document>
  );
}
