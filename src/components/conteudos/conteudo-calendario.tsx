"use client";

import { useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Film,
  Image as ImageIcon,
  Layers,
  Plus,
} from "lucide-react";
import type { ConteudoItem } from "@/lib/services/conteudos";
import {
  FORMATO_CONTEUDO_META,
  STATUS_CONTEUDO_META,
  type FormatoConteudo,
  type StatusConteudo,
} from "@/lib/constants";
import { formatDateBR } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConteudoCalendarioProps {
  conteudos: ConteudoItem[];
  hojeIso: string;
  onSelectConteudo: (item: ConteudoItem) => void;
  onCreateForDate: (isoDate: string) => void;
}

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const STATUS_PILL_STYLE: Record<StatusConteudo, string> = {
  IDEIA:
    "border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-400",
  ROTEIRO_PRONTO:
    "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400",
  ARTE_CANVA:
    "border-sky-300 bg-sky-50 text-sky-900 hover:border-sky-400",
  POSTADO:
    "border-emerald-300 bg-emerald-50 text-emerald-900 hover:border-emerald-400",
};

function FormatoIcon({ formato }: { formato: FormatoConteudo }) {
  if (formato === "REELS_SEM_APARECER") {
    return <Film className="size-3 shrink-0" />;
  }
  if (formato === "FOTO_UNICA") {
    return <ImageIcon className="size-3 shrink-0" />;
  }
  return <Layers className="size-3 shrink-0" />;
}

