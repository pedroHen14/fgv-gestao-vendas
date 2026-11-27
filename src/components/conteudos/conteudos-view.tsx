"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CalendarHeart,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Layers,
  List,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { ConteudoItem } from "@/lib/services/conteudos";
import {
  formatLegendaParaCopia,
  formatRoteiroParaCopia,
  getOportunidadesEditoriais,
  type OportunidadeEditorial,
} from "@/lib/calendario-editorial";
import {
  FORMATO_CONTEUDO_META,
  STATUS_CONTEUDO_META,
  STATUS_CONTEUDO_ORDEM,
  type FormatoConteudo,
  type StatusConteudo,
} from "@/lib/constants";
import { addDaysToIsoDate, formatDateBR } from "@/lib/formatters";
import {
  deleteConteudoAction,
  updateStatusConteudoAction,
} from "@/app/(dashboard)/conteudos/actions";
import { CopyButton } from "@/components/conteudos/copy-button";
import { OportunidadesPanel } from "@/components/conteudos/oportunidades-panel";
import { ConteudoCalendario } from "@/components/conteudos/conteudo-calendario";
import {
  ConteudoEditorDialog,
  type ConteudoDraftSeed,
} from "@/components/conteudos/conteudo-editor-dialog";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface ConteudosViewProps {
  conteudos: ConteudoItem[];
  hojeIso: string;
}

function FormatoBadgeIcon({ formato }: { formato: FormatoConteudo }) {
  if (formato === "REELS_SEM_APARECER") {
    return <Film className="size-3.5 text-primary" />;
  }
  if (formato === "FOTO_UNICA") {
    return <ImageIcon className="size-3.5 text-primary" />;
  }
  return <Layers className="size-3.5 text-primary" />;
}

