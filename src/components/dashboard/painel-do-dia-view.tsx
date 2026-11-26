"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  CalendarPlus,
  CheckCircle2,
  ClipboardList,
  Factory,
  PackageCheck,
  Plus,
  TrendingUp,
  Truck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import type {
  AlertaFollowupItem,
  ResumoPainelDoDia,
} from "@/lib/services/alertas";
import { STATUS_PEDIDO_META, type StatusPedido } from "@/lib/constants";
import {
  addDaysToIsoDate,
  formatCurrencyBRL,
  formatDateBR,
  formatPrazoRelativo,
} from "@/lib/formatters";
import {
  adiarFollowupAction,
  atualizarStatusPedidoAction,
} from "@/app/(dashboard)/pedidos/actions";
import {
  ConverterOrcamentoDialog,
  type OrcamentoParaConversao,
} from "@/components/pedidos/converter-orcamento-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PainelDoDiaViewProps {
  resumo: ResumoPainelDoDia;
}

function toConversaoFromFollowup(
  item: AlertaFollowupItem
): OrcamentoParaConversao {
  return {
    id: item.id,
    numeroPedido: item.numeroPedido,
    condicaoPagamento: item.condicaoPagamento,
    formaPagamento: item.formaPagamento,
    ordemCompra: item.ordemCompra,
    prazoEntregaDias: item.prazoEntregaDias,
    dataSaidaFabrica: item.dataSaidaFabrica,
    fornecedor: item.fornecedor,
  };
}

