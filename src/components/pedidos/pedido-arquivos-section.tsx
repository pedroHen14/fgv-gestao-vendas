"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  ExternalLink,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  Loader2,
  Paperclip,
  Printer,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import type { PedidoDetalhe } from "@/lib/services/pedidos";
import {
  TEMPLATE_PDF_LABELS,
  TIPO_ARQUIVO_LABELS,
  TIPO_ARQUIVO_ORDEM_UI,
  type TipoArquivoPedido,
} from "@/lib/constants";
import { formatDateTimeBR, formatFileSize } from "@/lib/formatters";
import { compressImageIfNeeded } from "@/lib/image-compression";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface PedidoArquivosSectionProps {
  pedido: PedidoDetalhe;
}

function isImageMime(mime: string | null | undefined): boolean {
  return Boolean(mime && mime.toLowerCase().startsWith("image/"));
}

function getArquivoIcon(mime: string | null | undefined, tipo: TipoArquivoPedido) {
  if (tipo === "MOCKUP" || isImageMime(mime)) {
    return FileImage;
  }
  if (
    mime?.includes("spreadsheet") ||
    mime?.includes("excel") ||
    mime?.includes("csv")
  ) {
    return FileSpreadsheet;
  }
  return FileText;
}

function getTipoBadgeVariant(tipo: TipoArquivoPedido) {
  switch (tipo) {
    case "MOCKUP":
      return "default" as const;
    case "PEDIDO_PDF":
      return "secondary" as const;
    case "NOTA_FISCAL":
      return "success" as const;
    case "COMPROVANTE":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

export function PedidoArquivosSection({ pedido }: PedidoArquivosSectionProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [tipoUpload, setTipoUpload] = useState<TipoArquivoPedido>(
    pedido.fornecedor?.templatePdf === "BONES_MOCKUP" ? "MOCKUP" : "ORDEM_COMPRA"
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string | null>(null);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [deletingArquivoId, setDeletingArquivoId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const templatePdf = pedido.fornecedor?.templatePdf ?? "PADRAO";
  const mockupsCount = pedido.arquivos.filter((a) => a.tipo === "MOCKUP").length;

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsUploading(true);
    let enviados = 0;
    let otimizados = 0;

    try {
      for (let idx = 0; idx < files.length; idx++) {
        const originalFile = files[idx];
        setUploadStatusText(
          `Preparando ${idx + 1} de ${files.length}: ${originalFile.name}...`
        );

        const { file: fileToSend, compressed } = await compressImageIfNeeded(
          originalFile,
          { maxWidth: 1600, quality: 0.82 }
        );
        if (compressed) {
          otimizados++;
        }

        setUploadStatusText(
          `Enviando ${idx + 1} de ${files.length}: ${fileToSend.name}...`
        );

        const formData = new FormData();
        formData.append("file", fileToSend);
        formData.append("tipo", tipoUpload);

        const response = await fetch(`/api/pedidos/${pedido.id}/arquivos`, {
          method: "POST",
          body: formData,
        });

        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };

        if (!response.ok) {
          toast.error(
            data.error || `Não foi possível enviar "${originalFile.name}".`
          );
          continue;
        }

        enviados++;
      }

      if (enviados > 0) {
        const msgBase =
          enviados === 1
            ? "Arquivo adicionado à pasta do pedido!"
            : `${enviados} arquivos adicionados à pasta do pedido!`;
        toast.success(
          otimizados > 0
            ? `${msgBase} (${otimizados} imagem otimizada para economizar espaço.)`
            : msgBase
        );
        router.refresh();
      }
    } catch {
      toast.error("Erro de conexão ao enviar os arquivos. Tente novamente.");
    } finally {
      setIsUploading(false);
      setUploadStatusText(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSavePdfNaPasta = async () => {
    setIsSavingPdf(true);
    try {
      const response = await fetch(`/api/pedidos/${pedido.id}/pdf`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        toast.error(data.error || "Não foi possível salvar o PDF na pasta.");
        return;
      }
      toast.success("PDF do pedido salvo na pasta com sucesso!");
      router.refresh();
    } catch {
      toast.error("Erro ao salvar o PDF na pasta. Tente novamente.");
    } finally {
      setIsSavingPdf(false);
    }
  };

  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      const response = await fetch(`/api/pedidos/${pedido.id}/zip`);
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(
          data.error || "Não foi possível montar a pasta completa (.zip)."
        );
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || "pasta-pedido.zip";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success("Pasta completa (.zip) baixada no seu computador!");
    } catch {
      toast.error("Erro ao baixar a pasta completa. Tente novamente.");
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingArquivoId) return;
    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/pedidos/${pedido.id}/arquivos/${deletingArquivoId}`,
        { method: "DELETE" }
      );
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        toast.error(data.error || "Não foi possível remover o arquivo.");
        return;
      }
      toast.success("Arquivo removido da pasta do pedido.");
      setDeletingArquivoId(null);
      router.refresh();
    } catch {
      toast.error("Erro ao remover o arquivo.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleUploadFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bloco 1: Folha de Pedido em PDF */}
      <Card className="border-primary/25 bg-primary/[0.02]">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <FileText className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  Folha de Pedido em PDF
                </CardTitle>
                <CardDescription>
                  Layout selecionado:{" "}
                  <strong className="text-foreground">
                    {TEMPLATE_PDF_LABELS[templatePdf]}
                  </strong>
                  {templatePdf === "BONES_MOCKUP" && mockupsCount === 0
                    ? " — dica: envie uma imagem na categoria Arte / Mockup abaixo para ela aparecer em destaque no PDF."
                    : mockupsCount > 0
                      ? ` — ${mockupsCount} imagem${mockupsCount === 1 ? "" : "ns"} de mockup pronta${mockupsCount === 1 ? "" : "s"} para sair no PDF.`
                      : "."}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2.5">
            <Button asChild size="lg" className="font-semibold">
              <a
                href={`/api/pedidos/${pedido.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Printer className="size-4" />
                Gerar / Visualizar PDF
              </a>
            </Button>

            <Button asChild size="lg" variant="outline" className="font-semibold">
              <a href={`/api/pedidos/${pedido.id}/pdf?download=1`}>
                <Download className="size-4" />
                Baixar PDF
              </a>
            </Button>

            <Button
              type="button"
              size="lg"
              variant="secondary"
              disabled={isSavingPdf}
              onClick={handleSavePdfNaPasta}
              className="font-semibold"
            >
              {isSavingPdf ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isSavingPdf ? "Salvando na pasta..." : "Salvar PDF na Pasta"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bloco 2: Pasta Virtual do Pedido + Upload + Baixar .zip */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <FolderArchive className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  Pasta do Pedido ({pedido.arquivos.length}{" "}
                  {pedido.arquivos.length === 1 ? "arquivo" : "arquivos"})
                </CardTitle>
                <CardDescription>
                  Guarde aqui mockup, ordem de compra, nota fiscal e
                  comprovantes. O botão ao lado baixa tudo organizado em um
                  único arquivo <strong>.zip</strong> junto com o PDF atualizado.
                </CardDescription>
              </div>
            </div>

            <Button
              type="button"
              size="lg"
              disabled={isDownloadingZip}
              onClick={handleDownloadZip}
              className="shrink-0 font-semibold"
            >
              {isDownloadingZip ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileArchive className="size-4" />
              )}
              {isDownloadingZip
                ? "Montando pasta (.zip)..."
                : "Baixar Pasta Completa (.zip)"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Área de Upload com Drag-and-Drop */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[240px_1fr] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="tipo-arquivo-upload">Tipo do arquivo</Label>
                <Select
                  id="tipo-arquivo-upload"
                  value={tipoUpload}
                  onChange={(e) =>
                    setTipoUpload(e.target.value as TipoArquivoPedido)
                  }
                  disabled={isUploading}
                >
                  {TIPO_ARQUIVO_ORDEM_UI.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {TIPO_ARQUIVO_LABELS[tipo]}
                    </option>
                  ))}
                </Select>
              </div>

              <p className="text-xs text-muted-foreground sm:pb-2">
                Imagens de mockup são otimizadas automaticamente antes do envio
                para economizar espaço e garantir impressão nítida no PDF.
              </p>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              onClick={() => {
                if (!isUploading) fileInputRef.current?.click();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && !isUploading) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-7 text-center transition-colors cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/50 hover:bg-primary/[0.03]"
              } ${isUploading ? "pointer-events-none opacity-70" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,application/pdf,.xlsx,.xls,.docx,.doc,.txt,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    void handleUploadFiles(e.target.files);
                  }
                }}
              />

              {isUploading ? (
                <>
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-sm font-semibold text-foreground">
                    {uploadStatusText || "Enviando arquivo..."}
                  </p>
                </>
              ) : (
                <>
                  <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
                    <Upload className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Arraste arquivos para cá ou clique para escolher
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Será salvo como{" "}
                      <strong className="text-foreground">
                        {TIPO_ARQUIVO_LABELS[tipoUpload]}
                      </strong>{" "}
                      • Aceita JPG, PNG, PDF, Excel e Word (até 20 MB)
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Lista de Arquivos da Pasta */}
          {pedido.arquivos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8 px-4 text-center">
              <Paperclip className="size-8 text-muted-foreground/60" />
              <p className="mt-2 text-sm font-medium text-foreground">
                Nenhum arquivo anexado ainda
              </p>
              <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
                Envie a arte/mockup, a ordem de compra do cliente ou a nota
                fiscal da fábrica para manter tudo centralizado.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {pedido.arquivos.map((arq) => {
                const Icon = getArquivoIcon(arq.mimeType, arq.tipo);
                const ehImagem = isImageMime(arq.mimeType);
                const viewUrl = `/api/pedidos/${pedido.id}/arquivos/${arq.id}`;
                const downloadUrl = `${viewUrl}?download=1`;

                return (
                  <div
                    key={arq.id}
                    className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-primary/30"
                  >
                    {ehImagem ? (
                      <a
                        href={viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative block size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                        title="Clique para ampliar a imagem"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={viewUrl}
                          alt={arq.nomeOriginal}
                          className="size-full object-cover"
                        />
                      </a>
                    ) : (
                      <div className="bg-muted text-primary flex size-12 shrink-0 items-center justify-center rounded-lg">
                        <Icon className="size-5" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant={getTipoBadgeVariant(arq.tipo)}
                          className="text-[11px]"
                        >
                          {TIPO_ARQUIVO_LABELS[arq.tipo]}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {formatFileSize(arq.tamanhoBytes)}
                        </span>
                      </div>

                      <p
                        className="truncate text-sm font-semibold text-foreground"
                        title={arq.nomeOriginal}
                      >
                        {arq.nomeOriginal}
                      </p>

                      <p className="text-[11px] text-muted-foreground">
                        Enviado em {formatDateTimeBR(arq.createdAt)}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <Button asChild size="sm" variant="outline" className="h-7 px-2.5 text-xs">
                          <a
                            href={viewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="size-3" />
                            Abrir
                          </a>
                        </Button>
                        <Button asChild size="sm" variant="ghost" className="h-7 px-2.5 text-xs">
                          <a href={downloadUrl}>
                            <Download className="size-3" />
                            Baixar
                          </a>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeletingArquivoId(arq.id)}
                        >
                          <Trash2 className="size-3" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={Boolean(deletingArquivoId)}
        onOpenChange={(open) => {
          if (!open) setDeletingArquivoId(null);
        }}
        title="Remover arquivo da pasta?"
        description="Este arquivo será excluído permanentemente da pasta do pedido."
        confirmLabel="Sim, remover"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
