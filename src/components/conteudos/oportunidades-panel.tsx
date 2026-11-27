"use client";

import { useState } from "react";
import {
  Briefcase,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Sprout,
} from "lucide-react";
import type {
  CategoriaEventoEditorial,
  OportunidadeEditorial,
} from "@/lib/calendario-editorial";
import { FORMATO_CONTEUDO_META } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface OportunidadesPanelProps {
  oportunidades: OportunidadeEditorial[];
  onCriarPostFromPreset: (oportunidade: OportunidadeEditorial) => void;
}

export function OportunidadesPanel({
  oportunidades,
  onCriarPostFromPreset,
}: OportunidadesPanelProps) {
  const [mostrarTodas, setMostrarTodas] = useState(false);
  const [categoriaFiltro, setCategoriaFiltro] = useState<
    "TODAS" | CategoriaEventoEditorial
  >("TODAS");

  const ideais = oportunidades.filter(
    (o) =>
      o.faixaAntecedencia === "JANELA_IDEAL" ||
      o.faixaAntecedencia === "ULTIMA_CHAMADA"
  );
  const oportunidadesDestaque =
    ideais.length >= 3 ? ideais.slice(0, 4) : oportunidades.slice(0, 4);

  const baseOportunidades = mostrarTodas ? oportunidades : oportunidadesDestaque;
  const oportunidadesVisiveis =
    !mostrarTodas || categoriaFiltro === "TODAS"
      ? baseOportunidades
      : baseOportunidades.filter((o) => o.categoria === categoriaFiltro);

  const totalJanelaIdeal = oportunidades.filter(
    (o) => o.faixaAntecedencia === "JANELA_IDEAL"
  ).length;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-secondary/35">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              <CalendarClock className="size-5 text-primary" />
              Oportunidades do Calendário (60 a 90 dias antes)
              {totalJanelaIdeal > 0 ? (
                <Badge variant="warning">
                  {totalJanelaIdeal}{" "}
                  {totalJanelaIdeal === 1
                    ? "na hora ideal"
                    : "na hora ideal"}
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription className="mt-1">
              Feiras do Agronegócio e datas corporativas que costumam gerar
              orçamentos antecipados de bonés, uniformes e brindes. Clique para
              já criar o post com sugestão pronta.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 self-start"
            onClick={() => setMostrarTodas((prev) => !prev)}
          >
            {mostrarTodas ? (
              <>
                <ChevronUp className="size-4" />
                Mostrar só em destaque
              </>
            ) : (
              <>
                <ChevronDown className="size-4" />
                Ver calendário anual ({oportunidades.length})
              </>
            )}
          </Button>
        </div>

        {mostrarTodas ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              variant={categoriaFiltro === "TODAS" ? "default" : "outline"}
              onClick={() => setCategoriaFiltro("TODAS")}
            >
              Todas ({oportunidades.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={categoriaFiltro === "FEIRA_AGRO" ? "default" : "outline"}
              onClick={() => setCategoriaFiltro("FEIRA_AGRO")}
            >
              <Sprout className="size-3.5" />
              Feiras do Agro (
              {oportunidades.filter((o) => o.categoria === "FEIRA_AGRO").length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={
                categoriaFiltro === "DATA_CORPORATIVA" ? "default" : "outline"
              }
              onClick={() => setCategoriaFiltro("DATA_CORPORATIVA")}
            >
              <Briefcase className="size-3.5" />
              Datas Corporativas (
              {
                oportunidades.filter((o) => o.categoria === "DATA_CORPORATIVA")
                  .length
              }
              )
            </Button>
          </div>
        ) : null}
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {oportunidadesVisiveis.map((item) => {
            const isAgro = item.categoria === "FEIRA_AGRO";
            const badgeVariant =
              item.faixaAntecedencia === "JANELA_IDEAL"
                ? "warning"
                : item.faixaAntecedencia === "ULTIMA_CHAMADA"
                  ? "default"
                  : "outline";

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-2xs transition-colors hover:border-primary/40"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <Badge variant={badgeVariant} className="text-[11px]">
                      {item.mensagemAntecedencia}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      {isAgro ? (
                        <Sprout className="size-3 text-emerald-700" />
                      ) : (
                        <Briefcase className="size-3 text-slate-600" />
                      )}
                      {item.periodoLabel}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground">
                      {item.nome}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.localOuContexto}
                    </p>
                  </div>

                  <p className="rounded-lg bg-muted/60 px-2.5 py-2 text-xs text-foreground/90">
                    <span className="font-semibold">Produtos fortes:</span>{" "}
                    {item.produtosSugeridos}
                  </p>
                </div>

                <div className="mt-3 space-y-2 border-t border-border/70 pt-3">
                  <p className="text-[11px] text-muted-foreground">
                    Formato sugerido:{" "}
                    <span className="font-medium text-foreground">
                      {FORMATO_CONTEUDO_META[item.formatoSugerido].shortLabel}
                    </span>
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="w-full font-semibold"
                    onClick={() => onCriarPostFromPreset(item)}
                  >
                    <Sparkles className="size-3.5" />
                    Criar post para esta data
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
