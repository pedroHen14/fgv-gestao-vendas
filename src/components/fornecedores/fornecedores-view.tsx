"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Factory,
  Hash,
  Loader2,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { FornecedorResumo } from "@/lib/services/fornecedores";
import {
  TEMPLATE_PDF_DESCRIPTIONS,
  TEMPLATE_PDF_LABELS,
  type TemplatePdfFornecedor,
} from "@/lib/constants";
import { formatSuggestedPedidoNumero } from "@/lib/formatters";
import {
  createFornecedorAction,
  deleteFornecedorAction,
  updateFornecedorAction,
} from "@/app/(dashboard)/fornecedores/actions";
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
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/layout/empty-state";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";

interface FornecedoresViewProps {
  fornecedores: FornecedorResumo[];
}

interface FornecedorFormState {
  nome: string;
  template_pdf: TemplatePdfFornecedor;
  proximo_numero_pedido: string;
  contato: string;
  observacoes: string;
}

const EMPTY_FORM: FornecedorFormState = {
  nome: "",
  template_pdf: "PADRAO",
  proximo_numero_pedido: "",
  contato: "",
  observacoes: "",
};

export function FornecedoresView({ fornecedores }: FornecedoresViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FornecedorResumo | null>(null);
  const [form, setForm] = useState<FornecedorFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<FornecedorResumo | null>(null);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (item: FornecedorResumo) => {
    setEditing(item);
    setForm({
      nome: item.nome,
      template_pdf: item.templatePdf,
      proximo_numero_pedido:
        item.proximoNumeroPedido !== null ? String(item.proximoNumeroPedido) : "",
      contato: item.contato ?? "",
      observacoes: item.observacoes ?? "",
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedNum = form.proximo_numero_pedido.trim();
    let proximoNumero: number | null = null;
    if (trimmedNum !== "") {
      const parsedNum = Number(trimmedNum);
      if (!Number.isInteger(parsedNum) || parsedNum <= 0) {
        setFormError("O próximo número de pedido deve ser um número inteiro maior que zero.");
        return;
      }
      proximoNumero = parsedNum;
    }

    const payload = {
      nome: form.nome.trim(),
      template_pdf: form.template_pdf,
      proximo_numero_pedido: proximoNumero,
      contato: form.contato.trim() || null,
      observacoes: form.observacoes.trim() || null,
    };

    startTransition(async () => {
      const result = editing
        ? await updateFornecedorAction(editing.id, payload)
        : await createFornecedorAction(payload);

      if (!result.success) {
        setFormError(result.error ?? "Erro ao salvar fornecedor.");
        return;
      }

      toast.success(
        editing
          ? "Fornecedor atualizado com sucesso!"
          : "Fornecedor cadastrado com sucesso!"
      );
      setDialogOpen(false);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteFornecedorAction(deleting.id);
      if (!result.success) {
        toast.error(result.error ?? "Não foi possível excluir o fornecedor.");
        return;
      }
      toast.success("Fornecedor excluído.");
      setDeleting(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Fornecedores e Fábricas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre cada fabricante com seu modelo de folha de pedido e numeração
            sugerida.
          </p>
        </div>

        <Button size="lg" onClick={openCreate} className="font-semibold">
          <Plus className="size-4" />
          Novo Fornecedor
        </Button>
      </div>

      {fornecedores.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Factory}
              title="Nenhum fornecedor cadastrado"
              description="Cadastre as fábricas com as quais você trabalha (ex.: DKS Bonés, Agatha, Elo Brindes) para agilizar seus orçamentos e pedidos."
              action={
                <Button onClick={openCreate}>
                  <Plus className="size-4" />
                  Cadastrar Primeiro Fornecedor
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {fornecedores.map((item) => {
            const numeroSugerido = formatSuggestedPedidoNumero(
              item.proximoNumeroPedido,
              item.templatePdf
            );

            return (
              <Card key={item.id} className="flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-lg">
                        {item.nome}
                      </CardTitle>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge
                          variant={
                            item.templatePdf === "CONFECCAO_GRADE"
                              ? "default"
                              : item.templatePdf === "BONES_MOCKUP"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {TEMPLATE_PDF_LABELS[item.templatePdf]}
                        </Badge>
                        <Badge variant="outline">
                          {item.totalPedidos}{" "}
                          {item.totalPedidos === 1 ? "pedido" : "pedidos"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="pt-2">
                    {TEMPLATE_PDF_DESCRIPTIONS[item.templatePdf]}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2 rounded-xl bg-muted/50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Hash className="size-3.5" />
                        Próximo nº sugerido
                      </span>
                      <span className="font-semibold text-foreground">
                        {numeroSugerido || "Livre / manual"}
                      </span>
                    </div>

                    {item.contato ? (
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="size-3.5" />
                          Contato
                        </span>
                        <span className="text-right font-medium text-foreground">
                          {item.contato}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {item.observacoes ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {item.observacoes}
                    </p>
                  ) : null}

                  <div className="flex items-center gap-2 border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 className="size-3.5" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Criar / Editar Fornecedor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription>
              Escolha o modelo de folha de pedido usado por esta fábrica e, se
              desejar, informe o próximo número de pedido para sugestão automática.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fornecedor-nome">Nome do Fornecedor / Fábrica *</Label>
              <Input
                id="fornecedor-nome"
                placeholder="Ex.: DKS Bonés, Agatha, Elo Brindes"
                value={form.nome}
                onChange={(e) => setForm((prev) => ({ ...prev, nome: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fornecedor-template">Modelo de Folha de Pedido (PDF) *</Label>
              <Select
                id="fornecedor-template"
                value={form.template_pdf}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    template_pdf: e.target.value as TemplatePdfFornecedor,
                  }))
                }
              >
                <option value="BONES_MOCKUP">
                  {TEMPLATE_PDF_LABELS.BONES_MOCKUP}
                </option>
                <option value="CONFECCAO_GRADE">
                  {TEMPLATE_PDF_LABELS.CONFECCAO_GRADE}
                </option>
                <option value="PADRAO">{TEMPLATE_PDF_LABELS.PADRAO}</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                {TEMPLATE_PDF_DESCRIPTIONS[form.template_pdf]}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fornecedor-proximo-numero">
                  Próximo Nº de Pedido (opcional)
                </Label>
                <Input
                  id="fornecedor-proximo-numero"
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Ex.: 465 ou 4713"
                  value={form.proximo_numero_pedido}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      proximo_numero_pedido: e.target.value,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Você sempre poderá alterar o número na hora do pedido (ex.: 4712B).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fornecedor-contato">Contato da Fábrica</Label>
                <Input
                  id="fornecedor-contato"
                  placeholder="Nome, telefone ou e-mail"
                  value={form.contato}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, contato: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fornecedor-obs">Observações</Label>
              <Textarea
                id="fornecedor-obs"
                placeholder="Ex.: Prazo médio, detalhes de numeração ou envio de arte..."
                value={form.observacoes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, observacoes: e.target.value }))
                }
              />
            </div>

            {formError ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {editing ? "Salvar Alterações" : "Cadastrar Fornecedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Excluir fornecedor?"
        description={
          deleting && deleting.totalPedidos > 0
            ? `O fornecedor "${deleting.nome}" está vinculado a ${deleting.totalPedidos} pedido(s). Os pedidos continuarão salvos, apenas ficarão sem fornecedor vinculado. Deseja excluir mesmo assim?`
            : `Tem certeza que deseja excluir o fornecedor "${deleting?.nome ?? ""}"?`
        }
        confirmLabel="Sim, excluir"
        loading={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
