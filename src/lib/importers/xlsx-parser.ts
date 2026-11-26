import ExcelJS from "exceljs";
import { onlyDigits, roundMoney } from "@/lib/formatters";

export interface ParsedEndereco {
  tipo: "FATURAMENTO" | "FILIAL" | "ENTREGA";
  rotulo: string;
  cnpjFilial: string | null;
  ieFilial: string | null;
  logradouro: string;
  bairro: string | null;
  cidade: string;
  uf: string;
  cep: string | null;
  principal: boolean;
}

export interface ParsedComprador {
  nome: string;
  email: string | null;
  emailFinanceiro: string | null;
  telefone: string | null;
  departamento: string | null;
}

export interface ParsedInteracao {
  dataIso: string | null;
  tipo: "EMAIL" | "WHATSAPP" | "LIGACAO" | "FOLLOWUP" | "OBSERVACAO";
  resumo: string;
  compradorNome: string | null;
  linhaOrigem: number;
}

export interface ParsedPedidoHistorico {
  linhaOrigem: number;
  dataIso: string | null;
  descricao: string;
  condicaoPagamento: string | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  precoCompostoBruto: string | null;
  numeroPedido: string | null;
  vendedor: string;
  status: "ENTREGUE" | "CANCELADO";
  compradorNome: string | null;
  eventoFeira: string | null;
  fornecedorNome: string | null;
  ocorrencias: string | null;
}

export interface ParsedClientePlanilha {
  arquivo: string;
  aba: string;
  cliente: {
    tipoPessoa: "PJ" | "PF";
    razaoSocial: string;
    cpfCnpj: string | null;
    inscricaoEstadual: string | null;
    dataNascimento: string | null;
    origemIndicacao: string | null;
    observacoes: string | null;
  };
  enderecos: ParsedEndereco[];
  compradores: ParsedComprador[];
  pedidos: ParsedPedidoHistorico[];
  interacoes: ParsedInteracao[];
  avisos: string[];
}

const KNOWN_FAIRS = [
  "AGRISHOW",
  "SHOW RURAL",
  "EXPO DIRETO",
  "EXPODIRETO",
  "HORTITEC",
  "FEMAGRI",
  "SHOW SAFRA",
  "SHOWTEC",
  "AGROTINS",
  "ANDAV",
  "SIPAT",
  "FENICAFE",
  "COOPERCITRUS",
  "BAHIA FARM",
  "EXPOINTER",
  "TECNOSHOW",
];

const KNOWN_SUPPLIERS: { patterns: string[]; canonical: string }[] = [
  { patterns: ["DKS BONES", "DKS BONÉS", "DKS"], canonical: "DKS Bonés" },
  { patterns: ["AGATHA", "AGATA"], canonical: "Agatha" },
  { patterns: ["ELO BRINDES", "ELO"], canonical: "Elo Brindes" },
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(?:\+55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s.]?\d{4}/g;

export function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) {
    return dateToIso(value) ?? "";
  }
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText
        .map((part) => part.text ?? "")
        .join("")
        .trim();
    }
    if ("hyperlink" in value) {
      return String(value.text ?? value.hyperlink ?? "").trim();
    }
    if ("result" in value) {
      return cellToString(value.result as ExcelJS.CellValue);
    }
  }
  return String(value).trim();
}

function dateToIso(date: Date): string | null {
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  if (year < 1900 || year > 2100) return null;
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function cellToDateIso(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return dateToIso(value);
  }
  if (typeof value === "object" && "result" in value) {
    return cellToDateIso(value.result as ExcelJS.CellValue);
  }
  if (typeof value === "number" && value > 20000 && value < 70000) {
    // Excel serial date (epoch 1899-12-30)
    const ms = Math.round((value - 25569) * 86400 * 1000);
    return dateToIso(new Date(ms));
  }
  const text = cellToString(value);
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const brMatch = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, "0");
    const month = brMatch[2].padStart(2, "0");
    let year = brMatch[3];
    if (year.length === 2) {
      const yNum = Number(year);
      year = yNum >= 70 ? `19${year}` : `20${year}`;
    }
    return `${year}-${month}-${day}`;
  }

  return null;
}

