"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Factory,
  ImageIcon,
  Loader2,
  Plus,
  Ruler,
  Save,
  Search,
  Sparkles,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import type {
  PedidoDetalhe,
  PedidoFormOptions,
} from "@/lib/services/pedidos";
import {
  FEIRAS_AGRO_COMUNS,
  FORMA_PAGAMENTO_LABELS,
  STATUS_PEDIDO_META,
  TEMPLATE_PDF_LABELS,
  type FormaPagamento,
  type StatusPedido,
} from "@/lib/constants";
import {
  formatCpfCnpj,
  formatCurrencyBRL,
  formatSuggestedPedidoNumero,
  getTodayIsoDate,
  onlyDigits,
  roundMoney,
} from "@/lib/formatters";
import {
  calcularTotaisPedido,
  criarGradeVazia,
  somarGradeTamanhos,
  type GradeTamanhos,
} from "@/lib/validators/pedido";
import {
  createPedidoAction,
  updatePedidoAction,
} from "@/app/(dashboard)/pedidos/actions";
import { GradeTamanhosEditor } from "@/components/pedidos/grade-tamanhos-editor";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ItemDraft {
  key: string;
  descricao_tecnica: string;
  quantidade: string;
  valor_unitario: string;
  usar_grade: boolean;
  grade_tamanhos: GradeTamanhos;
}

interface PedidoFormProps {
  options: PedidoFormOptions;
  initialModo?: "orcamento" | "pedido";
  initialClienteId?: string;
  editingPedido?: PedidoDetalhe;
}

function makeItemKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createEmptyItem(usarGrade = false): ItemDraft {
  return {
    key: makeItemKey(),
    descricao_tecnica: "",
    quantidade: "1",
    valor_unitario: "0",
    usar_grade: usarGrade,
    grade_tamanhos: criarGradeVazia("UNISSEX"),
  };
}

function formatEnderecoOption(end: {
  rotulo: string | null;
  logradouro: string;
  cidade: string;
  uf: string;
  principal: boolean;
}): string {
  const prefix = end.rotulo ? `${end.rotulo} — ` : "";
  const suffix = end.principal ? " (Principal)" : "";
  return `${prefix}${end.logradouro}, ${end.cidade}/${end.uf.trim()}${suffix}`;
}

