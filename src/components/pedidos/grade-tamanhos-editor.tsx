"use client";

import { AlertTriangle, CheckCircle2, Ruler } from "lucide-react";
import {
  MODELO_GRADE_LABELS,
  type ModeloGrade,
} from "@/lib/constants";
import {
  TAMANHOS_PADRAO,
  somarGradeTamanhos,
  type GradeTamanhos,
} from "@/lib/validators/pedido";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface GradeTamanhosEditorProps {
  value: GradeTamanhos;
  quantidadeItem: number;
  onChange: (nextGrade: GradeTamanhos, autoSyncQuantidade?: number) => void;
  onSyncQuantidade: (soma: number) => void;
}

export function GradeTamanhosEditor({
  value,
  quantidadeItem,
  onChange,
  onSyncQuantidade,
}: GradeTamanhosEditorProps) {
  const somaGrade = somarGradeTamanhos(value);
  const somaBate = somaGrade === quantidadeItem && somaGrade > 0;

  const handleModeloChange = (modelo: ModeloGrade) => {
    onChange({ ...value, modelo });
  };

  const handleTamanhoChange = (tamanho: string, raw: string) => {
    const parsed = raw === "" ? 0 : Math.max(0, Math.floor(Number(raw) || 0));
    const nextTamanhos = {
      ...value.tamanhos,
      [tamanho]: parsed,
    };
    const nextGrade: GradeTamanhos = {
      ...value,
      tamanhos: nextTamanhos,
    };
    const nextSoma = somarGradeTamanhos(nextGrade);
    onChange(nextGrade, nextSoma > 0 ? nextSoma : undefined);
  };

  return (
    <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/[0.03] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="size-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            Grade de Tamanhos
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">
            Modelo:
          </Label>
          <div className="w-40">
            <Select
              value={value.modelo}
              onChange={(e) => handleModeloChange(e.target.value as ModeloGrade)}
              className="h-9 text-xs"
            >
              {(Object.keys(MODELO_GRADE_LABELS) as ModeloGrade[]).map((mod) => (
                <option key={mod} value={mod}>
                  {MODELO_GRADE_LABELS[mod]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Grid de tamanhos PP..ESP + TOTAL */}
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {TAMANHOS_PADRAO.map((tam) => {
          const qtd = value.tamanhos[tam] ?? 0;
          return (
            <div key={tam} className="space-y-1 text-center">
              <label className="block text-[11px] font-semibold text-muted-foreground">
                {tam}
              </label>
              <Input
                type="number"
                min={0}
                step={1}
                value={qtd === 0 ? "" : qtd}
                placeholder="0"
                onChange={(e) => handleTamanhoChange(tam, e.target.value)}
                className="h-9 px-1 text-center text-sm tabular-nums"
              />
            </div>
          );
        })}

        <div className="space-y-1 text-center">
          <span className="block text-[11px] font-bold text-primary">TOTAL</span>
          <div
            className={`flex h-9 items-center justify-center rounded-lg border text-sm font-bold tabular-nums ${
              somaBate
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-amber-300 bg-amber-50 text-amber-900"
            }`}
          >
            {somaGrade}
          </div>
        </div>
      </div>

      {/* Feedback de validação da soma */}
      {somaBate ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="size-3.5 shrink-0" />
          Soma da grade ({somaGrade}) confere com a quantidade do item.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 shrink-0 text-amber-600" />
            {somaGrade === 0
              ? "Preencha pelo menos um tamanho na grade acima."
              : `A soma da grade (${somaGrade}) está diferente da quantidade do item (${quantidadeItem}).`}
          </span>
          {somaGrade > 0 && somaGrade !== quantidadeItem ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 border-amber-300 bg-white text-xs text-amber-900 hover:bg-amber-100"
              onClick={() => onSyncQuantidade(somaGrade)}
            >
              Usar {somaGrade} como quantidade
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
