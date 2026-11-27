import { deflateSync } from "node:zlib";

// ==========================================
// GERADOR LEVE DE PNG (SEM DEPENDÊNCIAS EXTERNAS)
// Produz mockups técnicos válidos em PNG compatíveis com @react-pdf/renderer
// ==========================================

type RGB = [number, number, number];

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const typeBytes = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcInput = Buffer.concat([typeBytes, Buffer.from(data)]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([lenBuf, typeBytes, Buffer.from(data), crcBuf]);
}

function encodePngRgb(width: number, height: number, pixels: Uint8Array): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    raw[rowStart] = 0; // filter type None
    raw.set(pixels.subarray(y * stride, (y + 1) * stride), rowStart + 1);
  }

  const compressed = deflateSync(raw, { level: 6 });

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", new Uint8Array(0)),
  ]);
}

class Canvas {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;

  constructor(width: number, height: number, bg: RGB) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 3);
    this.fillRect(0, 0, width, height, bg);
  }

  setPixel(x: number, y: number, color: RGB) {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || yi < 0 || xi >= this.width || yi >= this.height) return;
    const idx = (yi * this.width + xi) * 3;
    this.data[idx] = color[0];
    this.data[idx + 1] = color[1];
    this.data[idx + 2] = color[2];
  }

  fillRect(x: number, y: number, w: number, h: number, color: RGB) {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + w));
    const y1 = Math.min(this.height, Math.ceil(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const idx = (py * this.width + px) * 3;
        this.data[idx] = color[0];
        this.data[idx + 1] = color[1];
        this.data[idx + 2] = color[2];
      }
    }
  }

  strokeRect(x: number, y: number, w: number, h: number, thickness: number, color: RGB) {
    this.fillRect(x, y, w, thickness, color);
    this.fillRect(x, y + h - thickness, w, thickness, color);
    this.fillRect(x, y, thickness, h, color);
    this.fillRect(x + w - thickness, y, thickness, h, color);
  }

  fillCircle(cx: number, cy: number, r: number, color: RGB) {
    const r2 = r * r;
    const x0 = Math.max(0, Math.floor(cx - r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + r));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + r));
    for (let py = y0; py <= y1; py++) {
      const dy = py - cy;
      for (let px = x0; px <= x1; px++) {
        const dx = px - cx;
        if (dx * dx + dy * dy <= r2) {
          this.setPixel(px, py, color);
        }
      }
    }
  }

  fillEllipse(cx: number, cy: number, rx: number, ry: number, color: RGB) {
    const x0 = Math.max(0, Math.floor(cx - rx));
    const y0 = Math.max(0, Math.floor(cy - ry));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + rx));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + ry));
    for (let py = y0; py <= y1; py++) {
      const ny = (py - cy) / ry;
      for (let px = x0; px <= x1; px++) {
        const nx = (px - cx) / rx;
        if (nx * nx + ny * ny <= 1) {
          this.setPixel(px, py, color);
        }
      }
    }
  }

  toPng(): Buffer {
    return encodePngRgb(this.width, this.height, this.data);
  }
}

// Fonte bitmap 5x7 minimalista para rótulos técnicos nos mockups
const FONT_5X7: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10011", "10101", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["01110", "10000", "11110", "10001", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ":": ["00000", "00100", "00100", "00000", "00100", "00100", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

function drawText(
  canvas: Canvas,
  rawText: string,
  x: number,
  y: number,
  scale: number,
  color: RGB
) {
  const normalized = rawText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  let cursorX = x;
  for (const ch of normalized) {
    const glyph = FONT_5X7[ch] ?? FONT_5X7[" "];
    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col] === "1") {
          canvas.fillRect(
            cursorX + col * scale,
            y + row * scale,
            scale,
            scale,
            color
          );
        }
      }
    }
    cursorX += 6 * scale;
  }
}

