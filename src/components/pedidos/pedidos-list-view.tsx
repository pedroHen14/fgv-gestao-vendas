"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Plus,
  Search,
} from "lucide-react";
import type { PedidoListaItem } from "@/lib/services/pedidos";
import {
  STATUS_PEDIDO_META,
  isStatusOrcamento,
  type StatusPedido,
} from "@/lib/constants";
import { formatCurrencyBRL, formatDateBR } from "@/lib/formatters";
import {
  ConverterOrcamentoDialog,
  type OrcamentoParaConversao,
} from "@/components/pedidos/converter-orcamento-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/layout/empty-state";

interface PedidosListViewProps {
  pedidos: PedidoListaItem[];
}

type FiltroGrupo =
  | "TODOS"
  | "ORCAMENTOS"
  | "ANDAMENTO"
  | "ENTREGUES"
  | "ENCERRADOS";

const STATUS_ANDAMENTO = new Set<StatusPedido>([
  "APROVADO",
  "EM_PRODUCAO",
  "EM_TRANSITO",
]);

const STATUS_ENCERRADOS = new Set<StatusPedido>(["CANCELADO", "PERDIDO"]);

export function PedidosListView({ pedidos }: PedidosListViewProps) {
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState<FiltroGrupo>("TODOS");
  const [orcamentoParaConverter, setOrcamentoParaConverter] =
    useState<OrcamentoParaConversao | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pedidos.filter((p) => {
      if (grupo === "ORCAMENTOS" && !isStatusOrcamento(p.status)) return false;
      if (grupo === "ANDAMENTO" && !STATUS_ANDAMENTO.has(p.status)) return false;
      if (grupo === "ENTREGUES" && p.status !== "ENTREGUE") return false;
      if (grupo === "ENCERRADOS" && !STATUS_ENCERRADOS.has(p.status)) {
        return false;
      }

      if (!termo) return true;
      if (p.numeroPedido?.toLowerCase().includes(termo)) return true;
      if (p.cliente?.razaoSocial.toLowerCase().includes(termo)) return true;
      if (p.fornecedor?.nome.toLowerCase().includes(termo)) return true;
      if (p.comprador?.nome.toLowerCase().includes(termo)) return true;
      if (p.eventoFeira?.toLowerCase().includes(termo)) return true;
      if (
        p.itens.some((it) => it.descricaoTecnica.toLowerCase().includes(termo))
      ) {
        return true;
      }
      return false;
    });
  }, [pedidos, busca, grupo]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Pedidos e Orçamentos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie orçamentos, converta em pedido com 1 clique e acompanhe cada
            etapa até a entrega.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="lg" className="font-semibold">
            <Link href="/pedidos/novo">
              <Plus className="size-4" />
              Novo Orçamento
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="font-semibold">
            <Link href="/pedidos/novo?modo=pedido">
              <ClipboardList className="size-4" />
              Lançar Pedido
            </Link>
          </Button>
        </div>
      </div>

      {/* Busca e filtros rápidos */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nº do pedido, cliente, fabricante, produto ou feira..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { value: "TODOS", label: "Todos" },
              { value: "ORCAMENTOS", label: "Orçamentos" },
              { value: "ANDAMENTO", label: "Em Andamento" },
              { value: "ENTREGUES", label: "Entregues" },
              { value: "ENCERRADOS", label: "Cancelados / Perdidos" },
            ] as const
          ).map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={grupo === opt.value ? "default" : "outline"}
              onClick={() => setGrupo(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {pedidos.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={ClipboardList}
              title="Nenhum orçamento ou pedido cadastrado ainda"
              description="Comece criando um novo orçamento ou lançando um pedido direto. Todo o histórico do cliente será atualizado automaticamente."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild size="lg">
                    <Link href="/pedidos/novo">
                      <Plus className="size-4" />
                      Novo Orçamento
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/pedidos/novo?modo=pedido">
                      <ClipboardList className="size-4" />
                      Lançar Pedido
                    </Link>
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Search}
              title="Nenhum registro encontrado"
              description="Tente alterar a busca ou o filtro de etapa acima."
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setBusca("");
                    setGrupo("TODOS");
                  }}
                >
                  Limpar filtros
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº / Etapa</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((pedido) => {
                  const meta = STATUS_PEDIDO_META[pedido.status];
                  const podeConverter = isStatusOrcamento(pedido.status);
                  const primeiroItem = pedido.itens[0]?.descricaoTecnica;

                  return (
                    <TableRow key={pedido.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <Link
                            href={`/pedidos/${pedido.id}`}
                            className="font-semibold text-foreground hover:text-primary hover:underline"
                          >
                            {pedido.numeroPedido
                              ? `Pedido ${pedido.numeroPedido}`
                              : "Orçamento"}
                          </Link>
                          <div>
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-[160px]">
                          <Link
                            href={`/clientes/${pedido.clienteId}`}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {pedido.cliente?.razaoSocial ?? "Cliente"}
                          </Link>
                          {pedido.comprador ? (
                            <p className="text-xs text-muted-foreground">
                              Comprador: {pedido.comprador.nome}
                            </p>
                          ) : null}
                          {pedido.eventoFeira ? (
                            <p className="text-xs font-medium text-primary">
                              Feira: {pedido.eventoFeira}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{pedido.fornecedor?.nome ?? "—"}</TableCell>
                      <TableCell>
                        <div className="max-w-[240px]">
                          <p className="truncate text-sm text-foreground">
                            {primeiroItem || "Sem itens"}
                          </p>
                          {pedido.itens.length > 1 ? (
                            <p className="text-xs text-muted-foreground">
                              + {pedido.itens.length - 1}{" "}
                              {pedido.itens.length - 1 === 1
                                ? "outro item"
                                : "outros itens"}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-xs text-muted-foreground">
                        {formatDateBR(
                          pedido.dataPedido ?? pedido.dataOrcamento
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold whitespace-nowrap tabular-nums">
                        {formatCurrencyBRL(pedido.valorTotal)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {podeConverter ? (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                setOrcamentoParaConverter({
                                  id: pedido.id,
                                  numeroPedido: pedido.numeroPedido,
                                  condicaoPagamento: pedido.condicaoPagamento,
                                  formaPagamento: pedido.formaPagamento,
                                  ordemCompra: pedido.ordemCompra,
                                  prazoEntregaDias: pedido.prazoEntregaDias,
                                  dataSaidaFabrica: pedido.dataSaidaFabrica,
                                  fornecedor: pedido.fornecedor,
                                })
                              }
                            >
                              <CheckCircle2 className="size-3.5" />
                              Converter em Pedido
                            </Button>
                          ) : null}
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/pedidos/${pedido.id}`}>Abrir</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
