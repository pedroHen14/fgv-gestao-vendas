"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Factory,
  GripVertical,
  MoreHorizontal,
  Truck,
} from "lucide-react";
import type { PedidoListaItem } from "@/lib/services/pedidos";
import {
  STATUS_FLUXO_PRINCIPAL,
  STATUS_PEDIDO_META,
  isStatusOrcamento,
  type StatusPedido,
} from "@/lib/constants";
import {
  addDaysToIsoDate,
  diffIsoDays,
  formatCurrencyBRL,
  formatDateBR,
  formatPrazoRelativo,
  toSaoPauloIsoDate,
} from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type ColunaKanbanKey =
  | "ORCAMENTOS"
  | "APROVADO"
  | "EM_PRODUCAO"
  | "EM_TRANSITO"
  | "ENTREGUE";

interface ColunaKanbanDef {
  key: ColunaKanbanKey;
  titulo: string;
  targetStatus: StatusPedido;
  dotClass: string;
  headerBgClass: string;
  matches: (status: StatusPedido) => boolean;
}

const COLUNAS_KANBAN: ColunaKanbanDef[] = [
  {
    key: "ORCAMENTOS",
    titulo: "Orçamentos",
    targetStatus: "ORCAMENTO_ENVIADO",
    dotClass: "bg-amber-500",
    headerBgClass: "bg-amber-50/70 border-amber-200/70",
    matches: (status) => isStatusOrcamento(status),
  },
  {
    key: "APROVADO",
    titulo: "Aprovado",
    targetStatus: "APROVADO",
    dotClass: "bg-primary",
    headerBgClass: "bg-primary/[0.06] border-primary/20",
    matches: (status) => status === "APROVADO",
  },
  {
    key: "EM_PRODUCAO",
    titulo: "Em Produção",
    targetStatus: "EM_PRODUCAO",
    dotClass: "bg-orange-500",
    headerBgClass: "bg-orange-50/70 border-orange-200/70",
    matches: (status) => status === "EM_PRODUCAO",
  },
  {
    key: "EM_TRANSITO",
    titulo: "Em Trânsito",
    targetStatus: "EM_TRANSITO",
    dotClass: "bg-sky-600",
    headerBgClass: "bg-sky-50/70 border-sky-200/70",
    matches: (status) => status === "EM_TRANSITO",
  },
  {
    key: "ENTREGUE",
    titulo: "Entregue",
    targetStatus: "ENTREGUE",
    dotClass: "bg-emerald-600",
    headerBgClass: "bg-emerald-50/70 border-emerald-200/70",
    matches: (status) => status === "ENTREGUE",
  },
];

interface PedidosKanbanProps {
  pedidos: PedidoListaItem[];
  hojeIso: string;
  updatingId: string | null;
  onChangeStatus: (pedido: PedidoListaItem, nextStatus: StatusPedido) => void;
  onConverterOrcamento: (pedido: PedidoListaItem) => void;
}

function getNextStepButton(pedido: PedidoListaItem): {
  label: string;
  nextStatus: StatusPedido;
} | null {
  if (isStatusOrcamento(pedido.status)) {
    return { label: "Aprovar", nextStatus: "APROVADO" };
  }
  if (pedido.status === "APROVADO") {
    return { label: "Produção", nextStatus: "EM_PRODUCAO" };
  }
  if (pedido.status === "EM_PRODUCAO") {
    return { label: "Trânsito", nextStatus: "EM_TRANSITO" };
  }
  if (pedido.status === "EM_TRANSITO") {
    return { label: "Entregue", nextStatus: "ENTREGUE" };
  }
  return null;
}

