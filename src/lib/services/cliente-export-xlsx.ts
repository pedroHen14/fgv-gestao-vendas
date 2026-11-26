import ExcelJS from "exceljs";
import type { ClienteParaExportacao } from "@/lib/services/clientes";
import {
  FORMA_PAGAMENTO_LABELS,
  STATUS_PEDIDO_META,
  TIPO_ENDERECO_LABELS,
  TIPO_INTERACAO_LABELS,
  TIPO_PESSOA_CURTO,
  type StatusPedido,
} from "@/lib/constants";
import {
  formatCep,
  formatCpfCnpj,
  formatDateBR,
  formatDateTimeBR,
  formatTelefone,
} from "@/lib/formatters";

const FGV_GREEN = "FF155E3B";
const FGV_GREEN_LIGHT = "FFECF3EF";
const BORDER_COLOR = "FFDDE5E1";
const TEXT_DARK = "FF0F172A";
const TEXT_MUTED = "FF475569";

const STATUS_FATURADOS = new Set<StatusPedido>([
  "APROVADO",
  "EM_PRODUCAO",
  "EM_TRANSITO",
  "ENTREGUE",
]);

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDER_COLOR } },
  left: { style: "thin", color: { argb: BORDER_COLOR } },
  bottom: { style: "thin", color: { argb: BORDER_COLOR } },
  right: { style: "thin", color: { argb: BORDER_COLOR } },
};

/**
 * Gera planilha .xlsx completa no padrão familiar da FGV Representações,
 * substituindo a ficha manual de Excel por cliente.
 */