export function ConteudosView({ conteudos, hojeIso }: ConteudosViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [visao, setVisao] = useState<"calendario" | "lista">("calendario");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | StatusConteudo>(
    "TODOS"
  );
  const [filtroFormato, setFiltroFormato] = useState<"TODOS" | FormatoConteudo>(
    "TODOS"
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [editing, setEditing] = useState<ConteudoItem | null>(null);
  const [draftSeed, setDraftSeed] = useState<ConteudoDraftSeed | null>(null);
  const [deleting, setDeleting] = useState<ConteudoItem | null>(null);
  const [busyStatusId, setBusyStatusId] = useState<string | null>(null);

  const oportunidades = useMemo(
    () => getOportunidadesEditoriais(hojeIso),
    [hojeIso]
  );

  const contadores = useMemo(() => {
    const counts: Record<StatusConteudo, number> = {
      IDEIA: 0,
      ROTEIRO_PRONTO: 0,
      ARTE_CANVA: 0,
      POSTADO: 0,
    };
    for (const item of conteudos) {
      counts[item.status]++;
    }
    return counts;
  }, [conteudos]);

  const conteudosFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return conteudos.filter((item) => {
      if (filtroStatus !== "TODOS" && item.status !== filtroStatus) {
        return false;
      }
      if (filtroFormato !== "TODOS" && item.formato !== filtroFormato) {
        return false;
      }
      if (!q) return true;
      return (
        item.tema.toLowerCase().includes(q) ||
        (item.ocasiaoFeira ?? "").toLowerCase().includes(q) ||
        (item.legendaIa ?? "").toLowerCase().includes(q)
      );
    });
  }, [busca, conteudos, filtroFormato, filtroStatus]);

  const openCreateBlank = () => {
    setEditing(null);
    setDraftSeed({ dataPublicacao: addDaysToIsoDate(hojeIso, 2) });
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  };

  const openCreateForDate = (isoDate: string) => {
    setEditing(null);
    setDraftSeed({ dataPublicacao: isoDate });
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  };

  const openCreateFromPreset = (oportunidade: OportunidadeEditorial) => {
    setEditing(null);
    setDraftSeed({
      tema: oportunidade.temaSugerido,
      formato: oportunidade.formatoSugerido,
      ocasiaoFeira: oportunidade.nome,
      dataPublicacao: addDaysToIsoDate(hojeIso, 2),
      produtoDestaque: oportunidade.produtosSugeridos,
    });
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  };

  const openEdit = (item: ConteudoItem) => {
    setEditing(item);
    setDraftSeed(null);
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  };

  const handleQuickStatusChange = async (
    itemId: string,
    nextStatus: StatusConteudo
  ) => {
    setBusyStatusId(itemId);
    const result = await updateStatusConteudoAction(itemId, nextStatus);
    setBusyStatusId(null);

    if (!result.success) {
      toast.error(result.error ?? "Não foi possível atualizar a etapa.");
      return;
    }

    toast.success(
      `Post atualizado para "${STATUS_CONTEUDO_META[nextStatus].label}".`
    );
    router.refresh();
  };

  const handleConfirmDelete = () => {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteConteudoAction(deleting.id);
      if (!result.success) {
        toast.error(result.error ?? "Não foi possível excluir o post.");
        return;
      }
      toast.success("Post excluído do calendário.");
      setDeleting(null);
      setEditorOpen(false);
      router.refresh();
    });
  };

  const handleFilterByCard = (status: StatusConteudo) => {
    setVisao("lista");
    setFiltroStatus((prev) => (prev === status ? "TODOS" : status));
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Conteúdo e Posts para Instagram
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Planeje seus 2 a 3 posts da semana com ideias alinhadas às feiras do
            Agro e gere legendas e roteiros sem aparecer, prontos para o Canva.
          </p>
        </div>

        <Button
          size="lg"
          onClick={openCreateBlank}
          className="font-semibold shrink-0"
        >
          <Plus className="size-4" />
          Novo Post / Ideia
        </Button>
      </div>

      {/* Resumo por etapa */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATUS_CONTEUDO_ORDEM.map((st) => {
          const meta = STATUS_CONTEUDO_META[st];
          const isSelected = visao === "lista" && filtroStatus === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => handleFilterByCard(st)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant={meta.variant}>{meta.label}</Badge>
                <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {contadores[st]}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {st === "IDEIA"
                  ? "Aguardando gerar roteiro"
                  : st === "ROTEIRO_PRONTO"
                    ? "Pronto para montar no Canva"
                    : st === "ARTE_CANVA"
                      ? "Arte pronta para publicar"
                      : "Já publicado no Instagram"}
              </p>
            </button>
          );
        })}
      </section>

      {/* Oportunidades 60-90 dias antes (Agro + Corporativo) */}
      <OportunidadesPanel
        oportunidades={oportunidades}
        onCriarPostFromPreset={openCreateFromPreset}
      />

      {/* Barra de alternância Calendário / Lista */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl border border-border bg-card p-1 self-start">
          <Button
            type="button"
            size="sm"
            variant={visao === "calendario" ? "default" : "ghost"}
            onClick={() => setVisao("calendario")}
          >
            <CalendarDays className="size-4" />
            Calendário
          </Button>
          <Button
            type="button"
            size="sm"
            variant={visao === "lista" ? "default" : "ghost"}
            onClick={() => setVisao("lista")}
          >
            <List className="size-4" />
            Lista de Posts ({conteudos.length})
          </Button>
        </div>

        {visao === "lista" ? (
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por tema ou feira..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="w-full sm:w-44">
              <Select
                aria-label="Filtrar por etapa"
                value={filtroStatus}
                onChange={(e) =>
                  setFiltroStatus(e.target.value as "TODOS" | StatusConteudo)
                }
              >
                <option value="TODOS">Todas as etapas</option>
                {STATUS_CONTEUDO_ORDEM.map((st) => (
                  <option key={st} value={st}>
                    {STATUS_CONTEUDO_META[st].label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-full sm:w-48">
              <Select
                aria-label="Filtrar por formato"
                value={filtroFormato}
                onChange={(e) =>
                  setFiltroFormato(e.target.value as "TODOS" | FormatoConteudo)
                }
              >
                <option value="TODOS">Todos os formatos</option>
                <option value="CARROSSEL">Carrossel (Canva)</option>
                <option value="REELS_SEM_APARECER">Reels (Sem aparecer)</option>
                <option value="FOTO_UNICA">Foto Única</option>
              </Select>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Dica: passe o mouse em qualquer dia do calendário e clique no{" "}
            <strong>+</strong> para agendar um post naquela data.
          </p>
        )}
      </div>

      {/* Área Principal: Calendário ou Lista */}
      {visao === "calendario" ? (
        <ConteudoCalendario
          conteudos={conteudos}
          hojeIso={hojeIso}
          onSelectConteudo={openEdit}
          onCreateForDate={openCreateForDate}
        />
      ) : conteudosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={CalendarHeart}
              title={
                conteudos.length === 0
                  ? "Nenhum post planejado ainda"
                  : "Nenhum post encontrado com esse filtro"
              }
              description={
                conteudos.length === 0
                  ? "Escolha uma das oportunidades das feiras acima ou clique em 'Novo Post / Ideia' para criar sua primeira legenda e roteiro com IA."
                  : "Tente limpar a busca ou escolher outra etapa/formato."
              }
              action={
                conteudos.length === 0 ? (
                  <Button onClick={openCreateBlank}>
                    <Sparkles className="size-4" />
                    Criar Primeiro Post com IA
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBusca("");
                      setFiltroStatus("TODOS");
                      setFiltroFormato("TODOS");
                    }}
                  >
                    Limpar filtros
                  </Button>
                )
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {conteudosFiltrados.map((item) => {
            const statusMeta = STATUS_CONTEUDO_META[item.status];
            const formatoMeta = FORMATO_CONTEUDO_META[item.formato];
            const legendaTexto = formatLegendaParaCopia(item.legendaIa);
            const roteiroTexto = formatRoteiroParaCopia({
              tema: item.tema,
              formato: item.formato,
              ocasiaoFeira: item.ocasiaoFeira,
              cenas: item.roteiroCenasIa,
            });
            const totalCenas = item.roteiroCenasIa?.length ?? 0;

            return (
              <Card key={item.id} className="flex flex-col justify-between">
                <CardContent className="space-y-4 pt-5">
                  {/* Topo do card */}
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={statusMeta.variant}>
                        {statusMeta.label}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <FormatoBadgeIcon formato={item.formato} />
                        {formatoMeta.shortLabel}
                      </Badge>
                      {item.ocasiaoFeira ? (
                        <Badge variant="secondary">{item.ocasiaoFeira}</Badge>
                      ) : null}
                    </div>

                    <span className="text-xs font-medium text-muted-foreground tabular-nums">
                      {item.dataPublicacao
                        ? `Postar em ${formatDateBR(item.dataPublicacao)}`
                        : "Sem data definida"}
                    </span>
                  </div>

                  {/* Tema e prévia */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="text-left text-base font-bold text-foreground hover:text-primary hover:underline"
                    >
                      {item.tema}
                    </button>

                    {legendaTexto ? (
                      <p className="line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                        {legendaTexto}
                      </p>
                    ) : (
                      <p className="text-xs italic text-muted-foreground">
                        Ainda sem legenda gerada — abra para gerar com IA em 1
                        clique.
                      </p>
                    )}

                    {totalCenas > 0 ? (
                      <p className="text-xs font-medium text-primary">
                        Roteiro pronto com {totalCenas}{" "}
                        {totalCenas === 1 ? "cena/slide" : "cenas/slides"} para
                        o Canva
                      </p>
                    ) : null}
                  </div>

                  {/* Botões de cópia em 1 clique + Canva */}
                  <div className="flex flex-wrap items-center gap-2">
                    <CopyButton
                      text={legendaTexto}
                      label="Copiar Legenda"
                      variant="secondary"
                      size="sm"
                      successMessage="Legenda copiada! Pronta para colar no Instagram."
                    />
                    <CopyButton
                      text={roteiroTexto}
                      label="Copiar Roteiro"
                      variant="outline"
                      size="sm"
                      successMessage="Roteiro copiado! Pronto para montar no Canva."
                    />
                    {item.linkCanva ? (
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={item.linkCanva}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="size-3.5" />
                          Canva
                        </a>
                      </Button>
                    ) : null}
                  </div>

                  {/* Rodapé com etapa rápida + abrir/excluir */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                    <div className="w-44">
                      <Select
                        aria-label="Alterar etapa do post"
                        value={item.status}
                        disabled={busyStatusId === item.id}
                        onChange={(e) =>
                          handleQuickStatusChange(
                            item.id,
                            e.target.value as StatusConteudo
                          )
                        }
                        className="h-9 text-xs"
                      >
                        {STATUS_CONTEUDO_ORDEM.map((st) => (
                          <option key={st} value={st}>
                            {STATUS_CONTEUDO_META[st].label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="size-3.5" />
                        Abrir / Editar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleting(item)}
                        aria-label="Excluir post"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de criação/edição e IA */}
      <ConteudoEditorDialog
        key={`${editorKey}-${editing?.id ?? "new"}`}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editing={editing}
        seed={draftSeed}
        onRequestDelete={(item) => setDeleting(item)}
      />

      {/* Confirmação de exclusão */}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Excluir post do calendário?"
        description={`Tem certeza que deseja excluir o post "${deleting?.tema ?? ""}"? A legenda e o roteiro salvos nele serão removidos.`}
        confirmLabel="Sim, excluir"
        loading={isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