function getPrazoChip(
  pedido: PedidoListaItem,
  hojeIso: string
): {
  texto: string;
  tone: "danger" | "warning" | "neutral" | "success";
  icon: "bell" | "clock" | "truck";
} | null {
  if (isStatusOrcamento(pedido.status) && pedido.proximoFollowup) {
    const prazo = formatPrazoRelativo(pedido.proximoFollowup, hojeIso);
    return {
      texto: `Retorno: ${formatDateBR(pedido.proximoFollowup)} (${prazo.texto})`,
      tone:
        prazo.urgencia === "atrasado"
          ? "danger"
          : prazo.urgencia === "hoje"
            ? "warning"
            : "neutral",
      icon: "bell",
    };
  }

  if (pedido.status === "EM_PRODUCAO") {
    const dataPrevista =
      pedido.dataSaidaFabrica ??
      (pedido.dataPedido && pedido.prazoEntregaDias
        ? addDaysToIsoDate(pedido.dataPedido, pedido.prazoEntregaDias)
        : null);

    if (dataPrevista) {
      const prazo = formatPrazoRelativo(dataPrevista, hojeIso);
      return {
        texto: `Saída: ${formatDateBR(dataPrevista)} (${prazo.texto})`,
        tone:
          prazo.urgencia === "atrasado"
            ? "danger"
            : prazo.urgencia === "hoje" || prazo.urgencia === "proximo"
              ? "warning"
              : "neutral",
        icon: "clock",
      };
    }
  }

  if (pedido.status === "EM_TRANSITO") {
    const baseIso =
      pedido.dataSaidaFabrica && pedido.dataSaidaFabrica <= hojeIso
        ? pedido.dataSaidaFabrica
        : toSaoPauloIsoDate(pedido.updatedAt);
    const dias = Math.max(0, diffIsoDays(baseIso, hojeIso));
    return {
      texto:
        dias === 0
          ? "Saiu hoje"
          : dias === 1
            ? "Em trânsito há 1 dia"
            : `Em trânsito há ${dias} dias`,
      tone: dias > 5 ? "danger" : "neutral",
      icon: "truck",
    };
  }

  if (pedido.status === "ENTREGUE" && pedido.dataEntregaCliente) {
    return {
      texto: `Entregue em ${formatDateBR(pedido.dataEntregaCliente)}`,
      tone: "success",
      icon: "clock",
    };
  }

  return null;
}

