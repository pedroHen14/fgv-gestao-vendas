"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  FORMA_PAGAMENTO_LABELS,
  type FormaPagamento,
} from "@/lib/constants";
import {
  formatSuggestedPedidoNumero,
  getTodayIsoDate,
} from "@/lib/formatters";
import { converterOrcamentoAction } from "@/app/(dashboard)/pedidos/actions";
import { Button } from "@/components/ui/button";
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

export interface OrcamentoParaConversao {
  id: string;
  numeroPedido: string | null;
  condicaoPagamento: string | null;
  formaPagamento: FormaPagamento | null;
  ordemCompra: string | null;
  prazoEntregaDias: number | null;
  dataSaidaFabrica: string | null;
  fornecedor: {
    id: string;
    nome: string;
    templatePdf: string;
    proximoNumeroPedido: number | null;
  } | null;
}

interface ConverterOrcamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orcamento: OrcamentoParaConversao;
}

export function ConverterOrcamentoDialog({
  open,
  onOpenChange,
  orcamento,
}: ConverterOrcamentoDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const numeroSugerido =
    orcamento.numeroPedido ||
    formatSuggestedPedidoNumero(
      orcamento.fornecedor?.proximoNumeroPedido,
      orcamento.fornecedor?.templatePdf
    );

  const [numeroPedido, setNumeroPedido] = useState(numeroSugerido);
  const [dataPedido, setDataPedido] = useState(getTodayIsoDate());
  const [condicaoPagamento, setCondicaoPagamento] = useState(
    orcamento.condicaoPagamento ?? ""
  );
  const [formaPagamento, setFormaPagamento] = useState<string>(
    orcamento.formaPagamento ?? ""
  );
  const [ordemCompra, setOrdemCompra] = useState(orcamento.ordemCompra ?? "");
  const [prazoEntregaDias, setPrazoEntregaDias] = useState(
    orcamento.prazoEntregaDias ? String(orcamento.prazoEntregaDias) : ""
  );
  const [dataSaidaFabrica, setDataSaidaFabrica] = useState(
    orcamento.dataSaidaFabrica ?? ""
  );
  const [atualizarProximoNumero, setAtualizarProximoNumero] = useState(
    Boolean(orcamento.fornecedor)
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedPrazo = prazoEntregaDias.trim();
    const parsedPrazo = trimmedPrazo ? Number(trimmedPrazo) : null;
    if (
      parsedPrazo !== null &&
      (!Number.isInteger(parsedPrazo) || parsedPrazo <= 0)
    ) {
      setError("O prazo de entrega deve ser um número inteiro de dias.");
      return;
    }

    startTransition(async () => {
      const result = await converterOrcamentoAction({
        pedido_id: orcamento.id,
        numero_pedido: numeroPedido,
        data_pedido: dataPedido,
        condicao_pagamento: condicaoPagamento || null,
        forma_pagamento: (formaPagamento || null) as FormaPagamento | null,
        ordem_compra: ordemCompra || null,
        prazo_entrega_dias: parsedPrazo,
        data_saida_fabrica: dataSaidaFabrica || null,
        atualizar_proximo_numero: atualizarProximoNumero,
      });

      if (!result.success) {
        setError(result.error ?? "Não foi possível aprovar o pedido.");
        return;
      }

      toast.success("Orçamento convertido em Pedido Aprovado com sucesso!");
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <CheckCircle2 className="size-5" />
            Converter Orçamento em Pedido
          </DialogTitle>
          <DialogDescription>
            O orçamento será promovido para <strong>Pedido Aprovado</strong> no
            mesmo registro, mantendo todos os itens, grade e histórico sem
            precisar redigitar nada.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="conv-numero">Número do Pedido *</Label>
              <Input
                id="conv-numero"
                placeholder="Ex.: 0465 ou 4712B"
                value={numeroPedido}
                onChange={(e) => setNumeroPedido(e.target.value)}
                required
              />
              {orcamento.fornecedor?.proximoNumeroPedido ? (
                <p className="text-xs text-muted-foreground">
                  Sugerido para {orcamento.fornecedor.nome}:{" "}
                  <strong>
                    {formatSuggestedPedidoNumero(
                      orcamento.fornecedor.proximoNumeroPedido,
                      orcamento.fornecedor.templatePdf
                    )}
                  </strong>
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="conv-data">Data do Pedido *</Label>
              <Input
                id="conv-data"
                type="date"
                value={dataPedido}
                onChange={(e) => setDataPedido(e.target.value)}
                required
              />
            </div>
          </div>

          {orcamento.fornecedor ? (
            <label className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3 text-sm cursor-pointer">
              <Checkbox
                checked={atualizarProximoNumero}
                onChange={(e) => setAtualizarProximoNumero(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Atualizar automaticamente o próximo número sugerido do fabricante{" "}
                <strong>{orcamento.fornecedor.nome}</strong>
              </span>
            </label>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="conv-cond-pagto">Condição de Pagamento</Label>
              <Input
                id="conv-cond-pagto"
                placeholder="Ex.: 30 DIAS, 21 DIAS"
                value={condicaoPagamento}
                onChange={(e) => setCondicaoPagamento(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="conv-forma-pagto">Forma de Pagamento</Label>
              <Select
                id="conv-forma-pagto"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
              >
                <option value="">Selecionar...</option>
                {(Object.keys(FORMA_PAGAMENTO_LABELS) as FormaPagamento[]).map(
                  (forma) => (
                    <option key={forma} value={forma}>
                      {FORMA_PAGAMENTO_LABELS[forma]}
                    </option>
                  )
                )}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="conv-oc">Ordem de Compra</Label>
              <Input
                id="conv-oc"
                placeholder="Nº OC"
                value={ordemCompra}
                onChange={(e) => setOrdemCompra(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="conv-prazo">Prazo (dias)</Label>
              <Input
                id="conv-prazo"
                type="number"
                min={1}
                step={1}
                placeholder="Ex.: 20"
                value={prazoEntregaDias}
                onChange={(e) => setPrazoEntregaDias(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="conv-saida">Saída da Fábrica</Label>
              <Input
                id="conv-saida"
                type="date"
                value={dataSaidaFabrica}
                onChange={(e) => setDataSaidaFabrica(e.target.value)}
              />
            </div>
          </div>

          {error ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="font-semibold">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar Pedido Aprovado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
