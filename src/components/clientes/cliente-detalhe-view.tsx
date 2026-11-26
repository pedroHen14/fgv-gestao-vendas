"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ClipboardList,
  FileSpreadsheet,
  Loader2,
  Mail,
  MapPin,
  MessageSquarePlus,
  Pencil,
  Phone,
  Plus,
  Send,
  Star,
  Tractor,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { ClienteDetalhe } from "@/lib/services/clientes";
import {
  STATUS_PEDIDO_META,
  TIPO_ENDERECO_LABELS,
  TIPO_INTERACAO_LABELS,
  TIPO_PESSOA_LABELS,
  UF_LIST,
  type StatusPedido,
  type TipoEndereco,
  type TipoInteracao,
  type TipoPessoa,
} from "@/lib/constants";
import {
  formatCep,
  formatCpfCnpj,
  formatCurrencyBRL,
  formatDateBR,
  formatDateTimeBR,
  formatTelefone,
} from "@/lib/formatters";
import {
  createInteracaoAction,
  deleteClienteAction,
  deleteCompradorAction,
  deleteEnderecoAction,
  deleteInteracaoAction,
  saveCompradorAction,
  saveEnderecoAction,
  updateClienteAction,
} from "@/app/(dashboard)/clientes/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/layout/empty-state";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";

interface ClienteDetalheViewProps {
  cliente: ClienteDetalhe;
}

const STATUS_FATURADOS = new Set<StatusPedido>([
  "APROVADO",
  "EM_PRODUCAO",
  "EM_TRANSITO",
  "ENTREGUE",
]);

