"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FilterX,
  LayoutGrid,
  Plus,
  Search,
  Table2,
} from "lucide-react";
import { toast } from "sonner";
import type { PedidoListaItem } from "@/lib/services/pedidos";
import {
  STATUS_FLUXO_PRINCIPAL,
  STATUS_PEDIDO_META,
  isStatusOrcamento,
  type StatusPedido,
} from "@/lib/constants";
import {
  addDaysToIsoDate,
  formatCurrencyBRL,
  formatDateBR,
  getMonthRangeFromIso,
  getTodayIsoDate,
  toSaoPauloIsoDate,
} from "@/lib/formatters";
import { atualizarStatusPedidoAction } from "@/app/(dashboard)/pedidos/actions";
import {
  ConverterOrcamentoDialog,
  type OrcamentoParaConversao,
} from "@/components/pedidos/converter-orcamento-dialog";
import { PedidosKanban } from "@/components/pedidos/pedidos-kanban";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/layout/empty-state";

export type VisaoPedidos = "kanban" | "tabela";
export type FiltroGrupo =
  | "TODOS"
  | "ORCAMENTOS"
  | "ANDAMENTO"
  | "ENTREGUES"
  | "ENCERRADOS";

type FiltroPeriodo =
  | "TODOS"
  | "MES_ATUAL"
  | "ULTIMOS_30"
  | "ULTIMOS_90"
  | "ANO_ATUAL"
  | "PERSONALIZADO";

interface PedidosListViewProps {
  pedidos: PedidoListaItem[];
  hojeIso?: string;
  initialVisao?: VisaoPedidos;
  initialGrupo?: FiltroGrupo;
}

const STATUS_ANDAMENTO = new Set<StatusPedido>([
  "APROVADO",
  "EM_PRODUCAO",
  "EM_TRANSITO",
]);

const STATUS_ENCERRADOS = new Set<StatusPedido>(["CANCELADO", "PERDIDO"]);

function toConversaoPayload(pedido: PedidoListaItem): OrcamentoParaConversao {
  return {
    id: pedido.id,
    numeroPedido: pedido.numeroPedido,
    condicaoPagamento: pedido.condicaoPagamento,
    formaPagamento: pedido.formaPagamento,
    ordemCompra: pedido.ordemCompra,
    prazoEntregaDias: pedido.prazoEntregaDias,
    dataSaidaFabrica: pedido.dataSaidaFabrica,
    fornecedor: pedido.fornecedor,
  };
}