function parseBrazilianNumber(raw: string): number | null {
  const cleaned = raw
    .replace(/R\$/gi, "")
    .replace(/\s+/g, "")
    .trim();
  if (!cleaned) return null;

  // Formato brasileiro com vírgula decimal: 1.234,56 ou 69,90
  if (cleaned.includes(",")) {
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  }

  // Formato com ponto decimal ou inteiro: 1234.56 ou 500
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function cellToNumber(value: ExcelJS.CellValue): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "object" && "result" in value) {
    return cellToNumber(value.result as ExcelJS.CellValue);
  }
  return parseBrazilianNumber(cellToString(value));
}

function detectFair(text: string): string | null {
  const norm = normalizeForMatch(text);
  for (const fair of KNOWN_FAIRS) {
    if (norm.includes(fair)) {
      return fair;
    }
  }
  return null;
}

function detectSupplier(text: string): string | null {
  const norm = normalizeForMatch(text);
  for (const sup of KNOWN_SUPPLIERS) {
    for (const pattern of sup.patterns) {
      const regex = new RegExp(`(^|\\b)${pattern}(\\b|$)`, "i");
      if (regex.test(norm)) {
        return sup.canonical;
      }
    }
  }
  return null;
}

function isOnlyEnviadoEmail(descricao: string): boolean {
  const norm = normalizeForMatch(descricao)
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (
    norm === "ENVIADO E MAIL" ||
    norm === "ENVIADO EMAIL" ||
    norm === "ENVIO DE E MAIL" ||
    norm === "ENVIO DE EMAIL" ||
    norm === "E MAIL ENVIADO" ||
    norm === "EMAIL ENVIADO"
  );
}

interface AddressBlock {
  rotulo: string;
  tipo: "FATURAMENTO" | "FILIAL";
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  cnpj: string;
  ie: string;
}

function createEmptyAddressBlock(
  rotulo: string,
  tipo: "FATURAMENTO" | "FILIAL"
): AddressBlock {
  return {
    rotulo,
    tipo,
    logradouro: "",
    bairro: "",
    cidade: "",
    uf: "",
    cep: "",
    cnpj: "",
    ie: "",
  };
}

function findNextNonEmptyInRow(
  rowValues: string[],
  startCol: number,
  maxLookahead = 3
): { col: number; value: string } | null {
  for (let c = startCol + 1; c <= Math.min(rowValues.length - 1, startCol + maxLookahead); c++) {
    const val = rowValues[c]?.trim();
    if (val) return { col: c, value: val };
  }
  return null;
}

function isLabelCell(norm: string): boolean {
  const prefixes = [
    "EMPRESA",
    "CLIENTE",
    "RAZAO",
    "NOME",
    "ENDERECO",
    "BAIRRO",
    "CIDADE",
    "ESTADO",
    "UF",
    "CEP",
    "CNPJ",
    "CPF",
    "INSCR",
    "IE",
    "DATA NASC",
    "NASCIMENTO",
    "FONE",
    "TELEFONE",
    "CELULAR",
    "COMPRADOR",
    "CONTATO",
    "DEPTO",
    "DEPARTAMENTO",
    "E-MAIL",
    "EMAIL",
    "FILIAL",
    "ORIGEM",
    "INDICACAO",
    "OBS",
  ];
  return prefixes.some((p) => norm === p || norm.startsWith(`${p}:`) || norm.startsWith(`${p}.`) || norm.startsWith(`${p} `));
}

function parseLabelInlineValue(raw: string): { labelNorm: string; inlineValue: string } {
  const colonIdx = raw.indexOf(":");
  if (colonIdx !== -1) {
    const left = raw.slice(0, colonIdx).trim();
    const right = raw.slice(colonIdx + 1).trim();
    return { labelNorm: normalizeForMatch(left), inlineValue: right };
  }
  return { labelNorm: normalizeForMatch(raw), inlineValue: "" };
}

