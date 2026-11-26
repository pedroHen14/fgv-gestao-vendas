import React from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { PedidoDetalhe } from "@/lib/services/pedidos";
import { downloadBufferFromStorage } from "@/lib/storage";
import type { PdfImageAsset } from "@/components/pdf/pdf-types";
import { TemplateBonesMockup } from "@/components/pdf/template-bones-mockup";
import { TemplateConfeccao } from "@/components/pdf/template-confeccao";
import { TemplatePadrao } from "@/components/pdf/template-padrao";

function detectPdfSupportedImageMime(
  buffer: Buffer,
  fallbackMime?: string | null
): "image/jpeg" | "image/png" | null {
  // Verifica magic bytes primeiro (mais seguro que confiar apenas no content-type)
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  const normalized = fallbackMime?.toLowerCase();
  if (normalized === "image/jpeg" || normalized === "image/jpg") {
    return "image/jpeg";
  }
  if (normalized === "image/png") {
    return "image/png";
  }

  return null;
}

/**
 * Busca imagens de mockup no bucket privado do Supabase Storage como Buffer
 * e converte para Data URI compatível com @react-pdf/renderer (JPEG/PNG).
 */
async function loadMockupImagesForPdf(
  pedido: PedidoDetalhe
): Promise<PdfImageAsset[]> {
  const candidates: Array<{ path: string; mime?: string | null; label?: string }> =
    [];
  const seen = new Set<string>();

  for (const item of pedido.itens) {
    if (item.mockupStoragePath && !seen.has(item.mockupStoragePath)) {
      seen.add(item.mockupStoragePath);
      candidates.push({
        path: item.mockupStoragePath,
        label: item.descricaoTecnica,
      });
    }
  }

  for (const arq of pedido.arquivos) {
    if (arq.tipo === "MOCKUP" && !seen.has(arq.storagePath)) {
      seen.add(arq.storagePath);
      candidates.push({
        path: arq.storagePath,
        mime: arq.mimeType,
        label: arq.nomeOriginal,
      });
    }
  }

  if (candidates.length === 0) {
    return [];
  }

  const settled = await Promise.allSettled(
    candidates.slice(0, 4).map(async (item) => {
      const { buffer, contentType } = await downloadBufferFromStorage(item.path);
      const mime = detectPdfSupportedImageMime(
        buffer,
        item.mime || contentType
      );
      if (!mime) return null;

      return {
        dataUri: `data:${mime};base64,${buffer.toString("base64")}`,
        label: item.label,
      } satisfies PdfImageAsset;
    })
  );

  const images: PdfImageAsset[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled" && result.value) {
      images.push(result.value);
    }
  }

  return images;
}

/**
 * Seleciona automaticamente o template do fabricante e gera o Buffer do PDF.
 */
export async function renderPedidoPdf(pedido: PedidoDetalhe): Promise<Buffer> {
  const mockups = await loadMockupImagesForPdf(pedido);
  const template = pedido.fornecedor?.templatePdf ?? "PADRAO";

  let docElement: React.ReactElement<DocumentProps>;
  switch (template) {
    case "BONES_MOCKUP":
      docElement = React.createElement(TemplateBonesMockup, {
        pedido,
        mockups,
      }) as React.ReactElement<DocumentProps>;
      break;
    case "CONFECCAO_GRADE":
      docElement = React.createElement(TemplateConfeccao, {
        pedido,
        mockups,
      }) as React.ReactElement<DocumentProps>;
      break;
    default:
      docElement = React.createElement(TemplatePadrao, {
        pedido,
        mockups,
      }) as React.ReactElement<DocumentProps>;
      break;
  }

  return renderToBuffer(docElement);
}