function getMonthTitle(year: number, monthIndex: number): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthIndex, 15)));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function ConteudoCalendario({
  conteudos,
  hojeIso,
  onSelectConteudo,
  onCreateForDate,
}: ConteudoCalendarioProps) {
  const [hojeYear, hojeMonth] = hojeIso.split("-").map((v) => Number(v));
  const [viewYear, setViewYear] = useState(hojeYear || 2026);
  const [viewMonthIndex, setViewMonthIndex] = useState((hojeMonth || 1) - 1);

  const byDate = useMemo(() => {
    const map = new Map<string, ConteudoItem[]>();
    for (const item of conteudos) {
      if (!item.dataPublicacao) continue;
      const list = map.get(item.dataPublicacao) ?? [];
      list.push(item);
      map.set(item.dataPublicacao, list);
    }
    return map;
  }, [conteudos]);

  const semData = useMemo(
    () => conteudos.filter((item) => !item.dataPublicacao),
    [conteudos]
  );

  const calendarCells = useMemo(() => {
    const firstDayUtc = new Date(Date.UTC(viewYear, viewMonthIndex, 1));
    // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
    const startOffset = (firstDayUtc.getUTCDay() + 6) % 7;
    const daysInMonth = new Date(
      Date.UTC(viewYear, viewMonthIndex + 1, 0)
    ).getUTCDate();
    const prevMonthLastDay = new Date(
      Date.UTC(viewYear, viewMonthIndex, 0)
    ).getUTCDate();

    const cells: Array<{
      isoDate: string;
      dayNumber: number;
      isCurrentMonth: boolean;
    }> = [];

    // Leading days from previous month
    const prevYear = viewMonthIndex === 0 ? viewYear - 1 : viewYear;
    const prevMonthIdx = viewMonthIndex === 0 ? 11 : viewMonthIndex - 1;
    for (let i = startOffset - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      cells.push({
        isoDate: toIsoDate(prevYear, prevMonthIdx, day),
        dayNumber: day,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        isoDate: toIsoDate(viewYear, viewMonthIndex, day),
        dayNumber: day,
        isCurrentMonth: true,
      });
    }

    // Trailing days from next month to fill complete weeks
    const nextYear = viewMonthIndex === 11 ? viewYear + 1 : viewYear;
    const nextMonthIdx = viewMonthIndex === 11 ? 0 : viewMonthIndex + 1;
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({
        isoDate: toIsoDate(nextYear, nextMonthIdx, nextDay),
        dayNumber: nextDay,
        isCurrentMonth: false,
      });
      nextDay++;
    }

    return cells;
  }, [viewYear, viewMonthIndex]);

  const postsNoMesAtual = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonthIndex + 1).padStart(2, "0")}-`;
    return conteudos
      .filter((c) => c.dataPublicacao?.startsWith(prefix))
      .sort((a, b) =>
        (a.dataPublicacao ?? "").localeCompare(b.dataPublicacao ?? "")
      );
  }, [conteudos, viewYear, viewMonthIndex]);

  const handlePrevMonth = () => {
    if (viewMonthIndex === 0) {
      setViewYear((y) => y - 1);
      setViewMonthIndex(11);
    } else {
      setViewMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonthIndex === 11) {
      setViewYear((y) => y + 1);
      setViewMonthIndex(0);
    } else {
      setViewMonthIndex((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    setViewYear(hojeYear || 2026);
    setViewMonthIndex((hojeMonth || 1) - 1);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handlePrevMonth}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <CardTitle className="min-w-[190px] text-center text-lg">
                {getMonthTitle(viewYear, viewMonthIndex)}
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                aria-label="Próximo mês"
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGoToday}
              >
                Hoje
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-slate-400" /> Ideia
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-amber-500" /> Roteiro
                Pronto
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-sky-500" /> Arte no
                Canva
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-600" />{" "}
                Postado
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Desktop Calendar Grid */}
          <div className="hidden overflow-hidden rounded-xl border border-border md:block">
            <div className="grid grid-cols-7 border-b border-border bg-muted/60">
              {WEEKDAYS.map((dayName) => (
                <div
                  key={dayName}
                  className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {dayName}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 divide-x divide-y divide-border">
              {calendarCells.map((cell) => {
                const isToday = cell.isoDate === hojeIso;
                const items = byDate.get(cell.isoDate) ?? [];

                return (
                  <div
                    key={cell.isoDate}
                    className={cn(
                      "group flex min-h-[118px] flex-col p-2 transition-colors",
                      cell.isCurrentMonth
                        ? "bg-card"
                        : "bg-muted/25 text-muted-foreground/70",
                      isToday && "bg-primary/5 ring-1 ring-inset ring-primary/30"
                    )}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                          isToday
                            ? "bg-primary text-primary-foreground"
                            : cell.isCurrentMonth
                              ? "text-foreground"
                              : "text-muted-foreground"
                        )}
                      >
                        {cell.dayNumber}
                      </span>

                      <button
                        type="button"
                        onClick={() => onCreateForDate(cell.isoDate)}
                        title={`Agendar post para ${formatDateBR(cell.isoDate)}`}
                        aria-label={`Agendar post para ${formatDateBR(cell.isoDate)}`}
                        className="flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-primary/10 hover:text-primary group-hover:opacity-100 focus:opacity-100"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-1 flex-col gap-1">
                      {items.map((post) => (
                        <button
                          key={post.id}
                          type="button"
                          onClick={() => onSelectConteudo(post)}
                          className={cn(
                            "flex w-full items-start gap-1.5 rounded-lg border px-2 py-1 text-left text-[11px] font-medium leading-tight transition-colors",
                            STATUS_PILL_STYLE[post.status]
                          )}
                          title={`${post.tema} (${STATUS_CONTEUDO_META[post.status].label})`}
                        >
                          <span className="mt-0.5">
                            <FormatoIcon formato={post.formato} />
                          </span>
                          <span className="line-clamp-2">{post.tema}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Agenda List for Selected Month */}
          <div className="space-y-2.5 md:hidden">
            {postsNoMesAtual.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum post agendado para {getMonthTitle(viewYear, viewMonthIndex)}.
                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onCreateForDate(toIsoDate(viewYear, viewMonthIndex, 1))
                    }
                  >
                    <Plus className="size-4" />
                    Agendar neste mês
                  </Button>
                </div>
              </div>
            ) : (
              postsNoMesAtual.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onSelectConteudo(post)}
                  className="flex w-full flex-col gap-1.5 rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:border-primary/40"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary tabular-nums">
                      <CalendarIcon className="size-3.5" />
                      {formatDateBR(post.dataPublicacao)}
                    </span>
                    <Badge variant={STATUS_CONTEUDO_META[post.status].variant}>
                      {STATUS_CONTEUDO_META[post.status].label}
                    </Badge>
                  </div>
                  <p className="font-semibold text-foreground">{post.tema}</p>
                  <p className="text-xs text-muted-foreground">
                    {FORMATO_CONTEUDO_META[post.formato].label}
                    {post.ocasiaoFeira ? ` • ${post.ocasiaoFeira}` : ""}
                  </p>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Banco de Ideias sem data */}
      {semData.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Ideias guardadas sem data ({semData.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {semData.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onSelectConteudo(post)}
                  className="flex flex-col gap-1.5 rounded-xl border border-border bg-background/60 p-3 text-left transition-colors hover:border-primary/40 hover:bg-card"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={STATUS_CONTEUDO_META[post.status].variant}>
                      {STATUS_CONTEUDO_META[post.status].shortLabel}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <FormatoIcon formato={post.formato} />
                      {FORMATO_CONTEUDO_META[post.formato].shortLabel}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm font-semibold text-foreground">
                    {post.tema}
                  </p>
                  {post.ocasiaoFeira ? (
                    <p className="text-xs text-muted-foreground">
                      {post.ocasiaoFeira}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