export function PedidoForm({
  options,
  initialModo = "orcamento",
  initialClienteId,
  editingPedido,
}: PedidoFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const isEditing = Boolean(editingPedido);
  const initialSelectedClienteId =
    editingPedido?.clienteId ??
    (initialClienteId &&
    options.clientes.some((c) => c.id === initialClienteId)
      ? initialClienteId
      : "");

  const initialClienteObj = options.clientes.find(
    (c) => c.id === initialSelectedClienteId
  );

  // Busca de cliente
  const [buscaCliente, setBuscaCliente] = useState("");
  const [clienteId, setClienteId] = useState(initialSelectedClienteId);
  const [compradorId, setCompradorId] = useState(
    editingPedido?.compradorId ??
      (initialClienteObj?.compradores.filter((c) => c.ativo).length === 1
        ? initialClienteObj.compradores.find((c) => c.ativo)?.id ?? ""
        : "")
  );
  const [enderecoFaturamentoId, setEnderecoFaturamentoId] = useState(
    editingPedido?.enderecoFaturamentoId ??
      initialClienteObj?.enderecos.find((e) => e.principal)?.id ??
      initialClienteObj?.enderecos[0]?.id ??
      ""
  );
  const [entregaMesmoFaturamento, setEntregaMesmoFaturamento] = useState(
    editingPedido ? editingPedido.entregaMesmoFaturamento : true
  );
  const [enderecoEntregaId, setEnderecoEntregaId] = useState(
    editingPedido?.enderecoEntregaId ?? ""
  );
  const [acEntrega, setAcEntrega] = useState(editingPedido?.acEntrega ?? "");

  // Fabricante, status, datas, pagamento
  const [fornecedorId, setFornecedorId] = useState(
    editingPedido?.fornecedorId ?? ""
  );
  const [status, setStatus] = useState<StatusPedido>(
    editingPedido?.status ??
      (initialModo === "pedido" ? "APROVADO" : "ORCAMENTO_RASCUNHO")
  );
  const [numeroPedido, setNumeroPedido] = useState(
    editingPedido?.numeroPedido ?? ""
  );
  const [atualizarProximoNumero, setAtualizarProximoNumero] = useState(
    !isEditing && initialModo === "pedido"
  );
  const [vendedor, setVendedor] = useState(editingPedido?.vendedor ?? "Flavio");
  const [eventoFeira, setEventoFeira] = useState(
    editingPedido?.eventoFeira ?? ""
  );
  const [condicaoPagamento, setCondicaoPagamento] = useState(
    editingPedido?.condicaoPagamento ?? ""
  );
  const [formaPagamento, setFormaPagamento] = useState<string>(
    editingPedido?.formaPagamento ?? ""
  );
  const [ordemCompra, setOrdemCompra] = useState(
    editingPedido?.ordemCompra ?? ""
  );
  const [dataOrcamento, setDataOrcamento] = useState(
    editingPedido?.dataOrcamento ?? getTodayIsoDate()
  );
  const [dataPedido, setDataPedido] = useState(
    editingPedido?.dataPedido ??
      (initialModo === "pedido" ? getTodayIsoDate() : "")
  );
  const [proximoFollowup, setProximoFollowup] = useState(
    editingPedido?.proximoFollowup ?? ""
  );
  const [prazoEntregaDias, setPrazoEntregaDias] = useState(
    editingPedido?.prazoEntregaDias
      ? String(editingPedido.prazoEntregaDias)
      : ""
  );
  const [dataSaidaFabrica, setDataSaidaFabrica] = useState(
    editingPedido?.dataSaidaFabrica ?? ""
  );
  const [dataEntregaCliente, setDataEntregaCliente] = useState(
    editingPedido?.dataEntregaCliente ?? ""
  );

  // Itens e desconto
  const [itens, setItens] = useState<ItemDraft[]>(() => {
    if (editingPedido && editingPedido.itens.length > 0) {
      return editingPedido.itens.map((item) => ({
        key: item.id,
        descricao_tecnica: item.descricaoTecnica,
        quantidade: String(item.quantidade),
        valor_unitario: String(Number(item.valorUnitario)),
        usar_grade: Boolean(item.gradeTamanhos),
        grade_tamanhos: item.gradeTamanhos ?? criarGradeVazia("UNISSEX"),
      }));
    }
    return [createEmptyItem(false)];
  });
  const [desconto, setDesconto] = useState(
    editingPedido ? String(Number(editingPedido.desconto)) : "0"
  );

  // Observações
  const [obsNotaFiscal, setObsNotaFiscal] = useState(
    editingPedido?.obsNotaFiscal ?? ""
  );
  const [observacoes, setObservacoes] = useState(
    editingPedido?.observacoes ?? ""
  );
  const [ocorrencias, setOcorrencias] = useState(
    editingPedido?.ocorrencias ?? ""
  );

  const selectedCliente = useMemo(
    () => options.clientes.find((c) => c.id === clienteId) ?? null,
    [options.clientes, clienteId]
  );

  const selectedFornecedor = useMemo(
    () => options.fornecedores.find((f) => f.id === fornecedorId) ?? null,
    [options.fornecedores, fornecedorId]
  );

  const clientesFiltrados = useMemo(() => {
    const termo = buscaCliente.trim().toLowerCase();
    const digitos = onlyDigits(termo);
    if (!termo) return options.clientes;
    return options.clientes.filter((c) => {
      if (c.razaoSocial.toLowerCase().includes(termo)) return true;
      if (c.cpfCnpj) {
        if (c.cpfCnpj.toLowerCase().includes(termo)) return true;
        if (digitos && onlyDigits(c.cpfCnpj).includes(digitos)) return true;
      }
      return false;
    });
  }, [options.clientes, buscaCliente]);

  const numeroSugeridoFornecedor = formatSuggestedPedidoNumero(
    selectedFornecedor?.proximoNumeroPedido,
    selectedFornecedor?.templatePdf
  );

  // Totais em tempo real
  const totaisAoVivo = useMemo(() => {
    const parsedItens = itens.map((it) => ({
      quantidade: Math.max(0, Math.floor(Number(it.quantidade) || 0)),
      valor_unitario: Math.max(0, Number(it.valor_unitario.replace(",", ".")) || 0),
    }));
    const parsedDesconto = Math.max(
      0,
      Number(desconto.replace(",", ".")) || 0
    );
    return calcularTotaisPedido(parsedItens, parsedDesconto);
  }, [itens, desconto]);

  const handleSelectCliente = (nextId: string) => {
    setClienteId(nextId);
    const cliente = options.clientes.find((c) => c.id === nextId);
    if (!cliente) {
      setCompradorId("");
      setEnderecoFaturamentoId("");
      setEnderecoEntregaId("");
      return;
    }

    const ativos = cliente.compradores.filter((c) => c.ativo);
    setCompradorId(ativos.length === 1 ? ativos[0].id : "");

    const principal =
      cliente.enderecos.find((e) => e.principal) ?? cliente.enderecos[0];
    setEnderecoFaturamentoId(principal?.id ?? "");
    setEnderecoEntregaId("");
  };

  const handleSelectFornecedor = (nextId: string) => {
    setFornecedorId(nextId);
    const forn = options.fornecedores.find((f) => f.id === nextId);
    if (!forn) return;

    // Se ainda não tem número preenchido e já está em modo pedido (ou status aprovado+), sugere automaticamente
    const sugerido = formatSuggestedPedidoNumero(
      forn.proximoNumeroPedido,
      forn.templatePdf
    );
    if (
      sugerido &&
      !numeroPedido.trim() &&
      !["ORCAMENTO_RASCUNHO", "AGUARDANDO_FORNECEDOR", "ORCAMENTO_ENVIADO"].includes(
        status
      )
    ) {
      setNumeroPedido(sugerido);
      setAtualizarProximoNumero(true);
    }

    // Se fabricante for CONFECCAO_GRADE e o primeiro item ainda estiver vazio, ativa grade automaticamente!
    if (forn.templatePdf === "CONFECCAO_GRADE") {
      setItens((prev) =>
        prev.map((item, idx) =>
          idx === 0 && !item.descricao_tecnica.trim() && !item.usar_grade
            ? { ...item, usar_grade: true }
            : item
        )
      );
    }
  };

  const updateItem = (
    key: string,
    updater: (prev: ItemDraft) => ItemDraft
  ) => {
    setItens((prev) => prev.map((it) => (it.key === key ? updater(it) : it)));
  };

  const handleAddItem = () => {
    const isConfeccao = selectedFornecedor?.templatePdf === "CONFECCAO_GRADE";
    setItens((prev) => [...prev, createEmptyItem(isConfeccao)]);
  };

  const handleRemoveItem = (key: string) => {
    setItens((prev) => (prev.length > 1 ? prev.filter((it) => it.key !== key) : prev));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!clienteId) {
      setFormError("Selecione um cliente para continuar.");
      return;
    }

    const parsedItens = [];
    for (let i = 0; i < itens.length; i++) {
      const it = itens[i];
      const qtd = Number(it.quantidade);
      const unit = roundMoney(Number(it.valor_unitario.replace(",", ".")) || 0);

      if (!it.descricao_tecnica.trim()) {
        setFormError(`Informe a descrição técnica do item ${i + 1}.`);
        return;
      }
      if (!Number.isInteger(qtd) || qtd <= 0) {
        setFormError(
          `A quantidade do item ${i + 1} deve ser um número inteiro maior que zero.`
        );
        return;
      }

      if (it.usar_grade) {
        const somaGrade = somarGradeTamanhos(it.grade_tamanhos);
        if (somaGrade !== qtd) {
          setFormError(
            `No item ${i + 1}, a soma da grade (${somaGrade}) precisa ser igual à quantidade (${qtd}).`
          );
          return;
        }
      }

      parsedItens.push({
        descricao_tecnica: it.descricao_tecnica.trim(),
        quantidade: qtd,
        valor_unitario: unit,
        grade_tamanhos: it.usar_grade ? it.grade_tamanhos : null,
        ordem: i + 1,
      });
    }

    const parsedDesconto = roundMoney(
      Number(desconto.replace(",", ".")) || 0
    );
    const trimmedPrazo = prazoEntregaDias.trim();
    const parsedPrazo = trimmedPrazo ? Number(trimmedPrazo) : null;

    if (
      parsedPrazo !== null &&
      (!Number.isInteger(parsedPrazo) || parsedPrazo <= 0)
    ) {
      setFormError("O prazo de entrega deve ser um número inteiro de dias.");
      return;
    }

    const payload = {
      numero_pedido: numeroPedido.trim() || null,
      cliente_id: clienteId,
      comprador_id: compradorId || null,
      fornecedor_id: fornecedorId || null,
      endereco_faturamento_id: enderecoFaturamentoId || null,
      endereco_entrega_id: entregaMesmoFaturamento
        ? null
        : enderecoEntregaId || null,
      entrega_mesmo_faturamento: entregaMesmoFaturamento,
      ac_entrega: acEntrega.trim() || null,
      vendedor: vendedor.trim() || "Flavio",
      status,
      condicao_pagamento: condicaoPagamento.trim() || null,
      forma_pagamento: (formaPagamento || null) as FormaPagamento | null,
      ordem_compra: ordemCompra.trim() || null,
      data_orcamento: dataOrcamento || null,
      data_pedido: dataPedido || null,
      proximo_followup: proximoFollowup || null,
      prazo_entrega_dias: parsedPrazo,
      data_saida_fabrica: dataSaidaFabrica || null,
      data_entrega_cliente: dataEntregaCliente || null,
      desconto: parsedDesconto,
      evento_feira: eventoFeira.trim() || null,
      obs_nota_fiscal: obsNotaFiscal.trim() || null,
      observacoes: observacoes.trim() || null,
      ocorrencias: ocorrencias.trim() || null,
      itens: parsedItens,
      atualizar_proximo_numero: atualizarProximoNumero,
    };

    startTransition(async () => {
      const result = editingPedido
        ? await updatePedidoAction(editingPedido.id, payload)
        : await createPedidoAction(payload);

      if (!result.success || !result.data) {
        setFormError(result.error ?? "Não foi possível salvar.");
        return;
      }

      toast.success(
        editingPedido
          ? "Alterações salvas com sucesso!"
          : initialModo === "pedido"
            ? "Pedido salvo com sucesso!"
            : "Orçamento salvo com sucesso!"
      );
      router.push(`/pedidos/${result.data.id}`);
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={editingPedido ? `/pedidos/${editingPedido.id}` : "/pedidos"}>
            <ArrowLeft className="size-4" />
            {editingPedido ? "Voltar ao Pedido" : "Voltar para Pedidos"}
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {editingPedido
            ? editingPedido.numeroPedido
              ? `Editar Pedido ${editingPedido.numeroPedido}`
              : "Editar Orçamento"
            : initialModo === "pedido"
              ? "Lançar Novo Pedido"
              : "Novo Orçamento"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecione o cliente e a fábrica para carregar endereços, compradores e
          regras de grade automaticamente.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ETAPA 1: CLIENTE, COMPRADOR E ENDEREÇOS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">1. Cliente, Comprador e Entrega</CardTitle>
            <CardDescription>
              Escolha o cliente para preencher automaticamente compradores e
              endereços cadastrados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {options.clientes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center">
                <p className="text-sm font-medium text-foreground">
                  Você ainda não tem nenhum cliente cadastrado.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cadastre o cliente primeiro para abrir um orçamento ou pedido.
                </p>
                <Button asChild size="sm" className="mt-3">
                  <Link href="/clientes/novo">
                    <UserPlus className="size-4" />
                    Cadastrar Cliente Agora
                  </Link>
                </Button>
              </div>
            ) : (
              <>
                {/* Buscador instantâneo de cliente */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="busca-cliente">Cliente *</Label>
                    <Link
                      href="/clientes/novo"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      + Cadastrar novo cliente
                    </Link>
                  </div>

                  <div className="relative">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="busca-cliente"
                      type="search"
                      placeholder="Filtrar cliente por nome ou CPF/CNPJ..."
                      value={buscaCliente}
                      onChange={(e) => setBuscaCliente(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-background divide-y divide-border">
                    {clientesFiltrados.length === 0 ? (
                      <p className="p-3 text-center text-xs text-muted-foreground">
                        Nenhum cliente encontrado com esse termo.
                      </p>
                    ) : (
                      clientesFiltrados.map((c) => {
                        const selected = c.id === clienteId;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCliente(c.id)}
                            className={`flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                              selected
                                ? "bg-primary/10 font-semibold text-primary"
                                : "hover:bg-muted/60 text-foreground"
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate">{c.razaoSocial}</p>
                              {c.cpfCnpj ? (
                                <p className="text-xs font-normal text-muted-foreground tabular-nums">
                                  {formatCpfCnpj(c.cpfCnpj)}
                                </p>
                              ) : null}
                            </div>
                            {selected ? (
                              <Check className="size-4 shrink-0 text-primary" />
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Comprador e Endereços carregados automaticamente */}
                {selectedCliente ? (
                  <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="pedido-comprador">Comprador</Label>
                        <Select
                          id="pedido-comprador"
                          value={compradorId}
                          onChange={(e) => setCompradorId(e.target.value)}
                        >
                          <option value="">
                            {selectedCliente.compradores.length === 0
                              ? "Nenhum comprador cadastrado"
                              : "Selecionar comprador..."}
                          </option>
                          {selectedCliente.compradores.map((comp) => (
                            <option key={comp.id} value={comp.id}>
                              {comp.nome}
                              {comp.departamento ? ` (${comp.departamento})` : ""}
                              {!comp.ativo ? " — Inativo" : ""}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="pedido-end-fat">
                          Endereço de Faturamento
                        </Label>
                        <Select
                          id="pedido-end-fat"
                          value={enderecoFaturamentoId}
                          onChange={(e) =>
                            setEnderecoFaturamentoId(e.target.value)
                          }
                        >
                          <option value="">
                            {selectedCliente.enderecos.length === 0
                              ? "Nenhum endereço cadastrado"
                              : "Selecionar endereço..."}
                          </option>
                          {selectedCliente.enderecos.map((end) => (
                            <option key={end.id} value={end.id}>
                              {formatEnderecoOption(end)}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer">
                        <Checkbox
                          checked={entregaMesmoFaturamento}
                          onChange={(e) =>
                            setEntregaMesmoFaturamento(e.target.checked)
                          }
                        />
                        Entrega no mesmo endereço de faturamento
                      </label>

                      <div className="w-full sm:w-64">
                        <Input
                          placeholder="A/C de (quem recebe na entrega)"
                          value={acEntrega}
                          onChange={(e) => setAcEntrega(e.target.value)}
                        />
                      </div>
                    </div>

                    {!entregaMesmoFaturamento ? (
                      <div className="space-y-1.5">
                        <Label htmlFor="pedido-end-ent">
                          Endereço de Entrega
                        </Label>
                        <Select
                          id="pedido-end-ent"
                          value={enderecoEntregaId}
                          onChange={(e) => setEnderecoEntregaId(e.target.value)}
                        >
                          <option value="">Selecionar endereço de entrega...</option>
                          {selectedCliente.enderecos.map((end) => (
                            <option key={end.id} value={end.id}>
                              {formatEnderecoOption(end)}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        {/* ETAPA 2: FABRICANTE, NUMERAÇÃO, DATAS E PAGAMENTO */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              2. Fabricante, Condições e Prazos
            </CardTitle>
            <CardDescription>
              Ao escolher o fabricante, o sistema adapta a grade de tamanhos e
              sugere a numeração própria da fábrica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pedido-fornecedor">Fabricante / Fornecedor</Label>
                <Select
                  id="pedido-fornecedor"
                  value={fornecedorId}
                  onChange={(e) => handleSelectFornecedor(e.target.value)}
                >
                  <option value="">Escolher depois / Sem fabricante</option>
                  {options.fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} — {TEMPLATE_PDF_LABELS[f.templatePdf]}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pedido-status">Etapa Atual *</Label>
                <Select
                  id="pedido-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StatusPedido)}
                >
                  {(Object.keys(STATUS_PEDIDO_META) as StatusPedido[]).map(
                    (st) => (
                      <option key={st} value={st}>
                        {STATUS_PEDIDO_META[st].label}
                      </option>
                    )
                  )}
                </Select>
              </div>
            </div>

            {selectedFornecedor ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs">
                <div className="flex items-center gap-2 text-foreground">
                  {selectedFornecedor.templatePdf === "CONFECCAO_GRADE" ? (
                    <Ruler className="size-4 text-primary" />
                  ) : selectedFornecedor.templatePdf === "BONES_MOCKUP" ? (
                    <ImageIcon className="size-4 text-primary" />
                  ) : (
                    <Factory className="size-4 text-primary" />
                  )}
                  <span>
                    <strong>{selectedFornecedor.nome}:</strong>{" "}
                    {selectedFornecedor.templatePdf === "CONFECCAO_GRADE"
                      ? "Grade de tamanhos habilitada para confecção."
                      : selectedFornecedor.templatePdf === "BONES_MOCKUP"
                        ? "Layout com mockup em destaque — após salvar, envie a arte/mockup na pasta do pedido."
                        : "Layout padrão FGV."}
                  </span>
                </div>

                {numeroSugeridoFornecedor ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    onClick={() => {
                      setNumeroPedido(numeroSugeridoFornecedor);
                      setAtualizarProximoNumero(true);
                    }}
                  >
                    <Sparkles className="size-3" />
                    Usar nº {numeroSugeridoFornecedor}
                  </Button>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="pedido-numero">Nº do Pedido</Label>
                <Input
                  id="pedido-numero"
                  placeholder="Ex.: 0464 ou 4712B"
                  value={numeroPedido}
                  onChange={(e) => setNumeroPedido(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pedido-vendedor">Vendedor *</Label>
                <Input
                  id="pedido-vendedor"
                  value={vendedor}
                  onChange={(e) => setVendedor(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pedido-feira">Feira / Evento</Label>
                <Input
                  id="pedido-feira"
                  list="feiras-comuns-list"
                  placeholder="Ex.: AGRISHOW, SHOW RURAL"
                  value={eventoFeira}
                  onChange={(e) => setEventoFeira(e.target.value)}
                />
                <datalist id="feiras-comuns-list">
                  {FEIRAS_AGRO_COMUNS.map((feira) => (
                    <option key={feira} value={feira} />
                  ))}
                </datalist>
              </div>
            </div>

            {selectedFornecedor && numeroPedido.trim() ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={atualizarProximoNumero}
                  onChange={(e) => setAtualizarProximoNumero(e.target.checked)}
                />
                Atualizar automaticamente o próximo número sugerido de{" "}
                <strong className="text-foreground">
                  {selectedFornecedor.nome}
                </strong>
              </label>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="pedido-cond-pagto">Condição de Pagamento</Label>
                <Input
                  id="pedido-cond-pagto"
                  placeholder="Ex.: 30 DIAS, 21 DIAS"
                  value={condicaoPagamento}
                  onChange={(e) => setCondicaoPagamento(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pedido-forma-pagto">Forma de Pagamento</Label>
                <Select
                  id="pedido-forma-pagto"
                  value={formaPagamento}
                  onChange={(e) => setFormaPagamento(e.target.value)}
                >
                  <option value="">Selecionar...</option>
                  {(
                    Object.keys(FORMA_PAGAMENTO_LABELS) as FormaPagamento[]
                  ).map((forma) => (
                    <option key={forma} value={forma}>
                      {FORMA_PAGAMENTO_LABELS[forma]}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pedido-oc">Ordem de Compra (OC)</Label>
                <Input
                  id="pedido-oc"
                  placeholder="Nº da OC do cliente"
                  value={ordemCompra}
                  onChange={(e) => setOrdemCompra(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="pedido-data-orc">Data do Orçamento</Label>
                <Input
                  id="pedido-data-orc"
                  type="date"
                  value={dataOrcamento}
                  onChange={(e) => setDataOrcamento(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pedido-data-ped">Data do Pedido</Label>
                <Input
                  id="pedido-data-ped"
                  type="date"
                  value={dataPedido}
                  onChange={(e) => setDataPedido(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pedido-followup">
                  Próximo Retorno / Cobrança
                </Label>
                <Input
                  id="pedido-followup"
                  type="date"
                  value={proximoFollowup}
                  onChange={(e) => setProximoFollowup(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="pedido-prazo">Prazo de Entrega (dias)</Label>
                <Input
                  id="pedido-prazo"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Ex.: 25"
                  value={prazoEntregaDias}
                  onChange={(e) => setPrazoEntregaDias(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pedido-saida">Data Saída da Fábrica</Label>
                <Input
                  id="pedido-saida"
                  type="date"
                  value={dataSaidaFabrica}
                  onChange={(e) => setDataSaidaFabrica(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pedido-entrega">Data Entrega ao Cliente</Label>
                <Input
                  id="pedido-entrega"
                  type="date"
                  value={dataEntregaCliente}
                  onChange={(e) => setDataEntregaCliente(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ETAPA 3: ITENS DO PEDIDO, GRADE E TOTAIS */}
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg">
                3. Itens e Valores
              </CardTitle>
              <CardDescription>
                Adicione cada produto ou variação de preço em uma linha separada.
                O total é somado automaticamente.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddItem}
              className="font-semibold"
            >
              <Plus className="size-4" />
              Adicionar Item
            </Button>
          </CardHeader>

          <CardContent className="space-y-5">
            {itens.map((item, idx) => {
              const qtdNum = Math.max(0, Math.floor(Number(item.quantidade) || 0));
              const unitNum = Math.max(
                0,
                Number(item.valor_unitario.replace(",", ".")) || 0
              );
              const totalItem = roundMoney(qtdNum * unitNum);

              return (
                <div
                  key={item.key}
                  className="space-y-4 rounded-2xl border border-border bg-background/60 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">Item {idx + 1}</Badge>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                        <Checkbox
                          checked={item.usar_grade}
                          onChange={(e) =>
                            updateItem(item.key, (prev) => ({
                              ...prev,
                              usar_grade: e.target.checked,
                            }))
                          }
                        />
                        Usar grade de tamanhos
                      </label>

                      {itens.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemoveItem(item.key)}
                        >
                          <Trash2 className="size-3.5" />
                          Remover
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Descrição Técnica do Produto *</Label>
                    <Textarea
                      placeholder="Ex.: Boné americano verde musgo com bordado frontal em alto relevo..."
                      value={item.descricao_tecnica}
                      onChange={(e) =>
                        updateItem(item.key, (prev) => ({
                          ...prev,
                          descricao_tecnica: e.target.value,
                        }))
                      }
                      className="min-h-[70px]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>Quantidade *</Label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={item.quantidade}
                        onChange={(e) =>
                          updateItem(item.key, (prev) => ({
                            ...prev,
                            quantidade: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Valor Unitário (R$) *</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.valor_unitario}
                        onChange={(e) =>
                          updateItem(item.key, (prev) => ({
                            ...prev,
                            valor_unitario: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Total do Item</Label>
                      <div className="flex h-10 items-center justify-end rounded-lg border border-border bg-muted/60 px-3 text-sm font-bold text-foreground tabular-nums">
                        {formatCurrencyBRL(totalItem)}
                      </div>
                    </div>
                  </div>

                  {item.usar_grade ? (
                    <GradeTamanhosEditor
                      value={item.grade_tamanhos}
                      quantidadeItem={qtdNum}
                      onChange={(nextGrade, autoSyncQtd) =>
                        updateItem(item.key, (prev) => ({
                          ...prev,
                          grade_tamanhos: nextGrade,
                          quantidade:
                            autoSyncQtd !== undefined
                              ? String(autoSyncQtd)
                              : prev.quantidade,
                        }))
                      }
                      onSyncQuantidade={(soma) =>
                        updateItem(item.key, (prev) => ({
                          ...prev,
                          quantidade: String(soma),
                        }))
                      }
                    />
                  ) : null}
                </div>
              );
            })}

            {/* Resumo Financeiro ao Vivo */}
            <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Subtotal dos Itens
                  </p>
                  <p className="mt-1 text-xl font-bold text-foreground tabular-nums">
                    {formatCurrencyBRL(totaisAoVivo.subtotal)}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pedido-desconto">Desconto (R$)</Label>
                  <Input
                    id="pedido-desconto"
                    type="number"
                    min={0}
                    step="0.01"
                    value={desconto}
                    onChange={(e) => setDesconto(e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Valor Total Final
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-primary tabular-nums">
                    {formatCurrencyBRL(totaisAoVivo.valorTotal)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ETAPA 4: OBSERVAÇÕES */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">4. Observações e Ocorrências</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pedido-obs-nf">Observação para Nota Fiscal</Label>
              <Textarea
                id="pedido-obs-nf"
                placeholder="Ex.: Mencionar na Nota Fiscal o código de resgate / programa de pontos..."
                value={obsNotaFiscal}
                onChange={(e) => setObsNotaFiscal(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pedido-obs">Observações Gerais</Label>
                <Textarea
                  id="pedido-obs"
                  placeholder="Detalhes extras sobre embalagem, entrega ou bordado..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pedido-ocorrencias">
                  Ocorrências (atrasos ou problemas)
                </Label>
                <Textarea
                  id="pedido-ocorrencias"
                  placeholder="Registre aqui se houve algum problema de qualidade ou atraso..."
                  value={ocorrencias}
                  onChange={(e) => setOcorrencias(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {formError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {formError}
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button asChild type="button" variant="outline" size="lg">
            <Link href={editingPedido ? `/pedidos/${editingPedido.id}` : "/pedidos"}>
              Cancelar
            </Link>
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={isPending || options.clientes.length === 0}
            className="font-semibold"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {editingPedido
              ? "Salvar Alterações"
              : initialModo === "pedido"
                ? "Salvar Pedido"
                : "Salvar Orçamento"}
          </Button>
        </div>
      </form>
    </div>
  );
}