export function ClienteDetalheView({ cliente }: ClienteDetalheViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modal Editar Cliente
  const [editClienteOpen, setEditClienteOpen] = useState(false);
  const [clienteForm, setClienteForm] = useState({
    tipo_pessoa: cliente.tipoPessoa as TipoPessoa,
    razao_social: cliente.razaoSocial,
    cpf_cnpj: cliente.cpfCnpj ?? "",
    inscricao_estadual: cliente.inscricaoEstadual ?? "",
    data_nascimento: cliente.dataNascimento ?? "",
    origem_indicacao: cliente.origemIndicacao ?? "",
    observacoes: cliente.observacoes ?? "",
  });
  const [deleteClienteOpen, setDeleteClienteOpen] = useState(false);

  // Modal Endereço
  const [enderecoDialogOpen, setEnderecoDialogOpen] = useState(false);
  const [editingEnderecoId, setEditingEnderecoId] = useState<string | null>(null);
  const [enderecoForm, setEnderecoForm] = useState({
    tipo: "FATURAMENTO" as TipoEndereco,
    rotulo: "",
    cnpj_filial: "",
    ie_filial: "",
    logradouro: "",
    bairro: "",
    cidade: "",
    uf: "SP",
    cep: "",
    principal: false,
  });
  const [deletingEnderecoId, setDeletingEnderecoId] = useState<string | null>(null);

  // Modal Comprador
  const [compradorDialogOpen, setCompradorDialogOpen] = useState(false);
  const [editingCompradorId, setEditingCompradorId] = useState<string | null>(null);
  const [compradorForm, setCompradorForm] = useState({
    nome: "",
    email: "",
    email_financeiro: "",
    telefone: "",
    departamento: "",
    ativo: true,
  });
  const [deletingCompradorId, setDeletingCompradorId] = useState<string | null>(null);

  // Modal Interação
  const [interacaoDialogOpen, setInteracaoDialogOpen] = useState(false);
  const [interacaoForm, setInteracaoForm] = useState({
    tipo: "EMAIL" as TipoInteracao,
    resumo: "",
    comprador_id: "",
    pedido_id: "",
  });
  const [deletingInteracaoId, setDeletingInteracaoId] = useState<string | null>(null);
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);

  const handleExportXlsx = async () => {
    setIsExportingXlsx(true);
    try {
      const response = await fetch(`/api/clientes/${cliente.id}/export-xlsx`);
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        toast.error(
          data.error || "Não foi possível exportar a planilha do cliente."
        );
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || "historico-cliente.xlsx";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success("Planilha (.xlsx) exportada com sucesso!");
    } catch {
      toast.error("Erro ao exportar planilha. Tente novamente.");
    } finally {
      setIsExportingXlsx(false);
    }
  };

  // Totais calculados
  const pedidosFaturados = cliente.pedidos.filter((p) =>
    STATUS_FATURADOS.has(p.status)
  );
  const valorAcumulado = pedidosFaturados.reduce(
    (acc, p) => acc + Number(p.valorTotal ?? 0),
    0
  );
  const compradoresAtivos = cliente.compradores.filter((c) => c.ativo).length;

  // Handlers Cliente
  const openEditCliente = () => {
    setClienteForm({
      tipo_pessoa: cliente.tipoPessoa,
      razao_social: cliente.razaoSocial,
      cpf_cnpj: cliente.cpfCnpj ?? "",
      inscricao_estadual: cliente.inscricaoEstadual ?? "",
      data_nascimento: cliente.dataNascimento ?? "",
      origem_indicacao: cliente.origemIndicacao ?? "",
      observacoes: cliente.observacoes ?? "",
    });
    setEditClienteOpen(true);
  };

  const handleSaveCliente = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateClienteAction(cliente.id, {
        ...clienteForm,
        cpf_cnpj: clienteForm.cpf_cnpj || null,
        inscricao_estadual: clienteForm.inscricao_estadual || null,
        data_nascimento:
          clienteForm.tipo_pessoa === "PF"
            ? clienteForm.data_nascimento || null
            : null,
        origem_indicacao: clienteForm.origem_indicacao || null,
        observacoes: clienteForm.observacoes || null,
      });

      if (!result.success) {
        toast.error(result.error ?? "Erro ao atualizar cliente.");
        return;
      }

      toast.success("Dados do cliente atualizados!");
      setEditClienteOpen(false);
      router.refresh();
    });
  };

  const handleDeleteCliente = () => {
    startTransition(async () => {
      const result = await deleteClienteAction(cliente.id);
      if (!result.success) {
        toast.error(result.error ?? "Não foi possível excluir o cliente.");
        setDeleteClienteOpen(false);
        return;
      }
      toast.success("Cliente excluído.");
      router.push("/clientes");
    });
  };

  // Handlers Endereço
  const openNovoEndereco = () => {
    setEditingEnderecoId(null);
    setEnderecoForm({
      tipo: cliente.enderecos.length === 0 ? "FATURAMENTO" : "FILIAL",
      rotulo: cliente.enderecos.length === 0 ? "Matriz" : "",
      cnpj_filial: "",
      ie_filial: "",
      logradouro: "",
      bairro: "",
      cidade: "",
      uf: "SP",
      cep: "",
      principal: cliente.enderecos.length === 0,
    });
    setEnderecoDialogOpen(true);
  };

  const openEditEndereco = (end: ClienteDetalhe["enderecos"][number]) => {
    setEditingEnderecoId(end.id);
    setEnderecoForm({
      tipo: end.tipo,
      rotulo: end.rotulo ?? "",
      cnpj_filial: end.cnpjFilial ?? "",
      ie_filial: end.ieFilial ?? "",
      logradouro: end.logradouro,
      bairro: end.bairro ?? "",
      cidade: end.cidade,
      uf: end.uf.trim(),
      cep: end.cep ?? "",
      principal: end.principal,
    });
    setEnderecoDialogOpen(true);
  };

  const handleSaveEndereco = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveEnderecoAction(
        cliente.id,
        {
          tipo: enderecoForm.tipo,
          rotulo: enderecoForm.rotulo || null,
          cnpj_filial: enderecoForm.cnpj_filial || null,
          ie_filial: enderecoForm.ie_filial || null,
          logradouro: enderecoForm.logradouro,
          bairro: enderecoForm.bairro || null,
          cidade: enderecoForm.cidade,
          uf: enderecoForm.uf,
          cep: enderecoForm.cep || null,
          principal: enderecoForm.principal,
        },
        editingEnderecoId ?? undefined
      );

      if (!result.success) {
        toast.error(result.error ?? "Erro ao salvar endereço.");
        return;
      }

      toast.success(
        editingEnderecoId ? "Endereço atualizado!" : "Endereço adicionado!"
      );
      setEnderecoDialogOpen(false);
      router.refresh();
    });
  };

  const handleDeleteEndereco = () => {
    if (!deletingEnderecoId) return;
    startTransition(async () => {
      const result = await deleteEnderecoAction(cliente.id, deletingEnderecoId);
      if (!result.success) {
        toast.error(result.error ?? "Erro ao excluir endereço.");
        return;
      }
      toast.success("Endereço excluído.");
      setDeletingEnderecoId(null);
      router.refresh();
    });
  };

  // Handlers Comprador
  const openNovoComprador = () => {
    setEditingCompradorId(null);
    setCompradorForm({
      nome: "",
      email: "",
      email_financeiro: "",
      telefone: "",
      departamento: "",
      ativo: true,
    });
    setCompradorDialogOpen(true);
  };

  const openEditComprador = (comp: ClienteDetalhe["compradores"][number]) => {
    setEditingCompradorId(comp.id);
    setCompradorForm({
      nome: comp.nome,
      email: comp.email ?? "",
      email_financeiro: comp.emailFinanceiro ?? "",
      telefone: comp.telefone ?? "",
      departamento: comp.departamento ?? "",
      ativo: comp.ativo,
    });
    setCompradorDialogOpen(true);
  };

  const handleSaveComprador = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveCompradorAction(
        cliente.id,
        {
          nome: compradorForm.nome,
          email: compradorForm.email || null,
          email_financeiro: compradorForm.email_financeiro || null,
          telefone: compradorForm.telefone || null,
          departamento: compradorForm.departamento || null,
          ativo: compradorForm.ativo,
        },
        editingCompradorId ?? undefined
      );

      if (!result.success) {
        toast.error(result.error ?? "Erro ao salvar comprador.");
        return;
      }

      toast.success(
        editingCompradorId ? "Comprador atualizado!" : "Comprador adicionado!"
      );
      setCompradorDialogOpen(false);
      router.refresh();
    });
  };

  const handleDeleteComprador = () => {
    if (!deletingCompradorId) return;
    startTransition(async () => {
      const result = await deleteCompradorAction(
        cliente.id,
        deletingCompradorId
      );
      if (!result.success) {
        toast.error(result.error ?? "Erro ao excluir comprador.");
        return;
      }
      toast.success("Comprador excluído.");
      setDeletingCompradorId(null);
      router.refresh();
    });
  };

  // Handlers Interação
  const openInteracaoDialog = (presetTipo: TipoInteracao = "EMAIL", presetResumo = "") => {
    setInteracaoForm({
      tipo: presetTipo,
      resumo: presetResumo,
      comprador_id: cliente.compradores[0]?.id ?? "",
      pedido_id: "",
    });
    setInteracaoDialogOpen(true);
  };

  const handleQuickEmailEnviado = () => {
    startTransition(async () => {
      const result = await createInteracaoAction(cliente.id, {
        tipo: "EMAIL",
        resumo: "Enviado e-mail comercial / apresentação de catálogo.",
        comprador_id: cliente.compradores[0]?.id ?? null,
        pedido_id: null,
      });
      if (!result.success) {
        toast.error(result.error ?? "Erro ao registrar e-mail.");
        return;
      }
      toast.success("E-mail enviado registrado na linha do tempo!");
      router.refresh();
    });
  };

  const handleSaveInteracao = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createInteracaoAction(cliente.id, {
        tipo: interacaoForm.tipo,
        resumo: interacaoForm.resumo,
        comprador_id: interacaoForm.comprador_id || null,
        pedido_id: interacaoForm.pedido_id || null,
      });

      if (!result.success) {
        toast.error(result.error ?? "Erro ao registrar contato.");
        return;
      }

      toast.success("Contato registrado na linha do tempo!");
      setInteracaoDialogOpen(false);
      router.refresh();
    });
  };

  const handleDeleteInteracao = () => {
    if (!deletingInteracaoId) return;
    startTransition(async () => {
      const result = await deleteInteracaoAction(
        cliente.id,
        deletingInteracaoId
      );
      if (!result.success) {
        toast.error(result.error ?? "Erro ao excluir registro.");
        return;
      }
      toast.success("Registro de contato removido.");
      setDeletingInteracaoId(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/clientes">
            <ArrowLeft className="size-4" />
            Voltar para Clientes
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={openEditCliente}>
            <Pencil className="size-3.5" />
            Editar Dados
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteClienteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Cabeçalho da Ficha do Cliente */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-2xl">
                {cliente.tipoPessoa === "PJ" ? (
                  <Building2 className="size-6" />
                ) : (
                  <Tractor className="size-6" />
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {cliente.razaoSocial}
                  </h2>
                  <Badge variant="secondary">
                    {TIPO_PESSOA_LABELS[cliente.tipoPessoa]}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                  {cliente.cpfCnpj ? (
                    <span className="tabular-nums">
                      <strong>{cliente.tipoPessoa === "PJ" ? "CNPJ:" : "CPF:"}</strong>{" "}
                      {formatCpfCnpj(cliente.cpfCnpj)}
                    </span>
                  ) : null}
                  {cliente.inscricaoEstadual ? (
                    <span>
                      <strong>IE:</strong> {cliente.inscricaoEstadual}
                    </span>
                  ) : null}
                  {cliente.tipoPessoa === "PF" && cliente.dataNascimento ? (
                    <span>
                      <strong>Nascimento:</strong>{" "}
                      {formatDateBR(cliente.dataNascimento)}
                    </span>
                  ) : null}
                </div>

                {cliente.origemIndicacao ? (
                  <p className="text-sm text-primary">
                    <strong>Origem / Indicação:</strong> {cliente.origemIndicacao}
                  </p>
                ) : null}

                {cliente.observacoes ? (
                  <p className="pt-1 text-sm text-muted-foreground">
                    {cliente.observacoes}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" className="font-semibold">
                <Link href={`/pedidos/novo?clienteId=${cliente.id}`}>
                  <Plus className="size-4" />
                  Novo Orçamento
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="font-semibold">
                <Link href={`/pedidos/novo?modo=pedido&clienteId=${cliente.id}`}>
                  <ClipboardList className="size-4" />
                  Lançar Pedido
                </Link>
              </Button>
            </div>
          </div>

          {/* KPIs da ficha */}
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:grid-cols-4">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Total vendido</p>
              <p className="mt-1 text-lg font-bold text-foreground tabular-nums">
                {formatCurrencyBRL(valorAcumulado)}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Pedidos fechados</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {pedidosFaturados.length}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Compradores ativos</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {compradoresAtivos}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Endereços / Filiais</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {cliente.enderecos.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas da Ficha */}
      <Tabs defaultValue="historico">
        <TabsList>
          <TabsTrigger value="historico">
            <ClipboardList className="size-4" />
            Histórico de Pedidos ({cliente.pedidos.length})
          </TabsTrigger>
          <TabsTrigger value="compradores">
            <Users className="size-4" />
            Compradores ({cliente.compradores.length})
          </TabsTrigger>
          <TabsTrigger value="enderecos">
            <MapPin className="size-4" />
            Endereços / Filiais ({cliente.enderecos.length})
          </TabsTrigger>
          <TabsTrigger value="interacoes">
            <Mail className="size-4" />
            Linha do Tempo ({cliente.interacoes.length})
          </TabsTrigger>
        </TabsList>

        {/* Aba 1: Histórico de Pedidos */}
        <TabsContent value="historico">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Histórico de Pedidos e Orçamentos</CardTitle>
                <CardDescription>
                  Substitui a planilha individual deste cliente com soma automática.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isExportingXlsx}
                  onClick={handleExportXlsx}
                  className="font-semibold"
                >
                  {isExportingXlsx ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="size-4 text-primary" />
                  )}
                  {isExportingXlsx
                    ? "Gerando planilha..."
                    : "Exportar Planilha (.xlsx)"}
                </Button>
                <div className="rounded-xl bg-primary/10 px-4 py-2 text-right">
                  <p className="text-xs font-medium text-primary">Soma acumulada (fechados)</p>
                  <p className="text-base font-bold text-primary tabular-nums">
                    {formatCurrencyBRL(valorAcumulado)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {cliente.pedidos.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Nenhum orçamento ou pedido ainda"
                  description="Os orçamentos e pedidos criados para este cliente aparecerão aqui automaticamente."
                  action={
                    <Button asChild>
                      <Link href={`/pedidos/novo?clienteId=${cliente.id}`}>
                        <Plus className="size-4" />
                        Criar Primeiro Orçamento
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº / Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Fabricante</TableHead>
                      <TableHead>Comprador</TableHead>
                      <TableHead>Feira / Evento</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cliente.pedidos.map((pedido) => {
                      const meta = STATUS_PEDIDO_META[pedido.status];
                      return (
                        <TableRow key={pedido.id}>
                          <TableCell className="font-semibold">
                            {pedido.numeroPedido
                              ? `Pedido ${pedido.numeroPedido}`
                              : "Orçamento"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                          </TableCell>
                          <TableCell>{pedido.fornecedor?.nome ?? "—"}</TableCell>
                          <TableCell>{pedido.comprador?.nome ?? "—"}</TableCell>
                          <TableCell>{pedido.eventoFeira ?? "—"}</TableCell>
                          <TableCell className="tabular-nums">
                            {formatDateBR(pedido.dataPedido ?? pedido.dataOrcamento)}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatCurrencyBRL(pedido.valorTotal)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/pedidos/${pedido.id}`}>Abrir</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 2: Compradores */}
        <TabsContent value="compradores">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Compradores e Contatos</CardTitle>
                <CardDescription>
                  Cadastre todos os compradores ativos, telefones e e-mails do financeiro.
                </CardDescription>
              </div>
              <Button type="button" onClick={openNovoComprador}>
                <Plus className="size-4" />
                Adicionar Comprador
              </Button>
            </CardHeader>
            <CardContent>
              {cliente.compradores.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Nenhum comprador cadastrado"
                  description="Adicione os compradores desta empresa para selecionar facilmente nos orçamentos e pedidos."
                  action={
                    <Button type="button" onClick={openNovoComprador}>
                      <Plus className="size-4" />
                      Adicionar Primeiro Comprador
                    </Button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {cliente.compradores.map((comp) => (
                    <div
                      key={comp.id}
                      className="flex flex-col justify-between rounded-xl border border-border bg-background/60 p-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-foreground">
                              {comp.nome}
                            </h4>
                            {comp.departamento ? (
                              <p className="text-xs text-muted-foreground">
                                {comp.departamento}
                              </p>
                            ) : null}
                          </div>
                          <Badge variant={comp.ativo ? "success" : "outline"}>
                            {comp.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground">
                          {comp.email ? (
                            <p className="flex items-center gap-2">
                              <Mail className="size-3.5 shrink-0" />
                              <span className="truncate">{comp.email}</span>
                            </p>
                          ) : null}
                          {comp.emailFinanceiro ? (
                            <p className="flex items-center gap-2 text-xs">
                              <Mail className="size-3.5 shrink-0 text-primary" />
                              <span className="truncate">
                                <strong>Financeiro:</strong> {comp.emailFinanceiro}
                              </span>
                            </p>
                          ) : null}
                          {comp.telefone ? (
                            <p className="flex items-center gap-2">
                              <Phone className="size-3.5 shrink-0" />
                              <span>{formatTelefone(comp.telefone)}</span>
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditComprador(comp)}
                        >
                          <Pencil className="size-3.5" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeletingCompradorId(comp.id)}
                        >
                          <Trash2 className="size-3.5" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 3: Endereços / Filiais */}
        <TabsContent value="enderecos">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Endereços e Filiais</CardTitle>
                <CardDescription>
                  Matriz, filiais com CNPJ/IE próprios e endereços separados de entrega.
                </CardDescription>
              </div>
              <Button type="button" onClick={openNovoEndereco}>
                <Plus className="size-4" />
                Adicionar Endereço / Filial
              </Button>
            </CardHeader>
            <CardContent>
              {cliente.enderecos.length === 0 ? (
                <EmptyState
                  icon={MapPin}
                  title="Nenhum endereço cadastrado"
                  description="Cadastre o endereço da matriz, filiais ou locais de entrega frequentes."
                  action={
                    <Button type="button" onClick={openNovoEndereco}>
                      <Plus className="size-4" />
                      Adicionar Endereço
                    </Button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {cliente.enderecos.map((end) => (
                    <div
                      key={end.id}
                      className="flex flex-col justify-between rounded-xl border border-border bg-background/60 p-4"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold text-foreground">
                            {end.rotulo || TIPO_ENDERECO_LABELS[end.tipo]}
                          </h4>
                          <Badge variant="outline">
                            {TIPO_ENDERECO_LABELS[end.tipo]}
                          </Badge>
                          {end.principal ? (
                            <Badge variant="success" className="gap-1">
                              <Star className="size-3" />
                              Principal
                            </Badge>
                          ) : null}
                        </div>

                        <p className="text-sm text-foreground">{end.logradouro}</p>
                        <p className="text-sm text-muted-foreground">
                          {[end.bairro, `${end.cidade}/${end.uf.trim()}`]
                            .filter(Boolean)
                            .join(" — ")}
                          {end.cep ? ` • CEP ${formatCep(end.cep)}` : ""}
                        </p>

                        {end.cnpjFilial || end.ieFilial ? (
                          <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                            {end.cnpjFilial ? (
                              <p>
                                <strong>CNPJ da unidade:</strong>{" "}
                                {formatCpfCnpj(end.cnpjFilial)}
                              </p>
                            ) : null}
                            {end.ieFilial ? (
                              <p>
                                <strong>IE da unidade:</strong> {end.ieFilial}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditEndereco(end)}
                        >
                          <Pencil className="size-3.5" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeletingEnderecoId(end.id)}
                        >
                          <Trash2 className="size-3.5" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 4: Linha do Tempo de Contatos */}
        <TabsContent value="interacoes">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Linha do Tempo de Contatos</CardTitle>
                <CardDescription>
                  Registre e-mails enviados, mensagens de WhatsApp, ligações e retornos.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={handleQuickEmailEnviado}
                >
                  <Send className="size-4" />
                  Registrar E-mail Enviado
                </Button>
                <Button
                  type="button"
                  onClick={() => openInteracaoDialog("EMAIL")}
                >
                  <MessageSquarePlus className="size-4" />
                  Novo Contato / Anotação
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {cliente.interacoes.length === 0 ? (
                <EmptyState
                  icon={Mail}
                  title="Nenhum contato registrado ainda"
                  description="Use o botão acima para anotar e-mails enviados, conversas no WhatsApp ou ligações com este cliente."
                />
              ) : (
                <div className="space-y-3">
                  {cliente.interacoes.map((inter) => (
                    <div
                      key={inter.id}
                      className="flex items-start justify-between gap-4 rounded-xl border border-border bg-background/60 p-4"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">
                            {TIPO_INTERACAO_LABELS[inter.tipo]}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                            <Calendar className="size-3" />
                            {formatDateTimeBR(inter.dataInteracao)}
                          </span>
                          {inter.comprador ? (
                            <span className="text-xs text-muted-foreground">
                              • Comprador: <strong>{inter.comprador.nome}</strong>
                            </span>
                          ) : null}
                          {inter.pedido ? (
                            <Link
                              href={`/pedidos/${inter.pedido.id}`}
                              className="text-xs font-medium text-primary hover:underline"
                            >
                              •{" "}
                              {inter.pedido.numeroPedido
                                ? `Pedido ${inter.pedido.numeroPedido}`
                                : "Orçamento vinculado"}
                            </Link>
                          ) : null}
                        </div>
                        <p className="text-sm text-foreground">{inter.resumo}</p>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label="Excluir registro de contato"
                        onClick={() => setDeletingInteracaoId(inter.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Editar Cliente */}
      <Dialog open={editClienteOpen} onOpenChange={setEditClienteOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Dados do Cliente</DialogTitle>
            <DialogDescription>
              Atualize os dados cadastrais da empresa ou produtor rural.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveCliente} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-tipo">Tipo de Cliente</Label>
              <Select
                id="edit-tipo"
                value={clienteForm.tipo_pessoa}
                onChange={(e) =>
                  setClienteForm((prev) => ({
                    ...prev,
                    tipo_pessoa: e.target.value as TipoPessoa,
                  }))
                }
              >
                <option value="PJ">{TIPO_PESSOA_LABELS.PJ}</option>
                <option value="PF">{TIPO_PESSOA_LABELS.PF}</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-razao">
                {clienteForm.tipo_pessoa === "PJ" ? "Razão Social *" : "Nome Completo *"}
              </Label>
              <Input
                id="edit-razao"
                value={clienteForm.razao_social}
                onChange={(e) =>
                  setClienteForm((prev) => ({
                    ...prev,
                    razao_social: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-doc">
                  {clienteForm.tipo_pessoa === "PJ" ? "CNPJ" : "CPF"}
                </Label>
                <Input
                  id="edit-doc"
                  value={clienteForm.cpf_cnpj}
                  onChange={(e) =>
                    setClienteForm((prev) => ({
                      ...prev,
                      cpf_cnpj: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-ie">Inscrição Estadual</Label>
                <Input
                  id="edit-ie"
                  value={clienteForm.inscricao_estadual}
                  onChange={(e) =>
                    setClienteForm((prev) => ({
                      ...prev,
                      inscricao_estadual: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {clienteForm.tipo_pessoa === "PF" ? (
              <div className="space-y-1.5">
                <Label htmlFor="edit-nasc">Data de Nascimento</Label>
                <Input
                  id="edit-nasc"
                  type="date"
                  value={clienteForm.data_nascimento}
                  onChange={(e) =>
                    setClienteForm((prev) => ({
                      ...prev,
                      data_nascimento: e.target.value,
                    }))
                  }
                />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="edit-origem">Origem / Indicação</Label>
              <Input
                id="edit-origem"
                value={clienteForm.origem_indicacao}
                onChange={(e) =>
                  setClienteForm((prev) => ({
                    ...prev,
                    origem_indicacao: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-obs">Observações</Label>
              <Textarea
                id="edit-obs"
                value={clienteForm.observacoes}
                onChange={(e) =>
                  setClienteForm((prev) => ({
                    ...prev,
                    observacoes: e.target.value,
                  }))
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditClienteOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Endereço / Filial */}
      <Dialog open={enderecoDialogOpen} onOpenChange={setEnderecoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEnderecoId ? "Editar Endereço / Filial" : "Novo Endereço / Filial"}
            </DialogTitle>
            <DialogDescription>
              Use para cadastrar a matriz, filiais com CNPJ próprio ou locais de entrega.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEndereco} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="end-tipo">Tipo</Label>
                <Select
                  id="end-tipo"
                  value={enderecoForm.tipo}
                  onChange={(e) =>
                    setEnderecoForm((prev) => ({
                      ...prev,
                      tipo: e.target.value as TipoEndereco,
                    }))
                  }
                >
                  <option value="FATURAMENTO">
                    {TIPO_ENDERECO_LABELS.FATURAMENTO}
                  </option>
                  <option value="FILIAL">{TIPO_ENDERECO_LABELS.FILIAL}</option>
                  <option value="ENTREGA">{TIPO_ENDERECO_LABELS.ENTREGA}</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-rotulo-modal">Nome / Rótulo</Label>
                <Input
                  id="end-rotulo-modal"
                  placeholder="Ex.: Matriz, Filial Piracaia"
                  value={enderecoForm.rotulo}
                  onChange={(e) =>
                    setEnderecoForm((prev) => ({ ...prev, rotulo: e.target.value }))
                  }
                />
              </div>
            </div>

            {enderecoForm.tipo === "FILIAL" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="end-cnpj-filial">CNPJ da Filial (se diferente)</Label>
                  <Input
                    id="end-cnpj-filial"
                    placeholder="00.000.000/0000-00"
                    value={enderecoForm.cnpj_filial}
                    onChange={(e) =>
                      setEnderecoForm((prev) => ({
                        ...prev,
                        cnpj_filial: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end-ie-filial">IE da Filial</Label>
                  <Input
                    id="end-ie-filial"
                    value={enderecoForm.ie_filial}
                    onChange={(e) =>
                      setEnderecoForm((prev) => ({
                        ...prev,
                        ie_filial: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="end-logradouro-modal">Endereço *</Label>
              <Input
                id="end-logradouro-modal"
                placeholder="Rua, número e complemento"
                value={enderecoForm.logradouro}
                onChange={(e) =>
                  setEnderecoForm((prev) => ({
                    ...prev,
                    logradouro: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="end-bairro-modal">Bairro</Label>
                <Input
                  id="end-bairro-modal"
                  value={enderecoForm.bairro}
                  onChange={(e) =>
                    setEnderecoForm((prev) => ({ ...prev, bairro: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-cep-modal">CEP</Label>
                <Input
                  id="end-cep-modal"
                  placeholder="00000-000"
                  value={enderecoForm.cep}
                  onChange={(e) =>
                    setEnderecoForm((prev) => ({ ...prev, cep: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="end-cidade-modal">Cidade *</Label>
                <Input
                  id="end-cidade-modal"
                  value={enderecoForm.cidade}
                  onChange={(e) =>
                    setEnderecoForm((prev) => ({ ...prev, cidade: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-uf-modal">UF *</Label>
                <Select
                  id="end-uf-modal"
                  value={enderecoForm.uf}
                  onChange={(e) =>
                    setEnderecoForm((prev) => ({ ...prev, uf: e.target.value }))
                  }
                >
                  {UF_LIST.map((sigla) => (
                    <option key={sigla} value={sigla}>
                      {sigla}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <Checkbox
                checked={enderecoForm.principal}
                onChange={(e) =>
                  setEnderecoForm((prev) => ({
                    ...prev,
                    principal: e.target.checked,
                  }))
                }
              />
              Definir como endereço principal deste cliente
            </label>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEnderecoDialogOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Salvar Endereço
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Comprador */}
      <Dialog open={compradorDialogOpen} onOpenChange={setCompradorDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCompradorId ? "Editar Comprador" : "Novo Comprador"}
            </DialogTitle>
            <DialogDescription>
              Cadastre os dados de contato do comprador e o e-mail do departamento
              financeiro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveComprador} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="comp-nome-modal">Nome *</Label>
                <Input
                  id="comp-nome-modal"
                  value={compradorForm.nome}
                  onChange={(e) =>
                    setCompradorForm((prev) => ({ ...prev, nome: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comp-depto-modal">Departamento</Label>
                <Input
                  id="comp-depto-modal"
                  placeholder="Ex.: Compras, Marketing"
                  value={compradorForm.departamento}
                  onChange={(e) =>
                    setCompradorForm((prev) => ({
                      ...prev,
                      departamento: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comp-email-modal">E-mail do Comprador</Label>
              <Input
                id="comp-email-modal"
                type="email"
                value={compradorForm.email}
                onChange={(e) =>
                  setCompradorForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="comp-email-fin-modal">E-mail Financeiro</Label>
                <Input
                  id="comp-email-fin-modal"
                  type="email"
                  value={compradorForm.email_financeiro}
                  onChange={(e) =>
                    setCompradorForm((prev) => ({
                      ...prev,
                      email_financeiro: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comp-fone-modal">Telefone / WhatsApp</Label>
                <Input
                  id="comp-fone-modal"
                  value={compradorForm.telefone}
                  onChange={(e) =>
                    setCompradorForm((prev) => ({
                      ...prev,
                      telefone: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <Checkbox
                checked={compradorForm.ativo}
                onChange={(e) =>
                  setCompradorForm((prev) => ({ ...prev, ativo: e.target.checked }))
                }
              />
              Comprador ativo (aparece primeiro nos novos pedidos)
            </label>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCompradorDialogOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Salvar Comprador
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Interação */}
      <Dialog open={interacaoDialogOpen} onOpenChange={setInteracaoDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Contato na Linha do Tempo</DialogTitle>
            <DialogDescription>
              Anote e-mails enviados, conversas no WhatsApp, ligações ou retornos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveInteracao} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="inter-tipo">Tipo de Contato</Label>
                <Select
                  id="inter-tipo"
                  value={interacaoForm.tipo}
                  onChange={(e) =>
                    setInteracaoForm((prev) => ({
                      ...prev,
                      tipo: e.target.value as TipoInteracao,
                    }))
                  }
                >
                  {(Object.keys(TIPO_INTERACAO_LABELS) as TipoInteracao[]).map(
                    (tipo) => (
                      <option key={tipo} value={tipo}>
                        {TIPO_INTERACAO_LABELS[tipo]}
                      </option>
                    )
                  )}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inter-comprador">Comprador (opcional)</Label>
                <Select
                  id="inter-comprador"
                  value={interacaoForm.comprador_id}
                  onChange={(e) =>
                    setInteracaoForm((prev) => ({
                      ...prev,
                      comprador_id: e.target.value,
                    }))
                  }
                >
                  <option value="">Nenhum específico</option>
                  {cliente.compradores.map((comp) => (
                    <option key={comp.id} value={comp.id}>
                      {comp.nome}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {cliente.pedidos.length > 0 ? (
              <div className="space-y-1.5">
                <Label htmlFor="inter-pedido">
                  Vincular a um Orçamento / Pedido (opcional)
                </Label>
                <Select
                  id="inter-pedido"
                  value={interacaoForm.pedido_id}
                  onChange={(e) =>
                    setInteracaoForm((prev) => ({
                      ...prev,
                      pedido_id: e.target.value,
                    }))
                  }
                >
                  <option value="">Sem vínculo</option>
                  {cliente.pedidos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.numeroPedido
                        ? `Pedido ${p.numeroPedido}`
                        : `Orçamento (${formatDateBR(p.dataOrcamento)})`}{" "}
                      — {formatCurrencyBRL(p.valorTotal)}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="inter-resumo">Resumo do Contato *</Label>
              <Textarea
                id="inter-resumo"
                placeholder="Ex.: Enviado e-mail com tabela de bonés para a Agrishow; cliente pediu retorno na terça."
                value={interacaoForm.resumo}
                onChange={(e) =>
                  setInteracaoForm((prev) => ({ ...prev, resumo: e.target.value }))
                }
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInteracaoDialogOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Salvar Contato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmações de Exclusão */}
      <ConfirmDialog
        open={deleteClienteOpen}
        onOpenChange={setDeleteClienteOpen}
        title="Excluir cliente?"
        description={`Tem certeza que deseja excluir "${cliente.razaoSocial}"? Seus endereços, compradores e histórico de contatos também serão removidos.`}
        confirmLabel="Sim, excluir cliente"
        loading={isPending}
        onConfirm={handleDeleteCliente}
      />

      <ConfirmDialog
        open={Boolean(deletingEnderecoId)}
        onOpenChange={(open) => {
          if (!open) setDeletingEnderecoId(null);
        }}
        title="Excluir endereço?"
        description="Tem certeza que deseja remover este endereço/filial do cadastro?"
        confirmLabel="Sim, excluir"
        loading={isPending}
        onConfirm={handleDeleteEndereco}
      />

      <ConfirmDialog
        open={Boolean(deletingCompradorId)}
        onOpenChange={(open) => {
          if (!open) setDeletingCompradorId(null);
        }}
        title="Excluir comprador?"
        description="Tem certeza que deseja remover este comprador? Pedidos anteriores continuarão salvos normalmente."
        confirmLabel="Sim, excluir"
        loading={isPending}
        onConfirm={handleDeleteComprador}
      />

      <ConfirmDialog
        open={Boolean(deletingInteracaoId)}
        onOpenChange={(open) => {
          if (!open) setDeletingInteracaoId(null);
        }}
        title="Excluir registro de contato?"
        description="Tem certeza que deseja apagar esta anotação da linha do tempo?"
        confirmLabel="Sim, excluir"
        loading={isPending}
        onConfirm={handleDeleteInteracao}
      />
    </div>
  );
}