export function PainelDoDiaView({ resumo }: PainelDoDiaViewProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [orcamentoParaConverter, setOrcamentoParaConverter] =
    useState<OrcamentoParaConversao | null>(null);

  const { alertas } = resumo;
  const hojeIso = alertas.dataReferencia;
  const totalEntregasCard =
    alertas.producaoAlerta.length + alertas.todosEmTransito.length;

  const handleAdiarFollowup = async (pedidoId: string, dias: number) => {
    const novaData = addDaysToIsoDate(hojeIso, dias);
    setBusyId(pedidoId);
    const result = await adiarFollowupAction(pedidoId, novaData);
    setBusyId(null);

    if (!result.success) {
      toast.error(result.error ?? "Não foi possível reagendar o retorno.");
      return;
    }

    toast.success(`Retorno reagendado para ${formatDateBR(novaData)}.`);
    router.refresh();
  };

  const handleAvancarStatus = async (
    pedidoId: string,
    nextStatus: StatusPedido
  ) => {
    setBusyId(pedidoId);
    const result = await atualizarStatusPedidoAction(pedidoId, nextStatus);
    setBusyId(null);

    if (!result.success) {
      toast.error(result.error ?? "Não foi possível atualizar o pedido.");
      return;
    }

    toast.success(
      `Pedido atualizado para "${STATUS_PEDIDO_META[nextStatus].label}".`
    );
    router.refresh();
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho e 3 botões grandes de atalho */}
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Bom trabalho! O que vamos fazer agora?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Resumo atualizado de hoje ({formatDateBR(hojeIso)}). Use os
              atalhos abaixo ou resolva as pendências do dia.
            </p>
          </div>

          {alertas.totalPendenciasCron > 0 ? (
            <Badge variant="warning" className="h-7 px-3 text-xs font-semibold">
              {alertas.totalPendenciasCron}{" "}
              {alertas.totalPendenciasCron === 1
                ? "pendência pede atenção hoje"
                : "pendências pedem atenção hoje"}
            </Badge>
          ) : (
            <Badge variant="success" className="h-7 px-3 text-xs font-semibold">
              Tudo em dia hoje
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button asChild size="lg" className="h-12 text-base font-semibold">
            <Link href="/pedidos/novo">
              <Plus className="size-5" />
              Novo Orçamento
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="h-12 text-base font-semibold"
          >
            <Link href="/pedidos/novo?modo=pedido">
              <ClipboardList className="size-5" />
              Lançar Pedido
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 text-base font-semibold"
          >
            <Link href="/clientes/novo">
              <UserPlus className="size-5" />
              Novo Cliente
            </Link>
          </Button>
        </div>
      </section>

      {/* Resumo rápido do mês */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos fechados ({resumo.mesLabel})
            </CardTitle>
            <TrendingUp className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight tabular-nums">
              {resumo.pedidosFechadosMes}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {resumo.orcamentosAbertos}{" "}
              {resumo.orcamentosAbertos === 1
                ? "orçamento em aberto"
                : "orçamentos em aberto"}{" "}
              no momento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total vendido no mês
            </CardTitle>
            <ClipboardList className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight tabular-nums text-primary">
              {formatCurrencyBRL(resumo.totalVendidoMes)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Soma automática dos pedidos aprovados no mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fábricas em andamento
            </CardTitle>
            <Factory className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight tabular-nums">
              {resumo.fabricasEmAndamento}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {alertas.totalEmProducao} em produção •{" "}
              {alertas.todosEmTransito.length} em trânsito
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Cards de ação do dia */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card 1: Orçamentos para Cobrar */}
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BellRing className="size-5 text-amber-600" />
                  Orçamentos para Cobrar
                  {alertas.followupsPendentes.length > 0 ? (
                    <Badge variant="warning" className="ml-1 tabular-nums">
                      {alertas.followupsPendentes.length}
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription className="mt-1">
                  Orçamentos enviados ou aguardando fábrica com retorno para
                  hoje ou em atraso.
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link href="/pedidos?visao=tabela&grupo=ORCAMENTOS">
                  Ver todos
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {alertas.followupsPendentes.length === 0 ? (
              <EmptyState
                icon={BellRing}
                title="Nenhum orçamento pendente de cobrança"
                description="Todos os orçamentos com data de retorno estão em dia. Quando algum vencer, aparecerá aqui."
              />
            ) : (
              <div className="space-y-3">
                {alertas.followupsPendentes.map((item) => {
                  const statusMeta = STATUS_PEDIDO_META[item.status];
                  const isBusy = busyId === item.id;
                  const atrasoLabel =
                    item.diasAtraso === 0
                      ? "Retorno hoje"
                      : item.diasAtraso === 1
                        ? "Atrasado há 1 dia"
                        : `Atrasado há ${item.diasAtraso} dias`;

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border bg-background/60 p-3.5 transition-colors hover:border-primary/40"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant={
                                item.diasAtraso > 0 ? "destructive" : "warning"
                              }
                            >
                              {atrasoLabel}
                            </Badge>
                            <Badge variant={statusMeta.variant}>
                              {statusMeta.shortLabel}
                            </Badge>
                            {item.eventoFeira ? (
                              <Badge variant="outline">{item.eventoFeira}</Badge>
                            ) : null}
                          </div>

                          <p className="font-semibold text-foreground">
                            <Link
                              href={`/pedidos/${item.id}`}
                              className="hover:text-primary hover:underline"
                            >
                              {item.clienteNome}
                            </Link>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.compradorNome
                              ? `Comprador: ${item.compradorNome}`
                              : "Sem comprador definido"}
                            {item.fornecedor
                              ? ` • Fábrica: ${item.fornecedor.nome}`
                              : ""}
                          </p>
                          {item.primeiroItem ? (
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {item.primeiroItem}
                            </p>
                          ) : null}
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground tabular-nums">
                            {formatCurrencyBRL(item.valorTotal)}
                          </p>
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            Previsto: {formatDateBR(item.proximoFollowup)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-2.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          disabled={isBusy}
                          onClick={() => handleAdiarFollowup(item.id, 3)}
                        >
                          <CalendarPlus className="size-3.5" />
                          Adiar +3 dias
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 text-xs font-semibold"
                          disabled={isBusy}
                          onClick={() =>
                            setOrcamentoParaConverter(
                              toConversaoFromFollowup(item)
                            )
                          }
                        >
                          <CheckCircle2 className="size-3.5" />
                          Aprovar Pedido
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                        >
                          <Link href={`/pedidos/${item.id}`}>Abrir</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Fábricas e Entregas Próximas */}
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="size-5 text-primary" />
                  Fábricas e Entregas Próximas
                  {totalEntregasCard > 0 ? (
                    <Badge variant="secondary" className="ml-1 tabular-nums">
                      {totalEntregasCard}
                    </Badge>
                  ) : null}
                </CardTitle>
                <CardDescription className="mt-1">
                  Pedidos em produção saindo nos próximos 3 dias (ou atrasados)
                  e entregas em trânsito.
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link href="/pedidos">
                  Abrir Kanban
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            {totalEntregasCard === 0 ? (
              <EmptyState
                icon={Truck}
                title="Nenhuma entrega próxima no momento"
                description="Pedidos em produção próximos da data de saída da fábrica e pedidos em trânsito aparecerão aqui."
              />
            ) : (
              <div className="space-y-5">
                {alertas.producaoAlerta.length > 0 ? (
                  <div className="space-y-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <Factory className="size-3.5 text-orange-600" />
                      Em Produção — Cobrar Fábrica ({alertas.producaoAlerta.length})
                    </p>

                    {alertas.producaoAlerta.map((item) => {
                      const prazo = formatPrazoRelativo(
                        item.dataPrevistaSaida,
                        hojeIso
                      );
                      const isBusy = busyId === item.id;

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-border bg-background/60 p-3.5 transition-colors hover:border-primary/40"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge
                                  variant={
                                    prazo.urgencia === "atrasado"
                                      ? "destructive"
                                      : "warning"
                                  }
                                >
                                  {prazo.texto}
                                </Badge>
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {item.numeroPedido
                                    ? `Pedido ${item.numeroPedido}`
                                    : "Sem número"}
                                </span>
                                {item.fornecedorNome ? (
                                  <Badge variant="outline">
                                    {item.fornecedorNome}
                                  </Badge>
                                ) : null}
                              </div>

                              <p className="font-semibold text-foreground">
                                <Link
                                  href={`/pedidos/${item.id}`}
                                  className="hover:text-primary hover:underline"
                                >
                                  {item.clienteNome}
                                </Link>
                              </p>
                              {item.primeiroItem ? (
                                <p className="line-clamp-1 text-xs text-muted-foreground">
                                  {item.primeiroItem}
                                </p>
                              ) : null}
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-foreground tabular-nums">
                                {formatCurrencyBRL(item.valorTotal)}
                              </p>
                              <p className="text-[11px] text-muted-foreground tabular-nums">
                                Saída: {formatDateBR(item.dataPrevistaSaida)}
                              </p>
                              {item.origemDataPrevista === "prazo_entrega" ? (
                                <p className="text-[10px] text-muted-foreground">
                                  (pelo prazo de {item.prazoEntregaDias} dias)
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-2.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-8 text-xs font-semibold"
                              disabled={isBusy}
                              onClick={() =>
                                handleAvancarStatus(item.id, "EM_TRANSITO")
                              }
                            >
                              <Truck className="size-3.5" />
                              Marcar em Trânsito
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                            >
                              <Link href={`/pedidos/${item.id}`}>Abrir</Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {alertas.todosEmTransito.length > 0 ? (
                  <div className="space-y-2.5">
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <Truck className="size-3.5 text-sky-600" />
                      Em Trânsito — Confirmar Entrega (
                      {alertas.todosEmTransito.length})
                    </p>

                    {alertas.todosEmTransito.map((item) => {
                      const isBusy = busyId === item.id;
                      const diasTexto =
                        item.diasEmTransito === 0
                          ? "Saiu hoje"
                          : item.diasEmTransito === 1
                            ? "Há 1 dia em trânsito"
                            : `Há ${item.diasEmTransito} dias em trânsito`;

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-border bg-background/60 p-3.5 transition-colors hover:border-primary/40"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge
                                  variant={
                                    item.atrasado ? "destructive" : "secondary"
                                  }
                                >
                                  {diasTexto}
                                </Badge>
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {item.numeroPedido
                                    ? `Pedido ${item.numeroPedido}`
                                    : "Sem número"}
                                </span>
                                {item.fornecedorNome ? (
                                  <Badge variant="outline">
                                    {item.fornecedorNome}
                                  </Badge>
                                ) : null}
                              </div>

                              <p className="font-semibold text-foreground">
                                <Link
                                  href={`/pedidos/${item.id}`}
                                  className="hover:text-primary hover:underline"
                                >
                                  {item.clienteNome}
                                </Link>
                              </p>
                              {item.primeiroItem ? (
                                <p className="line-clamp-1 text-xs text-muted-foreground">
                                  {item.primeiroItem}
                                </p>
                              ) : null}
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-foreground tabular-nums">
                                {formatCurrencyBRL(item.valorTotal)}
                              </p>
                              {item.dataSaidaFabrica ? (
                                <p className="text-[11px] text-muted-foreground tabular-nums">
                                  Saiu em {formatDateBR(item.dataSaidaFabrica)}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-2.5">
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs font-semibold"
                              disabled={isBusy}
                              onClick={() =>
                                handleAvancarStatus(item.id, "ENTREGUE")
                              }
                            >
                              <PackageCheck className="size-3.5" />
                              Confirmar Entrega
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                            >
                              <Link href={`/pedidos/${item.id}`}>Abrir</Link>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {orcamentoParaConverter ? (
        <ConverterOrcamentoDialog
          key={orcamentoParaConverter.id}
          open={Boolean(orcamentoParaConverter)}
          onOpenChange={(open) => {
            if (!open) setOrcamentoParaConverter(null);
          }}
          orcamento={orcamentoParaConverter}
        />
      ) : null}
    </div>
  );
}
