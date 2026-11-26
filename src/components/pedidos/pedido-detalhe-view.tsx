"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Factory,
  FileText,
  FolderArchive,
  MapPin,
  Pencil,
  Ruler,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import type { PedidoDetalhe } from "@/lib/services/pedidos";
import {
  FORMA_PAGAMENTO_LABELS,
  MODELO_GRADE_LABELS,
  STATUS_FLUXO_PRINCIPAL,
  STATUS_PEDIDO_META,
  TEMPLATE_PDF_LABELS,
  isStatusOrcamento,
  type StatusPedido,
} from "@/lib/constants";
import {
  formatCep,
  formatCpfCnpj,
  formatCurrencyBRL,
  formatDateBR,
  formatTelefone,
} from "@/lib/formatters";
import {
  TAMANHOS_PADRAO,
  somarGradeTamanhos,
} from "@/lib/validators/pedido";
import {
  atualizarStatusPedidoAction,
  deletePedidoAction,
} from "@/app/(dashboard)/pedidos/actions";
import { ConverterOrcamentoDialog } from "@/components/pedidos/converter-orcamento-dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PedidoDetalheViewProps {
  pedido: PedidoDetalhe;
}

export function PedidoDetalheView({ pedido }: PedidoDetalheViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [converterOpen, setConverterOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const meta = STATUS_PEDIDO_META[pedido.status];
  const ehOrcamento = isStatusOrcamento(pedido.status);
  const currentStepIndex = STATUS_FLUXO_PRINCIPAL.indexOf(pedido.status);

  const handleStatusChange = (nextStatus: StatusPedido) => {
    if (nextStatus === pedido.status) return;
    // Se está em orçamento e clicou em "APROVADO", abre o modal de conversão guiada!
    if (ehOrcamento && nextStatus === "APROVADO") {
      setConverterOpen(true);
      return;
    }

    startTransition(async () => {
      const result = await atualizarStatusPedidoAction(pedido.id, nextStatus);
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

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deletePedidoAction(pedido.id);
      if (!result.success) {
        toast.error(result.error ?? "Não foi possível excluir.");
        return;
      }
      toast.success("Registro excluído.");
      router.push("/pedidos");
    });
  };

  const enderecoFat = pedido.enderecoFaturamento;
  const enderecoEnt = pedido.entregaMesmoFaturamento
    ? null
    : pedido.enderecoEntrega;

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/pedidos">
            <ArrowLeft className="size-4" />
            Voltar para Pedidos
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/pedidos/${pedido.id}/editar`}>
              <Pencil className="size-3.5" />
              Editar
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Banner de Conversão em 1 Clique (quando ainda é Orçamento) */}
      {ehOrcamento ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-bold text-primary">
              Este registro está em fase de Orçamento
            </p>
            <p className="mt-0.5 text-sm text-foreground/80">
              Cliente fechou a venda? Converta para Pedido Aprovado em 1 clique
              sem redigitar nenhum dado.
            </p>
          </div>
          <Button
            type="button"
            size="lg"
            className="shrink-0 font-semibold"
            onClick={() => setConverterOpen(true)}
          >
            <CheckCircle2 className="size-5" />
            Converter em Pedido
          </Button>
        </div>
      ) : null}

      {/* Cabeçalho e Progresso das 7 Etapas */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <CardTitle className="text-2xl">
                  {pedido.numeroPedido
                    ? `Pedido ${pedido.numeroPedido}`
                    : "Orçamento sem número"}
                </CardTitle>
                <Badge variant={meta.variant} className="text-xs">
                  {meta.label}
                </Badge>
                {pedido.eventoFeira ? (
                  <Badge variant="outline">{pedido.eventoFeira}</Badge>
                ) : null}
              </div>
              <CardDescription className="text-sm">
                Cliente:{" "}
                <Link
                  href={`/clientes/${pedido.clienteId}`}
                  className="font-semibold text-foreground hover:text-primary hover:underline"
                >
                  {pedido.cliente.razaoSocial}
                </Link>
                {pedido.fornecedor ? (
                  <>
                    {" • "}Fabricante:{" "}
                    <strong className="text-foreground">
                      {pedido.fornecedor.nome}
                    </strong>
                  </>
                ) : null}
              </CardDescription>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Valor Total
              </p>
              <p className="text-2xl font-extrabold text-primary tabular-nums">
                {formatCurrencyBRL(pedido.valorTotal)}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Barra interativa de 7 etapas */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Clique em uma etapa para atualizar o andamento:
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
              {STATUS_FLUXO_PRINCIPAL.map((st, idx) => {
                const isCurrent = pedido.status === st;
                const isDone =
                  currentStepIndex !== -1 && idx < currentStepIndex;
                return (
                  <button
                    key={st}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleStatusChange(st)}
                    className={`rounded-xl border px-2.5 py-2 text-left text-xs font-medium transition-all cursor-pointer disabled:opacity-60 ${
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground shadow-xs font-semibold"
                        : isDone
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="block text-[10px] opacity-75">
                      Etapa {idx + 1}
                    </span>
                    <span className="block truncate">
                      {STATUS_PEDIDO_META[st].shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {pedido.status !== "CANCELADO" && pedido.status !== "PERDIDO" ? (
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              {ehOrcamento ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => handleStatusChange("PERDIDO")}
                >
                  Marcar como Orçamento Perdido
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => handleStatusChange("CANCELADO")}
                >
                  Cancelar Pedido
                </Button>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Grid de Informações: Cliente/Entrega + Fabricante/Datas/Pagamento */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4 text-primary" />
              Faturamento, Comprador e Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Cliente
              </p>
              <Link
                href={`/clientes/${pedido.clienteId}`}
                className="font-semibold text-foreground hover:text-primary hover:underline"
              >
                {pedido.cliente.razaoSocial}
              </Link>
              <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                {pedido.cliente.cpfCnpj ? (
                  <span>
                    {pedido.cliente.tipoPessoa === "PJ" ? "CNPJ:" : "CPF:"}{" "}
                    {formatCpfCnpj(pedido.cliente.cpfCnpj)}
                  </span>
                ) : null}
                {pedido.cliente.inscricaoEstadual ? (
                  <span>IE: {pedido.cliente.inscricaoEstadual}</span>
                ) : null}
                {pedido.cliente.tipoPessoa === "PF" &&
                pedido.cliente.dataNascimento ? (
                  <span>
                    Nasc.: {formatDateBR(pedido.cliente.dataNascimento)}
                  </span>
                ) : null}
              </div>
            </div>

            {pedido.comprador ? (
              <div className="border-t border-border pt-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                  <User className="size-3.5" />
                  Comprador
                </p>
                <p className="font-medium text-foreground">
                  {pedido.comprador.nome}
                  {pedido.comprador.departamento
                    ? ` (${pedido.comprador.departamento})`
                    : ""}
                </p>
                <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                  {pedido.comprador.email ? (
                    <p>E-mail: {pedido.comprador.email}</p>
                  ) : null}
                  {pedido.comprador.emailFinanceiro ? (
                    <p>Financeiro: {pedido.comprador.emailFinanceiro}</p>
                  ) : null}
                  {pedido.comprador.telefone ? (
                    <p>Telefone: {formatTelefone(pedido.comprador.telefone)}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="border-t border-border pt-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                <MapPin className="size-3.5" />
                Endereço de Faturamento
              </p>
              {enderecoFat ? (
                <p className="mt-0.5 text-foreground">
                  {enderecoFat.rotulo ? `${enderecoFat.rotulo}: ` : ""}
                  {enderecoFat.logradouro}
                  {enderecoFat.bairro ? `, ${enderecoFat.bairro}` : ""} —{" "}
                  {enderecoFat.cidade}/{enderecoFat.uf.trim()}
                  {enderecoFat.cep ? ` (CEP ${formatCep(enderecoFat.cep)})` : ""}
                </p>
              ) : (
                <p className="mt-0.5 text-muted-foreground">Não informado</p>
              )}
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Local de Entrega
              </p>
              {pedido.entregaMesmoFaturamento ? (
                <p className="mt-0.5 font-medium text-foreground">
                  Mesmo endereço de faturamento
                  {pedido.acEntrega ? ` — A/C ${pedido.acEntrega}` : ""}
                </p>
              ) : enderecoEnt ? (
                <p className="mt-0.5 text-foreground">
                  {enderecoEnt.rotulo ? `${enderecoEnt.rotulo}: ` : ""}
                  {enderecoEnt.logradouro}
                  {enderecoEnt.bairro ? `, ${enderecoEnt.bairro}` : ""} —{" "}
                  {enderecoEnt.cidade}/{enderecoEnt.uf.trim()}
                  {pedido.acEntrega ? ` — A/C ${pedido.acEntrega}` : ""}
                </p>
              ) : (
                <p className="mt-0.5 text-muted-foreground">
                  Não informado
                  {pedido.acEntrega ? ` — A/C ${pedido.acEntrega}` : ""}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Factory className="size-4 text-primary" />
              Fabricante, Pagamento e Datas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Fabricante
                </p>
                <p className="font-medium text-foreground">
                  {pedido.fornecedor?.nome ?? "Não definido"}
                </p>
                {pedido.fornecedor ? (
                  <p className="text-xs text-muted-foreground">
                    {TEMPLATE_PDF_LABELS[pedido.fornecedor.templatePdf]}
                  </p>
                ) : null}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Vendedor
                </p>
                <p className="font-medium text-foreground">{pedido.vendedor}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Cond. Pagamento
                </p>
                <p className="font-medium text-foreground">
                  {pedido.condicaoPagamento || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Forma
                </p>
                <p className="font-medium text-foreground">
                  {pedido.formaPagamento
                    ? FORMA_PAGAMENTO_LABELS[pedido.formaPagamento]
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Ordem de Compra
                </p>
                <p className="font-medium text-foreground">
                  {pedido.ordemCompra || "—"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-3">
              <div>
                <p className="flex items-center gap-1 text-xs font-semibold uppercase text-muted-foreground">
                  <Calendar className="size-3" />
                  Data Orçamento
                </p>
                <p className="font-medium tabular-nums">
                  {formatDateBR(pedido.dataOrcamento)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Data Pedido
                </p>
                <p className="font-medium tabular-nums">
                  {formatDateBR(pedido.dataPedido)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Próximo Retorno
                </p>
                <p className="font-medium tabular-nums">
                  {formatDateBR(pedido.proximoFollowup)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Prazo Entrega
                </p>
                <p className="font-medium">
                  {pedido.prazoEntregaDias
                    ? `${pedido.prazoEntregaDias} dias`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Saída Fábrica
                </p>
                <p className="font-medium tabular-nums">
                  {formatDateBR(pedido.dataSaidaFabrica)}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Entregue em
                </p>
                <p className="font-medium tabular-nums">
                  {formatDateBR(pedido.dataEntregaCliente)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Itens do Pedido + Grades de Tamanho */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Itens do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20 text-right">Qtd.</TableHead>
                <TableHead>Descrição Técnica</TableHead>
                <TableHead className="w-32 text-right">Unitário</TableHead>
                <TableHead className="w-32 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedido.itens.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {item.quantidade}
                  </TableCell>
                  <TableCell>
                    <p className="whitespace-pre-wrap text-foreground">
                      {item.descricaoTecnica}
                    </p>
                    {item.gradeTamanhos ? (
                      <div className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.03] p-3">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <Ruler className="size-3.5" />
                          Grade — Modelo{" "}
                          {MODELO_GRADE_LABELS[item.gradeTamanhos.modelo]}
                        </p>
                        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                          {TAMANHOS_PADRAO.map((tam) => (
                            <div
                              key={tam}
                              className="rounded-md border border-border bg-card px-1.5 py-1 text-center"
                            >
                              <span className="block text-[10px] font-semibold text-muted-foreground">
                                {tam}
                              </span>
                              <span className="text-xs font-bold tabular-nums text-foreground">
                                {item.gradeTamanhos?.tamanhos[tam] ?? 0}
                              </span>
                            </div>
                          ))}
                          <div className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-1 text-center">
                            <span className="block text-[10px] font-bold text-primary">
                              TOTAL
                            </span>
                            <span className="text-xs font-bold tabular-nums text-primary">
                              {somarGradeTamanhos(item.gradeTamanhos)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">
                    {formatCurrencyBRL(item.valorUnitario)}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">
                    {formatCurrencyBRL(item.valorTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Resumo Financeiro */}
          <div className="ml-auto max-w-sm space-y-2 rounded-xl bg-muted/50 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold tabular-nums">
                {formatCurrencyBRL(pedido.subtotal)}
              </span>
            </div>
            {Number(pedido.desconto) > 0 ? (
              <div className="flex items-center justify-between text-emerald-700">
                <span>Desconto</span>
                <span className="font-semibold tabular-nums">
                  - {formatCurrencyBRL(pedido.desconto)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold text-foreground">
              <span>Valor Total Final</span>
              <span className="text-primary tabular-nums">
                {formatCurrencyBRL(pedido.valorTotal)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observações e Ocorrências */}
      {pedido.obsNotaFiscal || pedido.observacoes || pedido.ocorrencias ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {pedido.obsNotaFiscal ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Observação para Nota Fiscal</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap text-foreground">
                {pedido.obsNotaFiscal}
              </CardContent>
            </Card>
          ) : null}

          {pedido.observacoes ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Observações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap text-foreground">
                {pedido.observacoes}
              </CardContent>
            </Card>
          ) : null}

          {pedido.ocorrencias ? (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm text-amber-900">
                  <AlertCircle className="size-4 text-amber-600" />
                  Ocorrências Registradas
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap text-amber-950">
                {pedido.ocorrencias}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* Prévia Sprint 3: PDF e Pasta Virtual */}
      <Card className="border-dashed bg-muted/20">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <FolderArchive className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Folha de Pedido em PDF e Pasta Virtual (.zip) — Sprint 3
              </p>
              <p className="text-xs text-muted-foreground">
                Na próxima etapa você poderá gerar o PDF no layout do fabricante,
                anexar mockups/NF e baixar a pasta completa deste pedido em 1 clique.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled>
              <FileText className="size-4" />
              Gerar PDF (em breve)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Conversão em Pedido */}
      <ConverterOrcamentoDialog
        open={converterOpen}
        onOpenChange={setConverterOpen}
        orcamento={{
          id: pedido.id,
          numeroPedido: pedido.numeroPedido,
          condicaoPagamento: pedido.condicaoPagamento,
          formaPagamento: pedido.formaPagamento,
          ordemCompra: pedido.ordemCompra,
          prazoEntregaDias: pedido.prazoEntregaDias,
          dataSaidaFabrica: pedido.dataSaidaFabrica,
          fornecedor: pedido.fornecedor,
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir registro?"
        description="Tem certeza que deseja excluir este orçamento/pedido? Todos os itens vinculados também serão removidos."
        confirmLabel="Sim, excluir"
        loading={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