export function PedidosKanban({
  pedidos,
  hojeIso,
  updatingId,
  onChangeStatus,
  onConverterOrcamento,
}: PedidosKanbanProps) {
  const [draggedPedidoId, setDraggedPedidoId] = useState<string | null>(null);
  const [dragOverColuna, setDragOverColuna] = useState<ColunaKanbanKey | null>(
    null
  );
  const [mostrarEncerrados, setMostrarEncerrados] = useState(false);

  const encerrados = pedidos.filter(
    (p) => p.status === "CANCELADO" || p.status === "PERDIDO"
  );

  const handleDropOnColumn = (coluna: ColunaKanbanDef) => {
    setDragOverColuna(null);
    if (!draggedPedidoId) return;
    const pedido = pedidos.find((p) => p.id === draggedPedidoId);
    setDraggedPedidoId(null);
    if (!pedido) return;
    if (coluna.matches(pedido.status)) return;

    if (isStatusOrcamento(pedido.status) && coluna.targetStatus === "APROVADO") {
      onConverterOrcamento(pedido);
      return;
    }

    onChangeStatus(pedido, coluna.targetStatus);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Dica: arraste um cartão para outra coluna ou use os botões rápidos no
        rodapé do cartão para avançar a etapa.
      </p>

      <div className="-mx-4 overflow-x-auto px-4 pb-3 lg:mx-0 lg:px-0">
        <div className="grid min-w-[1100px] grid-cols-5 gap-3.5">
          {COLUNAS_KANBAN.map((coluna) => {
            const itensColuna = pedidos.filter((p) => coluna.matches(p.status));
            const somaColuna = itensColuna.reduce(
              (acc, p) => acc + (Number(p.valorTotal) || 0),
              0
            );
            const isDropTarget = dragOverColuna === coluna.key;

            return (
              <div
                key={coluna.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverColuna !== coluna.key) {
                    setDragOverColuna(coluna.key);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setDragOverColuna(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnColumn(coluna);
                }}
                className={cn(
                  "flex min-h-[420px] flex-col rounded-2xl border border-border bg-muted/40 transition-colors",
                  isDropTarget && "border-primary bg-primary/[0.05] ring-2 ring-primary/25"
                )}
              >
                {/* Cabeçalho da Coluna */}
                <div
                  className={cn(
                    "rounded-t-2xl border-b px-3.5 py-3",
                    coluna.headerBgClass
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          "size-2.5 shrink-0 rounded-full",
                          coluna.dotClass
                        )}
                      />
                      <h3 className="truncate text-sm font-bold text-foreground">
                        {coluna.titulo}
                      </h3>
                    </div>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-card px-1.5 text-xs font-bold text-foreground shadow-2xs tabular-nums">
                      {itensColuna.length}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-medium text-muted-foreground tabular-nums">
                    {formatCurrencyBRL(somaColuna)}
                  </p>
                </div>

                {/* Lista de Cartões */}
                <div className="flex flex-1 flex-col gap-2.5 p-2.5">
                  {itensColuna.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/80 px-3 py-8 text-center text-xs text-muted-foreground">
                      Nenhum registro nesta etapa
                    </div>
                  ) : (
                    itensColuna.map((pedido) => {
                      const meta = STATUS_PEDIDO_META[pedido.status];
                      const ehOrcamento = isStatusOrcamento(pedido.status);
                      const nextStep = getNextStepButton(pedido);
                      const prazoChip = getPrazoChip(pedido, hojeIso);
                      const primeiroItem = pedido.itens[0]?.descricaoTecnica;
                      const isUpdating = updatingId === pedido.id;
                      const isDragging = draggedPedidoId === pedido.id;

                      return (
                        <article
                          key={pedido.id}
                          draggable={!isUpdating}
                          onDragStart={(e) => {
                            setDraggedPedidoId(pedido.id);
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("text/plain", pedido.id);
                          }}
                          onDragEnd={() => {
                            setDraggedPedidoId(null);
                            setDragOverColuna(null);
                          }}
                          className={cn(
                            "group flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3 shadow-2xs transition-all hover:border-primary/40 hover:shadow-sm",
                            isDragging && "opacity-50 ring-2 ring-primary/30",
                            isUpdating && "pointer-events-none opacity-60"
                          )}
                        >
                          {/* Topo: Número, Sub-etapa e Menu */}
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <GripVertical
                                className="size-3.5 shrink-0 cursor-grab text-muted-foreground/50 group-hover:text-muted-foreground"
                                aria-hidden="true"
                              />
                              <Link
                                href={`/pedidos/${pedido.id}`}
                                className="truncate text-sm font-bold text-foreground hover:text-primary hover:underline"
                              >
                                {pedido.numeroPedido
                                  ? `Pedido ${pedido.numeroPedido}`
                                  : "Orçamento"}
                              </Link>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-6 shrink-0 text-muted-foreground"
                                  aria-label="Ações rápidas do pedido"
                                >
                                  <MoreHorizontal className="size-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem asChild>
                                  <Link href={`/pedidos/${pedido.id}`}>
                                    <ExternalLink className="size-3.5" />
                                    Abrir detalhes
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                  Mover etapa para:
                                </DropdownMenuLabel>
                                {STATUS_FLUXO_PRINCIPAL.map((st) => (
                                  <DropdownMenuItem
                                    key={st}
                                    disabled={st === pedido.status}
                                    onClick={() => onChangeStatus(pedido, st)}
                                  >
                                    {STATUS_PEDIDO_META[st].label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    onChangeStatus(
                                      pedido,
                                      ehOrcamento ? "PERDIDO" : "CANCELADO"
                                    )
                                  }
                                >
                                  {ehOrcamento
                                    ? "Marcar como Perdido"
                                    : "Cancelar Pedido"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Badges de sub-etapa e feira */}
                          {(ehOrcamento || pedido.eventoFeira) ? (
                            <div className="flex flex-wrap gap-1">
                              {ehOrcamento ? (
                                <Badge
                                  variant={meta.variant}
                                  className="px-2 py-0 text-[11px]"
                                >
                                  {meta.shortLabel}
                                </Badge>
                              ) : null}
                              {pedido.eventoFeira ? (
                                <Badge
                                  variant="outline"
                                  className="px-2 py-0 text-[11px]"
                                >
                                  {pedido.eventoFeira}
                                </Badge>
                              ) : null}
                            </div>
                          ) : null}

                          {/* Cliente e Fabricante */}
                          <div className="space-y-1 text-xs">
                            <div className="flex items-start gap-1.5 font-semibold text-foreground">
                              <Building2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                              <Link
                                href={`/clientes/${pedido.clienteId}`}
                                className="line-clamp-2 hover:text-primary hover:underline"
                              >
                                {pedido.cliente?.razaoSocial ?? "Cliente"}
                              </Link>
                            </div>
                            {pedido.fornecedor ? (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Factory className="size-3 shrink-0" />
                                <span className="truncate">
                                  {pedido.fornecedor.nome}
                                </span>
                              </div>
                            ) : null}
                          </div>

                          {/* Primeiro item */}
                          {primeiroItem ? (
                            <p className="line-clamp-2 rounded-lg bg-muted/50 px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground">
                              {primeiroItem}
                              {pedido.itens.length > 1
                                ? ` (+${pedido.itens.length - 1})`
                                : ""}
                            </p>
                          ) : null}

                          {/* Alerta / Prazo */}
                          {prazoChip ? (
                            <div
                              className={cn(
                                "flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-medium",
                                prazoChip.tone === "danger" &&
                                  "bg-red-50 text-red-700 border border-red-200/80",
                                prazoChip.tone === "warning" &&
                                  "bg-amber-50 text-amber-800 border border-amber-200/80",
                                prazoChip.tone === "success" &&
                                  "bg-emerald-50 text-emerald-800 border border-emerald-200/80",
                                prazoChip.tone === "neutral" &&
                                  "bg-muted/60 text-muted-foreground"
                              )}
                            >
                              {prazoChip.icon === "bell" ? (
                                <BellRing className="size-3 shrink-0" />
                              ) : prazoChip.icon === "truck" ? (
                                <Truck className="size-3 shrink-0" />
                              ) : (
                                <CalendarClock className="size-3 shrink-0" />
                              )}
                              <span className="truncate">{prazoChip.texto}</span>
                            </div>
                          ) : null}

                          {/* Rodapé: Valor + Botão rápido de avançar */}
                          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-2">
                            <span className="text-xs font-extrabold text-foreground tabular-nums">
                              {formatCurrencyBRL(pedido.valorTotal)}
                            </span>

                            {nextStep ? (
                              <Button
                                type="button"
                                size="sm"
                                variant={ehOrcamento ? "default" : "secondary"}
                                className="h-7 px-2.5 text-xs font-semibold"
                                disabled={isUpdating}
                                onClick={() => {
                                  if (
                                    ehOrcamento &&
                                    nextStep.nextStatus === "APROVADO"
                                  ) {
                                    onConverterOrcamento(pedido);
                                  } else {
                                    onChangeStatus(pedido, nextStep.nextStatus);
                                  }
                                }}
                              >
                                {ehOrcamento ? (
                                  <CheckCircle2 className="size-3" />
                                ) : null}
                                {nextStep.label}
                                {!ehOrcamento ? (
                                  <ArrowRight className="size-3" />
                                ) : null}
                              </Button>
                            ) : (
                              <Button
                                asChild
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                              >
                                <Link href={`/pedidos/${pedido.id}`}>Abrir</Link>
                              </Button>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancelados / Perdidos recolhíveis para não poluir o quadro principal */}
      {encerrados.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-3.5">
          <button
            type="button"
            onClick={() => setMostrarEncerrados((prev) => !prev)}
            className="flex w-full cursor-pointer items-center justify-between text-left text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <span>
              Cancelados e Orçamentos Perdidos ({encerrados.length})
            </span>
            {mostrarEncerrados ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>

          {mostrarEncerrados ? (
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {encerrados.map((pedido) => {
                const meta = STATUS_PEDIDO_META[pedido.status];
                return (
                  <div
                    key={pedido.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3 text-xs"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/pedidos/${pedido.id}`}
                          className="truncate font-semibold text-foreground hover:text-primary hover:underline"
                        >
                          {pedido.numeroPedido
                            ? `Pedido ${pedido.numeroPedido}`
                            : "Orçamento"}
                        </Link>
                        <Badge variant={meta.variant} className="text-[10px]">
                          {meta.shortLabel}
                        </Badge>
                      </div>
                      <p className="truncate text-muted-foreground">
                        {pedido.cliente?.razaoSocial ?? "Cliente"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold tabular-nums">
                        {formatCurrencyBRL(pedido.valorTotal)}
                      </p>
                      <Link
                        href={`/pedidos/${pedido.id}`}
                        className="text-primary hover:underline"
                      >
                        Abrir
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