export async function parsePlanilhaClienteXlsx(
  filePath: string
): Promise<ParsedClientePlanilha[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const results: ParsedClientePlanilha[] = [];

  for (const sheet of workbook.worksheets) {
    if (sheet.rowCount === 0) continue;
    const parsed = parseWorksheet(sheet, filePath);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

function parseWorksheet(
  sheet: ExcelJS.Worksheet,
  filePath: string
): ParsedClientePlanilha | null {
  const avisos: string[] = [];
  const totalRows = sheet.rowCount;
  const maxCols = Math.max(sheet.columnCount, 15);

  // Construir matriz 1-indexed de strings e raw cell values
  const stringMatrix: string[][] = [];
  const rawMatrix: ExcelJS.CellValue[][] = [];

  for (let r = 1; r <= totalRows; r++) {
    const row = sheet.getRow(r);
    const sRow: string[] = [""];
    const rRow: ExcelJS.CellValue[] = [null];
    for (let c = 1; c <= maxCols; c++) {
      const val = row.getCell(c).value;
      rRow.push(val);
      sRow.push(cellToString(val));
    }
    stringMatrix[r] = sRow;
    rawMatrix[r] = rRow;
  }

  // 1. Localizar linha de "HISTORICO" ou cabeçalho da tabela (DATA + DESCRIÇÃO)
  let historicoMarkerRow = -1;
  let tableHeaderRow = -1;

  for (let r = 1; r <= totalRows; r++) {
    const rowStrings = stringMatrix[r];
    for (let c = 1; c < rowStrings.length; c++) {
      const norm = normalizeForMatch(rowStrings[c]);
      if (norm === "HISTORICO" || norm.startsWith("HISTORICO ")) {
        historicoMarkerRow = r;
        break;
      }
    }
    if (historicoMarkerRow !== -1) break;
  }

  // Procurar cabeçalho da tabela (DATA / DESCRIÇÃO / TOTAL)
  const searchHeaderStart = historicoMarkerRow !== -1 ? historicoMarkerRow : 1;
  const searchHeaderEnd =
    historicoMarkerRow !== -1 ? Math.min(totalRows, historicoMarkerRow + 5) : totalRows;

  for (let r = searchHeaderStart; r <= searchHeaderEnd; r++) {
    const norms = stringMatrix[r].map((s) => normalizeForMatch(s));
    const hasData = norms.some((n) => n === "DATA");
    const hasDesc = norms.some((n) => n.startsWith("DESCRI"));
    const hasTotalOrPreco = norms.some(
      (n) => n === "TOTAL" || n.startsWith("PRECO") || n.startsWith("QUANT")
    );
    if ((hasData && hasDesc) || (hasDesc && hasTotalOrPreco)) {
      tableHeaderRow = r;
      break;
    }
  }

  const headerEndRow =
    historicoMarkerRow !== -1
      ? historicoMarkerRow - 1
      : tableHeaderRow !== -1
        ? tableHeaderRow - 1
        : Math.min(totalRows, 25);

  // 2. Parsear Cabeçalho (Matriz + eventual Filial em colunas à direita + Compradores)
  let razaoSocial = "";
  let tipoPessoa: "PJ" | "PF" = "PJ";
  let cpfCnpj: string | null = null;
  let inscricaoEstadual: string | null = null;
  let dataNascimento: string | null = null;
  let origemIndicacao: string | null = null;
  const observacoesParts: string[] = [];

  const matriz = createEmptyAddressBlock("Matriz", "FATURAMENTO");
  const filial = createEmptyAddressBlock("Filial", "FILIAL");
  let filialStartCol = 999; // atualizado se detectar "FILIAL" ou 2º bloco à direita

  // Detectar coluna de início de Filial (se houver)
  for (let r = 1; r <= headerEndRow; r++) {
    const rowStrings = stringMatrix[r];
    for (let c = 4; c < rowStrings.length; c++) {
      const norm = normalizeForMatch(rowStrings[c]);
      if (norm.startsWith("FILIAL") || (c >= 5 && (norm === "ENDERECO" || norm === "ENDERECO:" || norm === "CNPJ" || norm === "CNPJ:"))) {
        filialStartCol = Math.min(filialStartCol, c);
      }
    }
  }

  const compradoresList: ParsedComprador[] = [];
  const primaryBuyer: ParsedComprador = {
    nome: "",
    email: null,
    emailFinanceiro: null,
    telefone: null,
    departamento: null,
  };
  const extraEmails: { email: string; isFinanceiro: boolean; context: string }[] = [];
  const extraPhones: string[] = [];

  for (let r = 1; r <= headerEndRow; r++) {
    const rowStrings = stringMatrix[r];
    const rowRaw = rawMatrix[r];

    for (let c = 1; c < rowStrings.length; c++) {
      const rawText = rowStrings[c];
      if (!rawText) continue;

      // Coletar e-mails soltos em qualquer célula do cabeçalho
      const emailMatches = rawText.match(EMAIL_REGEX);
      if (emailMatches) {
        const leftContext = normalizeForMatch(
          `${rowStrings[c - 1] ?? ""} ${rawText}`
        );
        const isFinanceiro = leftContext.includes("FINANC");
        for (const em of emailMatches) {
          extraEmails.push({
            email: em.toLowerCase(),
            isFinanceiro,
            context: rawText,
          });
        }
      }

      const { labelNorm, inlineValue } = parseLabelInlineValue(rawText);
      const isFilialCol = c >= filialStartCol;
      const targetAddr = isFilialCol ? filial : matriz;

      const getValue = (): string => {
        if (inlineValue) return inlineValue;
        const next = findNextNonEmptyInRow(rowStrings, c, 2);
        if (!next) return "";
        if (isLabelCell(normalizeForMatch(next.value))) return "";
        return next.value;
      };

      if (
        !isFilialCol &&
        (labelNorm === "EMPRESA" ||
          labelNorm === "RAZAO SOCIAL" ||
          labelNorm === "CLIENTE")
      ) {
        const val = getValue();
        if (val && !razaoSocial) razaoSocial = val;
      } else if (labelNorm.startsWith("FILIAL")) {
        const val = getValue();
        if (val && val.length > 2) filial.rotulo = `Filial — ${val}`;
      } else if (labelNorm === "ENDERECO" || labelNorm === "END") {
        const val = getValue();
        if (val && !targetAddr.logradouro) targetAddr.logradouro = val;
      } else if (labelNorm === "BAIRRO") {
        const val = getValue();
        if (val && !targetAddr.bairro) targetAddr.bairro = val;
      } else if (labelNorm === "CIDADE") {
        const val = getValue();
        if (val && !targetAddr.cidade) targetAddr.cidade = val;
      } else if (labelNorm === "ESTADO" || labelNorm === "UF") {
        const val = getValue();
        if (val && !targetAddr.uf) targetAddr.uf = val.slice(0, 2).toUpperCase();
      } else if (labelNorm === "CEP") {
        const val = getValue();
        if (val && !targetAddr.cep) targetAddr.cep = val;
      } else if (labelNorm === "CNPJ" || labelNorm === "CNPJ/CPF" || labelNorm === "CPF/CNPJ" || labelNorm === "CPF") {
        const val = getValue();
        if (val) {
          const digits = onlyDigits(val);
          if (isFilialCol) {
            if (!filial.cnpj) filial.cnpj = digits || val;
          } else {
            if (!cpfCnpj) cpfCnpj = digits || val;
            if (labelNorm === "CPF" || digits.length === 11) {
              tipoPessoa = "PF";
            }
          }
        }
      } else if (
        labelNorm.startsWith("INSCR") ||
        labelNorm === "IE" ||
        labelNorm === "I E"
      ) {
        const val = getValue();
        if (val) {
          if (isFilialCol) {
            if (!filial.ie) filial.ie = val;
          } else if (!inscricaoEstadual) {
            inscricaoEstadual = val;
          }
        }
      } else if (
        labelNorm.startsWith("DATA NASC") ||
        labelNorm === "NASCIMENTO" ||
        labelNorm === "DT NASC"
      ) {
        const nextCell = inlineValue
          ? inlineValue
          : rowRaw[c + 1] ?? rowRaw[c + 2] ?? null;
        const iso = cellToDateIso(nextCell);
        if (iso) {
          dataNascimento = iso;
          tipoPessoa = "PF";
        }
      } else if (labelNorm === "COMPRADOR" || labelNorm === "CONTATO") {
        const val = getValue();
        if (val) {
          if (!primaryBuyer.nome) {
            primaryBuyer.nome = val;
          } else if (
            normalizeForMatch(primaryBuyer.nome) !== normalizeForMatch(val)
          ) {
            compradoresList.push({
              nome: val,
              email: null,
              emailFinanceiro: null,
              telefone: null,
              departamento: null,
            });
          }
        }
      } else if (labelNorm === "DEPTO" || labelNorm === "DEPARTAMENTO") {
        const val = getValue();
        if (val && !primaryBuyer.departamento) primaryBuyer.departamento = val;
      } else if (
        labelNorm === "FONE" ||
        labelNorm === "TELEFONE" ||
        labelNorm === "CELULAR" ||
        labelNorm === "WHATSAPP"
      ) {
        const val = getValue();
        if (val) {
          if (!primaryBuyer.telefone) primaryBuyer.telefone = val;
          else extraPhones.push(val);
        }
      } else if (
        labelNorm.startsWith("ORIGEM") ||
        labelNorm.startsWith("INDICAC")
      ) {
        const val = getValue();
        if (val && !origemIndicacao) origemIndicacao = val;
      } else if (labelNorm.startsWith("OBS")) {
        const val = getValue();
        if (val) observacoesParts.push(val);
      } else {
        const normFull = normalizeForMatch(rawText);
        if (
          normFull.includes("INDICAD") ||
          normFull.includes("AGENCIA INDICADA")
        ) {
          if (!origemIndicacao) origemIndicacao = rawText;
        } else if (
          c >= 4 &&
          !emailMatches &&
          PHONE_REGEX.test(rawText) &&
          rawText.length <= 28
        ) {
          extraPhones.push(rawText);
        }
        PHONE_REGEX.lastIndex = 0;
      }
    }
  }

  // Fallback para nome do cliente (usa nome da aba ou nome do arquivo)
  if (!razaoSocial) {
    const baseName = filePath
      .split(/[\\/]/)
      .pop()
      ?.replace(/\.xlsx$/i, "")
      .trim();
    razaoSocial =
      sheet.name && !/^plan(ilha)?\s*\d*$/i.test(sheet.name) && !/^sheet\d*$/i.test(sheet.name)
        ? sheet.name.trim()
        : baseName || "Cliente sem nome";
    avisos.push(
      `Campo EMPRESA não encontrado no cabeçalho; usado "${razaoSocial}" como nome do cliente.`
    );
  }

  // Montar endereços (Matriz e Filial)
  const enderecosParsed: ParsedEndereco[] = [];
  if (matriz.logradouro || matriz.cidade) {
    enderecosParsed.push({
      tipo: "FATURAMENTO",
      rotulo: matriz.rotulo,
      cnpjFilial: null,
      ieFilial: null,
      logradouro: matriz.logradouro || "Endereço não informado",
      bairro: matriz.bairro || null,
      cidade: matriz.cidade || "Não informada",
      uf: (matriz.uf || "SP").slice(0, 2).toUpperCase(),
      cep: matriz.cep ? onlyDigits(matriz.cep) || matriz.cep : null,
      principal: true,
    });
  }
  if (filial.logradouro || filial.cidade || filial.cnpj) {
    enderecosParsed.push({
      tipo: "FILIAL",
      rotulo: filial.rotulo,
      cnpjFilial: filial.cnpj ? onlyDigits(filial.cnpj) || filial.cnpj : null,
      ieFilial: filial.ie || null,
      logradouro: filial.logradouro || "Endereço da filial não informado",
      bairro: filial.bairro || null,
      cidade: filial.cidade || matriz.cidade || "Não informada",
      uf: (filial.uf || matriz.uf || "SP").slice(0, 2).toUpperCase(),
      cep: filial.cep ? onlyDigits(filial.cep) || filial.cep : null,
      principal: enderecosParsed.length === 0,
    });
  }

  // Consolidar e deduplicar compradores + e-mails espalhados
  const compradoresFinal: ParsedComprador[] = [];
  const emailsUsados = new Set<string>();

  if (primaryBuyer.nome) {
    compradoresFinal.push(primaryBuyer);
  }
  for (const extra of compradoresList) {
    if (
      !compradoresFinal.some(
        (b) => normalizeForMatch(b.nome) === normalizeForMatch(extra.nome)
      )
    ) {
      compradoresFinal.push(extra);
    }
  }

  for (const item of extraEmails) {
    if (emailsUsados.has(item.email)) continue;
    emailsUsados.add(item.email);

    if (item.isFinanceiro && compradoresFinal.length > 0 && !compradoresFinal[0].emailFinanceiro) {
      compradoresFinal[0].emailFinanceiro = item.email;
      continue;
    }

    const semEmail = compradoresFinal.find((b) => !b.email);
    if (semEmail) {
      semEmail.email = item.email;
    } else {
      // Extrai nome a partir do prefixo do e-mail ou texto da célula
      const prefixo = item.email.split("@")[0].replace(/[._-]+/g, " ");
      const nomeDerivado = prefixo
        .split(" ")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      compradoresFinal.push({
        nome: nomeDerivado || item.email,
        email: item.email,
        emailFinanceiro: null,
        telefone: extraPhones.shift() ?? null,
        departamento: null,
      });
    }
  }

  // 3. Parsear Tabela HISTORICO
  const pedidosParsed: ParsedPedidoHistorico[] = [];
  const interacoesParsed: ParsedInteracao[] = [];

  if (tableHeaderRow !== -1) {
    const headerRowStrings = stringMatrix[tableHeaderRow];
    const colMap = {
      data: -1,
      descricao: -1,
      pagto: -1,
      quant: -1,
      preco: -1,
      numPed: -1,
      total: -1,
      vendedor: -1,
    };

    const mappedCols = new Set<number>();

    for (let c = 1; c < headerRowStrings.length; c++) {
      const norm = normalizeForMatch(headerRowStrings[c]);
      if (!norm) continue;
      if (colMap.data === -1 && norm === "DATA") {
        colMap.data = c;
        mappedCols.add(c);
      } else if (colMap.descricao === -1 && norm.startsWith("DESCRI")) {
        colMap.descricao = c;
        mappedCols.add(c);
      } else if (
        colMap.pagto === -1 &&
        (norm.startsWith("PAGTO") || norm.startsWith("PAGAMENTO") || norm.startsWith("COND"))
      ) {
        colMap.pagto = c;
        mappedCols.add(c);
      } else if (colMap.quant === -1 && (norm.startsWith("QUANT") || norm === "QTD" || norm === "QTDE")) {
        colMap.quant = c;
        mappedCols.add(c);
      } else if (
        colMap.preco === -1 &&
        (norm.startsWith("PRECO") || norm.startsWith("UNIT") || norm.startsWith("VL. UNIT"))
      ) {
        colMap.preco = c;
        mappedCols.add(c);
      } else if (
        colMap.numPed === -1 &&
        (norm.includes("PED") || norm.startsWith("NO.") || norm.startsWith("N."))
      ) {
        colMap.numPed = c;
        mappedCols.add(c);
      } else if (colMap.total === -1 && norm === "TOTAL") {
        colMap.total = c;
        mappedCols.add(c);
      } else if (colMap.vendedor === -1 && norm.startsWith("VEND")) {
        colMap.vendedor = c;
        mappedCols.add(c);
      }
    }

    for (let r = tableHeaderRow + 1; r <= totalRows; r++) {
      const rowStrings = stringMatrix[r];
      const rowRaw = rawMatrix[r];
      const nonEmptyCount = rowStrings.slice(1).filter(Boolean).length;
      if (nonEmptyCount === 0) continue;

      const dataIso =
        colMap.data !== -1 ? cellToDateIso(rowRaw[colMap.data]) : null;
      const descricao =
        colMap.descricao !== -1 ? rowStrings[colMap.descricao] : "";
      const pagto = colMap.pagto !== -1 ? rowStrings[colMap.pagto] : "";
      const quantRaw = colMap.quant !== -1 ? cellToNumber(rowRaw[colMap.quant]) : null;
      const precoStr = colMap.preco !== -1 ? rowStrings[colMap.preco] : "";
      const precoNum = colMap.preco !== -1 ? cellToNumber(rowRaw[colMap.preco]) : null;
      const numPedStr = colMap.numPed !== -1 ? rowStrings[colMap.numPed] : "";
      const totalNum = colMap.total !== -1 ? cellToNumber(rowRaw[colMap.total]) : null;
      const vendedorStr =
        colMap.vendedor !== -1 ? rowStrings[colMap.vendedor] : "";

      // Ignorar linhas de rodapé de soma total (ex.: "TOTAL GERAL" sem descrição)
      const normDesc = normalizeForMatch(descricao);
      if (
        !descricao &&
        !numPedStr &&
        (normDesc === "" || normDesc.startsWith("TOTAL"))
      ) {
        continue;
      }

      // Coletar colunas extras sem título
      let compradorNome: string | null = null;
      let eventoFeira: string | null = null;
      let fornecedorNome: string | null = null;
      const ocorrenciasExtra: string[] = [];
      let isCancelado =
        normalizeForMatch(descricao).includes("CANCELADO") ||
        normalizeForMatch(numPedStr).includes("CANCELADO") ||
        normalizeForMatch(pagto).includes("CANCELADO");

      for (let c = 1; c < rowStrings.length; c++) {
        if (mappedCols.has(c)) continue;
        const extra = rowStrings[c];
        if (!extra) continue;
        const normExtra = normalizeForMatch(extra);

        if (normExtra.includes("CANCELADO")) {
          isCancelado = true;
          continue;
        }

        const compMatch = extra.match(/^comp\.?\s*(?:nome:?\s*)?(.+)$/i);
        if (compMatch && compMatch[1]) {
          compradorNome = compMatch[1].trim();
          continue;
        }

        const detectedFair = detectFair(extra);
        if (detectedFair) {
          eventoFeira = detectedFair;
          continue;
        }

        const detectedSup = detectSupplier(extra);
        if (detectedSup) {
          fornecedorNome = detectedSup;
          continue;
        }

        ocorrenciasExtra.push(extra);
      }

      // Também detectar feira/fornecedor se vieram misturados na descrição
      if (!eventoFeira && descricao) {
        eventoFeira = detectFair(descricao);
      }
      if (!fornecedorNome && descricao) {
        fornecedorNome = detectSupplier(descricao);
      }

      // Regra: linhas cuja DESCRIÇÃO seja apenas "ENVIADO E-MAIL" -> interacoes_cliente
      if (descricao && isOnlyEnviadoEmail(descricao)) {
        interacoesParsed.push({
          dataIso,
          tipo: "EMAIL",
          resumo:
            ocorrenciasExtra.length > 0
              ? `${descricao} — ${ocorrenciasExtra.join(" | ")}`
              : descricao,
          compradorNome,
          linhaOrigem: r,
        });
        continue;
      }

      // Detectar preço composto (ex.: "69,90/73,90")
      const isPrecoComposto =
        precoStr.includes("/") && /\d/.test(precoStr);

      const quantidade =
        quantRaw && quantRaw > 0 ? Math.round(quantRaw) : 1;

      let valorTotal = 0;
      let valorUnitario = 0;
      let descricaoFinal = descricao || "Item importado da planilha";

      if (isPrecoComposto) {
        valorTotal = roundMoney(Math.max(0, totalNum ?? 0));
        valorUnitario =
          quantidade > 0 ? roundMoney(valorTotal / quantidade) : valorTotal;
        descricaoFinal = `${descricaoFinal} [Preços compostos na planilha: ${precoStr}]`;
        avisos.push(
          `Linha ${r}: preço composto "${precoStr}" detectado. Total real (${valorTotal.toFixed(2)}) preservado para conferência manual.`
        );
      } else {
        valorUnitario = roundMoney(Math.max(0, precoNum ?? 0));
        if (totalNum !== null && totalNum >= 0) {
          valorTotal = roundMoney(totalNum);
          if (valorUnitario === 0 && valorTotal > 0 && quantidade > 0) {
            valorUnitario = roundMoney(valorTotal / quantidade);
          }
        } else {
          valorTotal = roundMoney(quantidade * valorUnitario);
        }
      }

      // Garantir que comprador citado na coluna extra também conste na lista de compradores
      if (
        compradorNome &&
        !compradoresFinal.some(
          (b) =>
            normalizeForMatch(b.nome) === normalizeForMatch(compradorNome!)
        )
      ) {
        compradoresFinal.push({
          nome: compradorNome,
          email: null,
          emailFinanceiro: null,
          telefone: null,
          departamento: null,
        });
      }

      pedidosParsed.push({
        linhaOrigem: r,
        dataIso,
        descricao: descricaoFinal,
        condicaoPagamento: pagto || null,
        quantidade,
        valorUnitario,
        valorTotal,
        precoCompostoBruto: isPrecoComposto ? precoStr : null,
        numeroPedido: numPedStr || null,
        vendedor: vendedorStr || "Flavio",
        status: isCancelado ? "CANCELADO" : "ENTREGUE",
        compradorNome,
        eventoFeira,
        fornecedorNome,
        ocorrencias:
          ocorrenciasExtra.length > 0 ? ocorrenciasExtra.join(" | ") : null,
      });
    }
  } else {
    avisos.push(
      `Tabela HISTORICO não localizada na aba "${sheet.name}". Apenas dados cadastrais foram extraídos.`
    );
  }

  return {
    arquivo: filePath,
    aba: sheet.name,
    cliente: {
      tipoPessoa,
      razaoSocial,
      cpfCnpj,
      inscricaoEstadual,
      dataNascimento,
      origemIndicacao,
      observacoes:
        observacoesParts.length > 0 ? observacoesParts.join("\n") : null,
    },
    enderecos: enderecosParsed,
    compradores: compradoresFinal,
    pedidos: pedidosParsed,
    interacoes: interacoesParsed,
    avisos,
  };
}