export function PedidosListView({
  pedidos,
  hojeIso: hojeIsoProp,
  initialVisao = "kanban",
  initialGrupo = "TODOS",
}: PedidosListViewProps) {
  const router = useRouter();
  const hojeIso = hojeIsoProp ?? getTodayIsoDate();
  const [, startTransition] = useTransition();

  const [pedidosState, applyOptimisticStatus] = useOptimistic(
    pedidos,
    (
      current: PedidoListaItem[],
      update: { id: string; status: StatusPedido }
    ) =>
      current.map((item) =>
        item.id === update.id
          ? {
              ...item,
              status: update.status,
              dataEntregaCliente:
                update.status === "ENTREGUE" && !item.dataEntregaCliente
                  ? hojeIso
                  : item.dataEntregaCliente,
              proximoFollowup:
                update.status === "APROVADO" ||
                update.status === "CANCELADO" ||
                update.status === "PERDIDO"
                  ? null
                  : item.proximoFollowup,
            }
          : item
      )
  );
  const [visao, setVisao] = useState<VisaoPedidos>(initialVisao);
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState<FiltroGrupo>(initialGrupo);
  const [clienteFiltro, setClienteFiltro] = useState("");
  const [fornecedorFiltro, setFornecedorFiltro] = useState("");
  const [feiraFiltro, setFeiraFiltro] = useState("");
  const [periodoFiltro, setPeriodoFiltro] = useState<FiltroPeriodo>("TODOS");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [orcamentoParaConverter, setOrcamentoParaConverter] =
    useState<OrcamentoParaConversao | null>(null);

  const opcoesClientes = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of pedidosState) {
      if (p.cliente?.id && p.cliente.razaoSocial) {
        mapa.set(p.cliente.id, p.cliente.razaoSocial);
      }
    }
    return Array.from(mapa.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [pedidosState]);

  const opcoesFornecedores = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of pedidosState) {
      if (p.fornecedor?.id && p.fornecedor.nome) {
        mapa.set(p.fornecedor.id, p.fornecedor.nome);
      }
    }
    return Array.from(mapa.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [pedidosState]);

  const opcoesFeiras = useMemo(() => {
    const set = new Set<string>();
    for (const p of pedidosState) {
      const f = p.eventoFeira?.trim();
      if (f) set.add(f);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [pedidosState]);

  const temFiltroAtivo = Boolean(
    busca.trim() ||
      (visao === "tabela" && grupo !== "TODOS") ||
      clienteFiltro ||
      fornecedorFiltro ||
      feiraFiltro ||
      periodoFiltro !== "TODOS"
  );

  const limparFiltros = () => {
    setBusca("");
    setGrupo("TODOS");
    setClienteFiltro("");
    setFornecedorFiltro("");
    setFeiraFiltro("");
    setPeriodoFiltro("TODOS");
    setDataInicio("");
    setDataFim("");
  };

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const { startIso: inicioMes, endIso: fimMes } =
      getMonthRangeFromIso(hojeIso);
    const ultimos30 = addDaysToIsoDate(hojeIso, -30);
    const ultimos90 = addDaysToIsoDate(hojeIso, -90);
    const inicioAno = `${hojeIso.slice(0, 4)}-01-01`;

    return pedidosState.filter((p) => {
      if (visao === "tabela") {
        if (grupo === "ORCAMENTOS" && !isStatusOrcamento(p.status)) return false;
        if (grupo === "ANDAMENTO" && !STATUS_ANDAMENTO.has(p.status))
          return false;
        if (grupo === "ENTREGUES" && p.status !== "ENTREGUE") return false;
        if (grupo === "ENCERRADOS" && !STATUS_ENCERRADOS.has(p.status)) {
          return false;
        }
      }

      if (clienteFiltro && p.clienteId !== clienteFiltro) return false;
      if (fornecedorFiltro && p.fornecedorId !== fornecedorFiltro) return false;
      if (
        feiraFiltro &&
        (p.eventoFeira?.trim().toLowerCase() ?? "") !==
          feiraFiltro.trim().toLowerCase()
      ) {
        return false;
      }

      if (periodoFiltro !== "TODOS") {
        const dataRef =
          p.dataPedido ?? p.dataOrcamento ?? toSaoPauloIsoDate(p.createdAt);
        if (
          periodoFiltro === "MES_ATUAL" &&
          (dataRef < inicioMes || dataRef > fimMes)
        ) {
          return false;
        }
        if (periodoFiltro === "ULTIMOS_30" && dataRef < ultimos30) return false;
        if (periodoFiltro === "ULTIMOS_90" && dataRef < ultimos90) return false;
        if (periodoFiltro === "ANO_ATUAL" && dataRef < inicioAno) return false;
        if (periodoFiltro === "PERSONALIZADO") {
          if (dataInicio && dataRef < dataInicio) return false;
          if (dataFim && dataRef > dataFim) return false;
        }
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
  }, [
    pedidosState,
    visao,
    busca,
    grupo,
    clienteFiltro,
    fornecedorFiltro,
    feiraFiltro,
    periodoFiltro,
    dataInicio,
    dataFim,
    hojeIso,
  ]);

  const somaFiltrados = useMemo(
    () => filtrados.reduce((acc, p) => acc + (Number(p.valorTotal) || 0), 0),
    [filtrados]
  );

  const handleStatusChange = (
    pedido: PedidoListaItem,
    nextStatus: StatusPedido
  ) => {
    if (pedido.status === nextStatus) return;

    // Conversão guiada ao aprovar um orçamento
    if (isStatusOrcamento(pedido.status) && nextStatus === "APROVADO") {
      setOrcamentoParaConverter(toConversaoPayload(pedido));
      return;
    }

    setUpdatingId(pedido.id);
    startTransition(async () => {
      applyOptimisticStatus({ id: pedido.id, status: nextStatus });
      const result = await atualizarStatusPedidoAction(pedido.id, nextStatus);
      setUpdatingId(null);

      if (!result.success) {
        toast.error(result.error ?? "Não foi possível atualizar a etapa.");
        return;
      }

      toast.success(
        `Etapa atualizada para "${STATUS_PEDIDO_META[nextStatus].label}".`
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Pedidos e Orçamentos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe cada orçamento e pedido pelo quadro visual ou pela tabela
            filtrável.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Alternância Kanban / Tabela */}
          <div className="inline-flex items-center rounded-xl border border-border bg-card p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setVisao("kanban")}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                visao === "kanban"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutGrid className="size-4" />
              Kanban
            </button>
            <button
              type="button"
              onClick={() => setVisao("tabela")}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                visao === "tabela"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Table2 className="size-4" />
              Tabela
            </button>
          </div>

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

      {/* Busca e Filtros */}
      <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
          <div className="relative md:col-span-2 xl:col-span-4">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar nº pedido, cliente, fabricante, produto ou feira..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="xl:col-span-2">
            <Select
              aria-label="Filtrar por cliente"
              value={clienteFiltro}
              onChange={(e) => setClienteFiltro(e.target.value)}
            >
              <option value="">Todos os clientes</option>
              {opcoesClientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </div>

          <div className="xl:col-span-2">
            <Select
              aria-label="Filtrar por fabricante"
              value={fornecedorFiltro}
              onChange={(e) => setFornecedorFiltro(e.target.value)}
            >
              <option value="">Todos os fabricantes</option>
              {opcoesFornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
            </Select>
          </div>

          <div className="xl:col-span-2">
            <Select
              aria-label="Filtrar por feira ou evento"
              value={feiraFiltro}
              onChange={(e) => setFeiraFiltro(e.target.value)}
            >
              <option value="">Todas as feiras</option>
              {opcoesFeiras.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </Select>
          </div>

          <div className="xl:col-span-2">
            <Select
              aria-label="Filtrar por período"
              value={periodoFiltro}
              onChange={(e) =>
                setPeriodoFiltro(e.target.value as FiltroPeriodo)
              }
            >
              <option value="TODOS">Qualquer período</option>
              <option value="MES_ATUAL">Este mês</option>
              <option value="ULTIMOS_30">Últimos 30 dias</option>
              <option value="ULTIMOS_90">Últimos 90 dias</option>
              <option value="ANO_ATUAL">Este ano</option>
              <option value="PERSONALIZADO">Escolher datas...</option>
            </Select>
          </div>
        </div>

        {/* Datas personalizadas */}
        {periodoFiltro === "PERSONALIZADO" ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3 text-sm">
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              De:
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="h-9 w-40"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              Até:
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="h-9 w-40"
              />
            </label>
          </div>
        ) : null}

        {/* Barra inferior: filtros de etapa (na Tabela) + resumo + limpar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
          {visao === "tabela" ? (
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
          ) : (
            <p className="text-xs font-medium text-muted-foreground">
              Quadro visual por etapa do pedido
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="tabular-nums">
              <strong className="text-foreground">{filtrados.length}</strong>{" "}
              {filtrados.length === 1 ? "registro" : "registros"} • Total:{" "}
              <strong className="text-foreground">
                {formatCurrencyBRL(somaFiltrados)}
              </strong>
            </span>
            {temFiltroAtivo ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={limparFiltros}
              >
                <FilterX className="size-3.5" />
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Conteúdo Principal: Vazio / Kanban / Tabela */}
      {pedidosState.length === 0 ? (
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
              description="Tente alterar a busca ou os filtros aplicados acima."
              action={
                <Button type="button" variant="outline" onClick={limparFiltros}>
                  Limpar filtros
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : visao === "kanban" ? (
        <PedidosKanban
          pedidos={filtrados}
          hojeIso={hojeIso}
          updatingId={updatingId}
          onChangeStatus={handleStatusChange}
          onConverterOrcamento={(p) =>
            setOrcamentoParaConverter(toConversaoPayload(p))
          }
        />
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
                  const isUpdating = updatingId === pedido.id;

                  return (
                    <TableRow
                      key={pedido.id}
                      className={isUpdating ? "opacity-60" : undefined}
                    >
                      <TableCell>
                        <div className="space-y-1.5">
                          <Link
                            href={`/pedidos/${pedido.id}`}
                            className="font-semibold text-foreground hover:text-primary hover:underline"
                          >
                            {pedido.numeroPedido
                              ? `Pedido ${pedido.numeroPedido}`
                              : "Orçamento"}
                          </Link>

                          <div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  className="inline-flex cursor-pointer items-center gap-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                  title="Clique para mudar a etapa"
                                >
                                  <Badge
                                    variant={meta.variant}
                                    className="gap-1 pr-1.5"
                                  >
                                    {meta.label}
                                    <ChevronDown className="size-3 opacity-75" />
                                  </Badge>
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-52">
                                <DropdownMenuLabel className="text-xs text-muted-foreground">
                                  Alterar etapa para:
                                </DropdownMenuLabel>
                                {STATUS_FLUXO_PRINCIPAL.map((st) => (
                                  <DropdownMenuItem
                                    key={st}
                                    disabled={st === pedido.status}
                                    onClick={() =>
                                      handleStatusChange(pedido, st)
                                    }
                                  >
                                    {STATUS_PEDIDO_META[st].label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  disabled={
                                    pedido.status === "CANCELADO" ||
                                    pedido.status === "PERDIDO"
                                  }
                                  onClick={() =>
                                    handleStatusChange(
                                      pedido,
                                      podeConverter ? "PERDIDO" : "CANCELADO"
                                    )
                                  }
                                >
                                  {podeConverter
                                    ? "Marcar como Perdido"
                                    : "Cancelar Pedido"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                        <p>
                          {formatDateBR(
                            pedido.dataPedido ?? pedido.dataOrcamento
                          )}
                        </p>
                        {podeConverter && pedido.proximoFollowup ? (
                          <p className="text-[11px] font-medium text-amber-700">
                            Retorno: {formatDateBR(pedido.proximoFollowup)}
                          </p>
                        ) : pedido.status === "EM_PRODUCAO" &&
                          pedido.dataSaidaFabrica ? (
                          <p className="text-[11px] font-medium text-primary">
                            Saída: {formatDateBR(pedido.dataSaidaFabrica)}
                          </p>
                        ) : null}
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
                                setOrcamentoParaConverter(
                                  toConversaoPayload(pedido)
                                )
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