export function generateMockupPng(options: {
  variant: "BONE" | "POLO" | "KIT";
  titulo: string;
  subtitulo: string;
  corPrincipal: RGB;
  corDetalhe: RGB;
}): Buffer {
  const W = 760;
  const H = 420;
  const WHITE: RGB = [255, 255, 255];
  const BG: RGB = [248, 250, 252];
  const BORDER: RGB = [203, 213, 225];
  const SLATE: RGB = [51, 65, 85];
  const MUTED: RGB = [100, 116, 139];

  const c = new Canvas(W, H, BG);

  // Moldura e faixa superior
  c.strokeRect(0, 0, W, H, 3, BORDER);
  c.fillRect(0, 0, W, 56, options.corPrincipal);
  drawText(c, "FGV REPRESENTACOES - ARTE TECNICA", 22, 16, 3, WHITE);

  // Área do produto à esquerda
  c.fillRect(24, 78, 390, 280, WHITE);
  c.strokeRect(24, 78, 390, 280, 2, BORDER);

  if (options.variant === "BONE") {
    // Ilustração estilizada de boné trucker
    c.fillEllipse(218, 205, 112, 84, options.corPrincipal);
    c.fillRect(106, 205, 224, 34, options.corPrincipal);
    // Tela frontal clara
    c.fillEllipse(218, 198, 72, 54, [241, 245, 249]);
    // Aba curva
    c.fillEllipse(225, 252, 138, 28, options.corDetalhe);
    c.fillEllipse(218, 244, 115, 18, options.corPrincipal);
    // Botão no topo
    c.fillCircle(218, 120, 9, options.corDetalhe);
    // Selo bordado central
    c.fillRect(172, 174, 92, 42, options.corPrincipal);
    c.strokeRect(172, 174, 92, 42, 3, options.corDetalhe);
    drawText(c, "AGRO", 184, 186, 3, WHITE);
  } else if (options.variant === "POLO") {
    // Ilustração estilizada de camisa polo corporativa
    // Mangas
    c.fillRect(92, 132, 74, 76, options.corPrincipal);
    c.fillRect(272, 132, 74, 76, options.corPrincipal);
    // Punhos detalhe
    c.fillRect(92, 198, 74, 10, options.corDetalhe);
    c.fillRect(272, 198, 74, 10, options.corDetalhe);
    // Tronco
    c.fillRect(148, 126, 142, 202, options.corPrincipal);
    // Gola e peitilho
    c.fillRect(184, 118, 70, 24, options.corDetalhe);
    c.fillRect(212, 142, 14, 52, WHITE);
    c.fillCircle(219, 156, 3, options.corPrincipal);
    c.fillCircle(219, 174, 3, options.corPrincipal);
    // Bordado no peito esquerdo
    c.fillRect(236, 166, 36, 24, WHITE);
    c.strokeRect(236, 166, 36, 24, 2, options.corDetalhe);
    drawText(c, "FGV", 242, 173, 1.5, options.corPrincipal);
  } else {
    // Ilustração estilizada de kit brinde (garrafa térmica + guarda-chuva/caixa)
    // Garrafa térmica
    c.fillRect(134, 152, 68, 168, options.corPrincipal);
    c.fillRect(146, 134, 44, 20, options.corDetalhe);
    c.fillRect(134, 212, 68, 42, WHITE);
    drawText(c, "FGV", 144, 224, 2, options.corPrincipal);
    // Caixa / caderno corporativo
    c.fillRect(228, 172, 120, 148, options.corDetalhe);
    c.strokeRect(228, 172, 120, 148, 3, options.corPrincipal);
    c.fillRect(246, 216, 84, 40, WHITE);
    drawText(c, "KIT", 264, 227, 3, options.corPrincipal);
  }

  // Cartão de especificações à direita
  c.fillRect(434, 78, 302, 280, WHITE);
  c.strokeRect(434, 78, 302, 280, 2, BORDER);
  c.fillRect(434, 78, 302, 34, [236, 243, 239]);
  drawText(c, "ESPECIFICACAO DA ARTE", 448, 88, 2, options.corPrincipal);

  drawText(c, options.titulo.slice(0, 22), 448, 132, 2, SLATE);
  drawText(c, options.subtitulo.slice(0, 24), 448, 166, 2, MUTED);

  // Swatches de cores
  drawText(c, "PALETA APROVADA:", 448, 214, 2, SLATE);
  c.fillRect(448, 240, 44, 30, options.corPrincipal);
  c.strokeRect(448, 240, 44, 30, 1, SLATE);
  c.fillRect(504, 240, 44, 30, options.corDetalhe);
  c.strokeRect(504, 240, 44, 30, 1, SLATE);
  c.fillRect(560, 240, 44, 30, WHITE);
  c.strokeRect(560, 240, 44, 30, 1, SLATE);

  drawText(c, "STATUS: APROVADO", 448, 298, 2, options.corPrincipal);
  drawText(c, "USO: PRODUCAO FABRICA", 448, 326, 2, MUTED);

  // Rodapé
  drawText(c, "MOCKUP DE EXEMPLO PARA TESTES - FGV GESTAO DE VENDAS", 24, 380, 2, MUTED);

  return c.toPng();
}

// ==========================================
// GERADOR LEVE DE PDF 1.4 VÁLIDO (ANEXOS DE TESTE)
// Produz arquivos reais para Ordem de Compra, NF e Comprovante
// ==========================================

function escapePdfText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function generateSimplePdf(titulo: string, linhas: string[]): Buffer {
  const ops: string[] = [
    "BT",
    "/F1 15 Tf",
    "50 770 Td",
    `(${escapePdfText(titulo)}) Tj`,
    "/F1 10 Tf",
    "0 -26 Td",
  ];

  for (const linha of linhas) {
    ops.push(`(${escapePdfText(linha)}) Tj`);
    ops.push("0 -16 Td");
  }

  ops.push("ET");
  const stream = ops.join("\n");

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}
