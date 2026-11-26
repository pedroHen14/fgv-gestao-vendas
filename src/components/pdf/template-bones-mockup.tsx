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
import { formatCurrencyBRL, formatTelefone } from "@/lib/formatters";
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
    paddingBottom: 8,
    marginBottom: 12,
  },
  factoryName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#155e3b",
    letterSpacing: 0.4,
  },
  subTitle: {
    fontSize: 8.5,
    color: "#475569",
    marginTop: 2,
  },
  pedidoBox: {
    backgroundColor: "#155e3b",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 4,
    alignItems: "flex-end",
  },
  pedidoBoxText: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  pedidoBoxDate: {
    fontSize: 8,
    color: "#d1fae5",
    marginTop: 2,
  },
  mockupContainer: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    padding: 8,
    marginBottom: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  mockupHeader: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    textTransform: "uppercase",
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  mockupImagePrimary: {
    width: "100%",
    maxHeight: 225,
    objectFit: "contain",
  },
  mockupGridSecondary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    justifyContent: "center",
  },
  mockupImageSecondary: {
    width: 155,
    height: 110,
    objectFit: "contain",
    borderWidth: 0.5,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  section: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    marginBottom: 10,
  },
  sectionTitleBar: {
    backgroundColor: "#ecf3ef",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  sectionTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#14532d",
    textTransform: "uppercase",
  },
  sectionBody: {
    padding: 8,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
  },
  col2: {
    flex: 2,
  },
  fieldLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#475569",
    textTransform: "uppercase",
  },
  fieldValue: {
    fontSize: 9.5,
    color: "#0f172a",
    marginTop: 1,
  },
  fieldValueBold: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 1,
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
    paddingVertical: 5,
    paddingHorizontal: 6,
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
    paddingHorizontal: 6,
  },
  colQty: {
    width: "12%",
    textAlign: "right",
    paddingRight: 8,
  },
  colDesc: {
    width: "54%",
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
    width: 210,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#f8fafc",
    marginBottom: 10,
    gap: 3,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalsFinalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 4,
    marginTop: 2,
  },
  totalsFinalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#155e3b",
  },
  totalsFinalValue: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: "#155e3b",
  },
  obsNfBox: {
    borderWidth: 1.2,
    borderColor: "#d97706",
    backgroundColor: "#fffbeb",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  obsNfTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#92400e",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  obsNfText: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#78350f",
    lineHeight: 1.35,
  },
  obsBox: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  footerMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    backgroundColor: "#f8fafc",
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  signature: {
    borderTopWidth: 1.5,
    borderTopColor: "#155e3b",
    paddingTop: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  signatureBrand: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#155e3b",
  },
  signatureEmail: {
    fontSize: 8.5,
    color: "#334155",
    marginTop: 1,
  },
  signatureDate: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#334155",
  },
  gradeMini: {
    marginTop: 4,
    fontSize: 8,
    color: "#334155",
  },
});