export async function generateClienteHistoricoXlsx(
  cliente: ClienteParaExportacao
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FGV Representações Comerciais";
  workbook.created = new Date();

  // ==========================================
  // ABA 1: FICHA E HISTÓRICO DE PEDIDOS
  // ==========================================
  const sheet = workbook.addWorksheet("Histórico do Cliente", {
    views: [{ state: "frozen", ySplit: 0 }],
  });

  sheet.columns = [
    { key: "data", width: 13 },
    { key: "numero", width: 14 },
    { key: "status", width: 20 },
    { key: "fornecedor", width: 20 },
    { key: "descricao", width: 44 },
    { key: "quantidade", width: 10 },
    { key: "unitario", width: 14 },
    { key: "pagamento", width: 20 },
    { key: "total", width: 16 },
    { key: "feira", width: 18 },
    { key: "comprador", width: 20 },
    { key: "vendedor", width: 14 },
    { key: "ocorrencias", width: 30 },
  ];

  // Título da Ficha
  sheet.mergeCells("A1:M1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = `FGV REPRESENTAÇÕES COMERCIAIS — FICHA DO CLIENTE: ${cliente.razaoSocial.toUpperCase()}`;
  titleCell.font = { name: "Calibri", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FGV_GREEN } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  sheet.getRow(1).height = 28;

  const enderecoPrincipal =
    cliente.enderecos.find((e) => e.principal) ?? cliente.enderecos[0] ?? null;
  const compradoresAtivos = cliente.compradores.filter((c) => c.ativo);
  const compradoresTexto =
    compradoresAtivos.length > 0
      ? compradoresAtivos
          .map(
            (c) =>
              `${c.nome}${c.email ? ` (${c.email})` : ""}${c.telefone ? ` — ${formatTelefone(c.telefone)}` : ""}`
          )
          .join(" | ")
      : "—";

  const infoRows: Array<[string, string, string, string]> = [
    [
      "EMPRESA / CLIENTE:",
      cliente.razaoSocial,
      "TIPO:",
      TIPO_PESSOA_CURTO[cliente.tipoPessoa],
    ],
    [
      cliente.tipoPessoa === "PJ" ? "CNPJ:" : "CPF:",
      formatCpfCnpj(cliente.cpfCnpj),
      "INSCRIÇÃO ESTADUAL:",
      cliente.inscricaoEstadual || "—",
    ],
    [
      "ENDEREÇO PRINCIPAL:",
      enderecoPrincipal
        ? `${enderecoPrincipal.logradouro}${enderecoPrincipal.bairro ? `, ${enderecoPrincipal.bairro}` : ""} — ${enderecoPrincipal.cidade}/${enderecoPrincipal.uf.trim()}${enderecoPrincipal.cep ? ` (CEP ${formatCep(enderecoPrincipal.cep)})` : ""}`
        : "—",
      cliente.tipoPessoa === "PF" ? "DATA NASCIMENTO:" : "ORIGEM / INDICAÇÃO:",
      cliente.tipoPessoa === "PF"
        ? formatDateBR(cliente.dataNascimento)
        : cliente.origemIndicacao || "—",
    ],
    [
      "COMPRADORES ATIVOS:",
      compradoresTexto,
      "EXPORTADO EM:",
      formatDateTimeBR(new Date()),
    ],
  ];

  if (cliente.observacoes) {
    infoRows.push(["OBSERVAÇÕES:", cliente.observacoes, "", ""]);
  }

  let rowIndex = 2;
  for (const [label1, val1, label2, val2] of infoRows) {
    const row = sheet.getRow(rowIndex);
    row.getCell(1).value = label1;
    row.getCell(1).font = { bold: true, size: 10, color: { argb: FGV_GREEN } };
    sheet.mergeCells(rowIndex, 2, rowIndex, 8);
    row.getCell(2).value = val1;
    row.getCell(2).font = { size: 10, color: { argb: TEXT_DARK } };
    row.getCell(2).alignment = { wrapText: true, vertical: "middle" };

    row.getCell(9).value = label2;
    row.getCell(9).font = { bold: true, size: 10, color: { argb: FGV_GREEN } };
    sheet.mergeCells(rowIndex, 10, rowIndex, 13);
    row.getCell(10).value = val2;
    row.getCell(10).font = { size: 10, color: { argb: TEXT_DARK } };
    row.getCell(10).alignment = { wrapText: true, vertical: "middle" };

    for (let col = 1; col <= 13; col++) {
      row.getCell(col).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: FGV_GREEN_LIGHT },
      };
      row.getCell(col).border = THIN_BORDER;
    }
    row.height = 20;
    rowIndex++;
  }

  // Linha em branco de respiro
  rowIndex++;

  // Cabeçalho da Tabela de Histórico
  const headerRow = sheet.getRow(rowIndex);
  const headers = [
    "DATA",
    "Nº PEDIDO",
    "STATUS",
    "FABRICANTE",
    "DESCRIÇÃO DOS ITENS",
    "QTD.",
    "VL. UNITÁRIO",
    "PAGAMENTO",
    "TOTAL",
    "FEIRA / EVENTO",
    "COMPRADOR",
    "VENDEDOR",
    "OCORRÊNCIAS / OBS",
  ];
  headers.forEach((title, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = title;
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FGV_GREEN } };
    cell.alignment = {
      vertical: "middle",
      horizontal: idx === 5 || idx === 6 || idx === 8 ? "right" : "left",
    };
    cell.border = THIN_BORDER;
  });
  headerRow.height = 24;
  rowIndex++;

  let totalFechadoAcumulado = 0;
  let qtdPedidosFechados = 0;

  if (cliente.pedidos.length === 0) {
    sheet.mergeCells(rowIndex, 1, rowIndex, 13);
    const emptyCell = sheet.getCell(rowIndex, 1);
    emptyCell.value = "Nenhum pedido ou orçamento registrado para este cliente até o momento.";
    emptyCell.font = { italic: true, size: 10, color: { argb: TEXT_MUTED } };
    emptyCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(rowIndex).height = 24;
    rowIndex++;
  } else {
    for (const pedido of cliente.pedidos) {
      const ehFaturado = STATUS_FATURADOS.has(pedido.status);
      if (ehFaturado) {
        totalFechadoAcumulado += Number(pedido.valorTotal ?? 0);
        qtdPedidosFechados++;
      }

      const itensOrdenados = [...pedido.itens].sort((a, b) => a.ordem - b.ordem);
      const pagamentoStr = [
        pedido.condicaoPagamento,
        pedido.formaPagamento ? FORMA_PAGAMENTO_LABELS[pedido.formaPagamento] : null,
      ]
        .filter(Boolean)
        .join(" / ");
      const obsTexto = [pedido.ocorrencias, pedido.observacoes]
        .filter(Boolean)
        .join(" | ");
      const dataRef = formatDateBR(pedido.dataPedido ?? pedido.dataOrcamento);

      if (itensOrdenados.length <= 1) {
        const item = itensOrdenados[0];
        const row = sheet.getRow(rowIndex);
        row.getCell(1).value = dataRef;
        row.getCell(2).value = pedido.numeroPedido || "Orçamento";
        row.getCell(3).value = STATUS_PEDIDO_META[pedido.status].label;
        row.getCell(4).value = pedido.fornecedor?.nome || "—";
        row.getCell(5).value = item?.descricaoTecnica || "—";
        row.getCell(6).value = item?.quantidade ?? 0;
        row.getCell(7).value = item ? Number(item.valorUnitario ?? 0) : 0;
        row.getCell(8).value = pagamentoStr || "—";
        row.getCell(9).value = Number(pedido.valorTotal ?? 0);
        row.getCell(10).value = pedido.eventoFeira || "—";
        row.getCell(11).value = pedido.comprador?.nome || "—";
        row.getCell(12).value = pedido.vendedor;
        row.getCell(13).value = obsTexto || "—";

        styleDataRow(row, pedido.status === "CANCELADO" || pedido.status === "PERDIDO");
        rowIndex++;
      } else {
        // Quando há múltiplos itens, exibe uma linha por item preservando clareza de preço e total
        itensOrdenados.forEach((item, idx) => {
          const row = sheet.getRow(rowIndex);
          row.getCell(1).value = idx === 0 ? dataRef : "";
          row.getCell(2).value =
            idx === 0
              ? pedido.numeroPedido || "Orçamento"
              : `↳ Item ${idx + 1}`;
          row.getCell(3).value =
            idx === 0 ? STATUS_PEDIDO_META[pedido.status].label : "";
          row.getCell(4).value = idx === 0 ? pedido.fornecedor?.nome || "—" : "";
          row.getCell(5).value = item.descricaoTecnica;
          row.getCell(6).value = item.quantidade;
          row.getCell(7).value = Number(item.valorUnitario ?? 0);
          row.getCell(8).value = idx === 0 ? pagamentoStr || "—" : "";
          row.getCell(9).value = Number(item.valorTotal ?? 0);
          row.getCell(10).value = idx === 0 ? pedido.eventoFeira || "—" : "";
          row.getCell(11).value = idx === 0 ? pedido.comprador?.nome || "—" : "";
          row.getCell(12).value = idx === 0 ? pedido.vendedor : "";
          row.getCell(13).value = idx === 0 ? obsTexto || "—" : "";

          styleDataRow(
            row,
            pedido.status === "CANCELADO" || pedido.status === "PERDIDO"
          );
          rowIndex++;
        });

        if (Number(pedido.desconto ?? 0) > 0) {
          const descRow = sheet.getRow(rowIndex);
          descRow.getCell(2).value = pedido.numeroPedido || "Orçamento";
          descRow.getCell(5).value = "Desconto aplicado no pedido";
          descRow.getCell(9).value = -Number(pedido.desconto ?? 0);
          styleDataRow(descRow, false);
          descRow.getCell(5).font = { italic: true, size: 10, color: { argb: FGV_GREEN } };
          descRow.getCell(9).font = { bold: true, size: 10, color: { argb: FGV_GREEN } };
          rowIndex++;
        }
      }
    }
  }

  // Linha de Total Acumulado
  rowIndex++;
  const totalRow = sheet.getRow(rowIndex);
  sheet.mergeCells(rowIndex, 1, rowIndex, 8);
  totalRow.getCell(1).value = `TOTAL ACUMULADO (${qtdPedidosFechados} pedido${qtdPedidosFechados === 1 ? "" : "s"} fechado${qtdPedidosFechados === 1 ? "" : "s"} — exclui orçamentos, cancelados e perdidos)`;
  totalRow.getCell(1).font = { bold: true, size: 10, color: { argb: FGV_GREEN } };
  totalRow.getCell(1).alignment = { horizontal: "right", vertical: "middle" };

  totalRow.getCell(9).value = totalFechadoAcumulado;
  totalRow.getCell(9).numFmt = 'R$ #,##0.00';
  totalRow.getCell(9).font = { bold: true, size: 11, color: { argb: FGV_GREEN } };
  totalRow.getCell(9).alignment = { horizontal: "right", vertical: "middle" };

  for (let col = 1; col <= 13; col++) {
    totalRow.getCell(col).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: FGV_GREEN_LIGHT },
    };
    totalRow.getCell(col).border = THIN_BORDER;
  }
  totalRow.height = 24;

  // ==========================================
  // ABA 2: LINHA DO TEMPO (CONTATOS)
  // ==========================================
  const sheetContatos = workbook.addWorksheet("Linha do Tempo");
  sheetContatos.columns = [
    { key: "data", width: 18 },
    { key: "tipo", width: 18 },
    { key: "comprador", width: 24 },
    { key: "pedido", width: 16 },
    { key: "resumo", width: 65 },
  ];

  const cHeader = sheetContatos.getRow(1);
  ["DATA / HORA", "CANAL", "COMPRADOR", "PEDIDO REF.", "RESUMO DO CONTATO"].forEach(
    (label, idx) => {
      const cell = cHeader.getCell(idx + 1);
      cell.value = label;
      cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FGV_GREEN } };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = THIN_BORDER;
    }
  );
  cHeader.height = 24;

  if (cliente.interacoes.length === 0) {
    sheetContatos.mergeCells("A2:E2");
    const cell = sheetContatos.getCell("A2");
    cell.value = "Nenhuma interação registrada na linha do tempo.";
    cell.font = { italic: true, color: { argb: TEXT_MUTED } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  } else {
    cliente.interacoes.forEach((interacao, idx) => {
      const row = sheetContatos.getRow(idx + 2);
      row.getCell(1).value = formatDateTimeBR(interacao.dataInteracao);
      row.getCell(2).value = TIPO_INTERACAO_LABELS[interacao.tipo];
      row.getCell(3).value = interacao.comprador?.nome || "—";
      row.getCell(4).value = interacao.pedido?.numeroPedido
        ? `Pedido ${interacao.pedido.numeroPedido}`
        : "—";
      row.getCell(5).value = interacao.resumo;
      for (let col = 1; col <= 5; col++) {
        row.getCell(col).border = THIN_BORDER;
        row.getCell(col).alignment = { vertical: "top", wrapText: true };
      }
    });
  }

  // ==========================================
  // ABA 3: ENDEREÇOS E COMPRADORES
  // ==========================================
  const sheetCad = workbook.addWorksheet("Endereços e Compradores");
  sheetCad.columns = [
    { key: "col1", width: 22 },
    { key: "col2", width: 26 },
    { key: "col3", width: 24 },
    { key: "col4", width: 26 },
    { key: "col5", width: 18 },
    { key: "col6", width: 16 },
  ];

  sheetCad.mergeCells("A1:F1");
  const endTitle = sheetCad.getCell("A1");
  endTitle.value = "ENDEREÇOS E FILIAIS";
  endTitle.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  endTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FGV_GREEN } };
  sheetCad.getRow(1).height = 24;

  const endHeader = sheetCad.getRow(2);
  ["TIPO / RÓTULO", "LOGRADOURO", "BAIRRO", "CIDADE / UF", "CEP", "CNPJ / IE FILIAL"].forEach(
    (label, idx) => {
      const cell = endHeader.getCell(idx + 1);
      cell.value = label;
      cell.font = { bold: true, size: 10, color: { argb: FGV_GREEN } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FGV_GREEN_LIGHT } };
      cell.border = THIN_BORDER;
    }
  );

  let cadRow = 3;
  for (const end of cliente.enderecos) {
    const row = sheetCad.getRow(cadRow);
    row.getCell(1).value = `${TIPO_ENDERECO_LABELS[end.tipo]}${end.rotulo ? ` — ${end.rotulo}` : ""}${end.principal ? " (Principal)" : ""}`;
    row.getCell(2).value = end.logradouro;
    row.getCell(3).value = end.bairro || "—";
    row.getCell(4).value = `${end.cidade}/${end.uf.trim()}`;
    row.getCell(5).value = formatCep(end.cep);
    row.getCell(6).value = [
      end.cnpjFilial ? formatCpfCnpj(end.cnpjFilial) : null,
      end.ieFilial ? `IE ${end.ieFilial}` : null,
    ]
      .filter(Boolean)
      .join(" | ") || "—";
    for (let col = 1; col <= 6; col++) {
      row.getCell(col).border = THIN_BORDER;
      row.getCell(col).alignment = { wrapText: true, vertical: "top" };
    }
    cadRow++;
  }

  cadRow += 2;
  sheetCad.mergeCells(cadRow, 1, cadRow, 6);
  const compTitle = sheetCad.getCell(cadRow, 1);
  compTitle.value = "COMPRADORES E CONTATOS";
  compTitle.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  compTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FGV_GREEN } };
  sheetCad.getRow(cadRow).height = 24;
  cadRow++;

  const compHeader = sheetCad.getRow(cadRow);
  ["NOME", "E-MAIL", "E-MAIL FINANCEIRO", "TELEFONE", "DEPARTAMENTO", "SITUAÇÃO"].forEach(
    (label, idx) => {
      const cell = compHeader.getCell(idx + 1);
      cell.value = label;
      cell.font = { bold: true, size: 10, color: { argb: FGV_GREEN } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: FGV_GREEN_LIGHT } };
      cell.border = THIN_BORDER;
    }
  );
  cadRow++;

  for (const comp of cliente.compradores) {
    const row = sheetCad.getRow(cadRow);
    row.getCell(1).value = comp.nome;
    row.getCell(2).value = comp.email || "—";
    row.getCell(3).value = comp.emailFinanceiro || "—";
    row.getCell(4).value = formatTelefone(comp.telefone);
    row.getCell(5).value = comp.departamento || "—";
    row.getCell(6).value = comp.ativo ? "Ativo" : "Inativo";
    for (let col = 1; col <= 6; col++) {
      row.getCell(col).border = THIN_BORDER;
      row.getCell(col).alignment = { wrapText: true, vertical: "top" };
    }
    cadRow++;
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function styleDataRow(row: ExcelJS.Row, isMuted: boolean) {
  row.getCell(6).numFmt = "#,##0";
  row.getCell(6).alignment = { horizontal: "right", vertical: "top" };
  row.getCell(7).numFmt = 'R$ #,##0.00';
  row.getCell(7).alignment = { horizontal: "right", vertical: "top" };
  row.getCell(9).numFmt = 'R$ #,##0.00';
  row.getCell(9).alignment = { horizontal: "right", vertical: "top" };

  for (let col = 1; col <= 13; col++) {
    const cell = row.getCell(col);
    cell.border = THIN_BORDER;
    if (col !== 6 && col !== 7 && col !== 9) {
      cell.alignment = { vertical: "top", wrapText: true };
    }
    cell.font = {
      size: 10,
      color: { argb: isMuted ? TEXT_MUTED : TEXT_DARK },
      strike: isMuted,
      bold: col === 9 && !isMuted,
    };
  }
}