export function TemplateBonesMockup({ pedido, mockups }: PedidoPdfDocumentProps) {
  const docInfo = resolveFaturamentoDoc(pedido);
  const endFat = formatEnderecoResumo(pedido.enderecoFaturamento);
  const endEnt = formatEnderecoResumo(pedido.enderecoEntrega);
  const dataRef = getPedidoDataReferencia(pedido);
  const tituloNumero = getPedidoTituloNumero(pedido);
  const fabricanteNome = pedido.fornecedor?.nome || "FABRICANTE";
  const descontoNum = Number(pedido.desconto ?? 0);

  const pagamentoParts = [
    pedido.condicaoPagamento,
    pedido.formaPagamento ? FORMA_PAGAMENTO_LABELS[pedido.formaPagamento] : null,
  ].filter(Boolean);

  return (
    <Document title={`${tituloNumero} - ${pedido.cliente.razaoSocial}`}>
      <Page size="A4" style={styles.page}>
        {/* Topo: Nome do Fabricante + Número do Pedido */}
        <View style={styles.header}>
          <View>
            <Text style={styles.factoryName}>{fabricanteNome.toUpperCase()}</Text>
            <Text style={styles.subTitle}>
              Folha de Pedido • FGV Representações Comerciais
            </Text>
          </View>
          <View style={styles.pedidoBox}>
            <Text style={styles.pedidoBoxText}>{tituloNumero}</Text>
            <Text style={styles.pedidoBoxDate}>Data: {dataRef}</Text>
          </View>
        </View>

        {/* Imagem grande do mockup/arte técnica (quando houver) */}
        {mockups.length > 0 ? (
          <View style={styles.mockupContainer} wrap={false}>
            <Text style={styles.mockupHeader}>
              Arte Técnica / Mockup Aprovado
            </Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image
              src={mockups[0].dataUri}
              style={styles.mockupImagePrimary}
            />
            {mockups.length > 1 ? (
              <View style={styles.mockupGridSecondary}>
                {mockups.slice(1, 4).map((img, idx) => (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image
                    key={idx}
                    src={img.dataUri}
                    style={styles.mockupImageSecondary}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Bloco Dados para Faturamento */}
        <View style={styles.section} wrap={false}>
          <View style={styles.sectionTitleBar}>
            <Text style={styles.sectionTitle}>Dados para Faturamento</Text>
          </View>
          <View style={styles.sectionBody}>
            <View style={styles.row}>
              <View style={styles.col2}>
                <Text style={styles.fieldLabel}>Empresa / Nome</Text>
                <Text style={styles.fieldValueBold}>
                  {pedido.cliente.razaoSocial}
                </Text>
              </View>
              {docInfo.dataNascimento ? (
                <View style={styles.col}>
                  <Text style={styles.fieldLabel}>Data de Nascimento</Text>
                  <Text style={styles.fieldValueBold}>
                    {docInfo.dataNascimento}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.row}>
              <View style={styles.col2}>
                <Text style={styles.fieldLabel}>Endereço</Text>
                <Text style={styles.fieldValue}>
                  {endFat.logradouro}
                  {endFat.bairro !== "—" ? ` — Bairro: ${endFat.bairro}` : ""}
                </Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>CEP</Text>
                <Text style={styles.fieldValue}>{endFat.cep}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col2}>
                <Text style={styles.fieldLabel}>Cidade</Text>
                <Text style={styles.fieldValue}>{endFat.cidade}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Estado (UF)</Text>
                <Text style={styles.fieldValue}>{endFat.uf}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>{docInfo.docLabel}</Text>
                <Text style={styles.fieldValueBold}>{docInfo.docValue}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Inscrição Estadual</Text>
                <Text style={styles.fieldValue}>{docInfo.ie}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.fieldLabel}>Pagamento</Text>
                <Text style={styles.fieldValueBold}>
                  {pagamentoParts.length > 0 ? pagamentoParts.join(" — ") : "—"}
                </Text>
              </View>
            </View>

            {pedido.comprador || pedido.ordemCompra ? (
              <View style={styles.row}>
                {pedido.comprador ? (
                  <View style={styles.col2}>
                    <Text style={styles.fieldLabel}>Comprador / Contato</Text>
                    <Text style={styles.fieldValue}>
                      {pedido.comprador.nome}
                      {pedido.comprador.telefone
                        ? ` • ${formatTelefone(pedido.comprador.telefone)}`
                        : ""}
                      {pedido.comprador.email ? ` • ${pedido.comprador.email}` : ""}
                    </Text>
                  </View>
                ) : null}
                {pedido.ordemCompra ? (
                  <View style={styles.col}>
                    <Text style={styles.fieldLabel}>Ordem de Compra</Text>
                    <Text style={styles.fieldValueBold}>{pedido.ordemCompra}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* Bloco Local para Entrega */}
        <View style={styles.section} wrap={false}>
          <View style={styles.sectionTitleBar}>
            <Text style={styles.sectionTitle}>Local para Entrega</Text>
          </View>
          <View style={styles.sectionBody}>
            {pedido.entregaMesmoFaturamento ? (
              <Text style={styles.fieldValueBold}>
                MESMO ACIMA
                {pedido.acEntrega ? ` — A/C ${pedido.acEntrega}` : ""}
              </Text>
            ) : (
              <>
                <Text style={styles.fieldValue}>{endEnt.completo}</Text>
                {pedido.acEntrega ? (
                  <Text style={styles.fieldValueBold}>
                    A/C: {pedido.acEntrega}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </View>

        {/* Tabela de Itens */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>QUANTIDADE</Text>
            <Text style={[styles.tableHeaderCell, styles.colDesc]}>DESCRIÇÃO</Text>
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
          <View style={descontoNum > 0 ? styles.totalsFinalRow : styles.totalsRow}>
            <Text style={styles.totalsFinalLabel}>VALOR TOTAL</Text>
            <Text style={styles.totalsFinalValue}>
              {formatCurrencyBRL(pedido.valorTotal)}
            </Text>
          </View>
        </View>

        {/* Destaque para Observação de Nota Fiscal */}
        {pedido.obsNotaFiscal ? (
          <View style={styles.obsNfBox} wrap={false}>
            <Text style={styles.obsNfTitle}>Observação para Nota Fiscal</Text>
            <Text style={styles.obsNfText}>{pedido.obsNotaFiscal}</Text>
          </View>
        ) : null}

        {/* Observações Gerais */}
        {pedido.observacoes ? (
          <View style={styles.obsBox} wrap={false}>
            <Text style={styles.fieldLabel}>Observações</Text>
            <Text style={[styles.fieldValue, { marginTop: 2, lineHeight: 1.35 }]}>
              {pedido.observacoes}
            </Text>
          </View>
        ) : null}

        {/* Rodapé Técnico: Prazo e Vendedor */}
        <View style={styles.footerMeta} wrap={false}>
          <Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Prazo de entrega: </Text>
            {pedido.prazoEntregaDias
              ? `${pedido.prazoEntregaDias} DIAS`
              : "A combinar"}
          </Text>
          <Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Vendedor: </Text>
            {pedido.vendedor}
          </Text>
        </View>

        {/* Assinatura Institucional */}
        <View style={styles.signature} wrap={false}>
          <View>
            <Text style={styles.signatureBrand}>
              FGV REPRESENTAÇÕES COMERCIAIS
            </Text>
            <Text style={styles.signatureEmail}>
              E-mail: comercialfgv@terra.com.br
            </Text>
          </View>
          <Text style={styles.signatureDate}>SP, {dataRef}</Text>
        </View>
      </Page>
    </Document>
  );
}
