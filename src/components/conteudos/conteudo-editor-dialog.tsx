"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  ExternalLink,
  Film,
  Image as ImageIcon,
  Layers,
  Loader2,
  Palette,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import type { ConteudoItem } from "@/lib/services/conteudos";
import type { RoteiroCena, RoteiroCenas } from "@/lib/validators/conteudo";
import {
  FORMATO_CONTEUDO_META,
  STATUS_CONTEUDO_META,
  STATUS_CONTEUDO_ORDEM,
  type FormatoConteudo,
  type StatusConteudo,
} from "@/lib/constants";
import {
  formatLegendaParaCopia,
  formatRoteiroParaCopia,
  PRESETS_CALENDARIO_EDITORIAL,
} from "@/lib/calendario-editorial";
import {
  createConteudoAction,
  updateConteudoAction,
} from "@/app/(dashboard)/conteudos/actions";
import { CopyButton } from "@/components/conteudos/copy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export interface ConteudoDraftSeed {
  tema?: string;
  formato?: FormatoConteudo;
  ocasiaoFeira?: string;
  dataPublicacao?: string;
  produtoDestaque?: string;
}

interface ConteudoEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: ConteudoItem | null;
  seed?: ConteudoDraftSeed | null;
  onRequestDelete?: (item: ConteudoItem) => void;
}

interface FormState {
  tema: string;
  formato: FormatoConteudo;
  ocasiao_feira: string;
  data_publicacao: string;
  status: StatusConteudo;
  legenda_ia: string;
  roteiro_cenas_ia: RoteiroCenas;
  link_canva: string;
  produto_destaque: string;
  observacoes_extras: string;
}

function buildInitialState(
  editing: ConteudoItem | null,
  seed?: ConteudoDraftSeed | null
): FormState {
  if (editing) {
    return {
      tema: editing.tema,
      formato: editing.formato,
      ocasiao_feira: editing.ocasiaoFeira ?? "",
      data_publicacao: editing.dataPublicacao ?? "",
      status: editing.status,
      legenda_ia: editing.legendaIa ?? "",
      roteiro_cenas_ia: editing.roteiroCenasIa ?? [],
      link_canva: editing.linkCanva ?? "",
      produto_destaque: "",
      observacoes_extras: "",
    };
  }

  return {
    tema: seed?.tema ?? "",
    formato: seed?.formato ?? "CARROSSEL",
    ocasiao_feira: seed?.ocasiaoFeira ?? "",
    data_publicacao: seed?.dataPublicacao ?? "",
    status: "IDEIA",
    legenda_ia: "",
    roteiro_cenas_ia: [],
    link_canva: "",
    produto_destaque: seed?.produtoDestaque ?? "",
    observacoes_extras: "",
  };
}

const FORMATO_OPTIONS: FormatoConteudo[] = [
  "CARROSSEL",
  "REELS_SEM_APARECER",
  "FOTO_UNICA",
];

function getNormalizedCanvaHref(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const normalized = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(normalized);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function ConteudoEditorDialog({
  open,
  onOpenChange,
  editing,
  seed,
  onRequestDelete,
}: ConteudoEditorDialogProps) {
  const router = useRouter();
  const [isSaving, startTransition] = useTransition();
  const [isGeneratingIa, setIsGeneratingIa] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(editing, seed)
  );
  const [dicaCanvaOuMusica, setDicaCanvaOuMusica] = useState<string | null>(
    null
  );
  const [formError, setFormError] = useState<string | null>(null);

  const textoLegendaCopia = useMemo(
    () => formatLegendaParaCopia(form.legenda_ia),
    [form.legenda_ia]
  );

  const textoRoteiroCopia = useMemo(
    () =>
      formatRoteiroParaCopia({
        tema: form.tema || "Post FGV",
        formato: form.formato,
        ocasiaoFeira: form.ocasiao_feira || null,
        cenas: form.roteiro_cenas_ia,
      }),
    [form.formato, form.ocasiao_feira, form.roteiro_cenas_ia, form.tema]
  );

  const canvaHref = useMemo(
    () => getNormalizedCanvaHref(form.link_canva),
    [form.link_canva]
  );

  const handleGenerateWithIa = async () => {
    setFormError(null);
    if (form.tema.trim().length < 3) {
      setFormError(
        "Escreva primeiro o tema ou produto do post para a IA criar a legenda e o roteiro."
      );
      return;
    }

    setIsGeneratingIa(true);
    try {
      const response = await fetch("/api/ia/conteudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conteudo_id: editing?.id ?? null,
          tema: form.tema.trim(),
          formato: form.formato,
          ocasiao_feira: form.ocasiao_feira.trim() || null,
          produto_destaque: form.produto_destaque.trim() || null,
          observacoes_extras: form.observacoes_extras.trim() || null,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        legenda_completa?: string;
        dica_musica_ou_canva?: string;
        roteiro_cenas?: RoteiroCenas;
      };

      if (!response.ok || !payload.legenda_completa || !payload.roteiro_cenas) {
        const message =
          payload.error ??
          "Não foi possível gerar o conteúdo agora. Tente novamente.";
        setFormError(message);
        toast.error(message);
        return;
      }

      setForm((prev) => ({
        ...prev,
        legenda_ia: payload.legenda_completa ?? prev.legenda_ia,
        roteiro_cenas_ia: payload.roteiro_cenas ?? prev.roteiro_cenas_ia,
        status: prev.status === "IDEIA" ? "ROTEIRO_PRONTO" : prev.status,
      }));
      setDicaCanvaOuMusica(payload.dica_musica_ou_canva ?? null);

      toast.success(
        editing
          ? "Legenda e roteiro criados e salvos com sucesso!"
          : "Legenda e roteiro criados! Revise e clique em Salvar Post."
      );

      if (editing) {
        router.refresh();
      }
    } catch {
      const message =
        "Falha de conexão ao chamar a IA. Verifique sua internet e tente novamente.";
      setFormError(message);
      toast.error(message);
    } finally {
      setIsGeneratingIa(false);
    }
  };

  const handleUpdateCena = (
    index: number,
    field: keyof Omit<RoteiroCena, "ordem">,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      roteiro_cenas_ia: prev.roteiro_cenas_ia.map((cena, idx) =>
        idx === index ? { ...cena, [field]: value } : cena
      ),
    }));
  };

  const handleAddCena = () => {
    setForm((prev) => {
      const nextOrdem = prev.roteiro_cenas_ia.length + 1;
      const defaultLabel =
        prev.formato === "REELS_SEM_APARECER"
          ? `Cena ${nextOrdem}`
          : prev.formato === "FOTO_UNICA"
            ? nextOrdem === 1
              ? "Foto Principal"
              : `Detalhe ${nextOrdem}`
            : `Slide ${nextOrdem}`;

      return {
        ...prev,
        roteiro_cenas_ia: [
          ...prev.roteiro_cenas_ia,
          {
            ordem: nextOrdem,
            duracao_ou_slide: defaultLabel,
            visual_sugerido: "",
            texto_tela: "",
          },
        ],
      };
    });
  };

  const handleRemoveCena = (index: number) => {
    setForm((prev) => ({
      ...prev,
      roteiro_cenas_ia: prev.roteiro_cenas_ia
        .filter((_, idx) => idx !== index)
        .map((cena, idx) => ({ ...cena, ordem: idx + 1 })),
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const cenasValidas = form.roteiro_cenas_ia
      .filter(
        (c) =>
          c.duracao_ou_slide.trim() ||
          c.visual_sugerido.trim() ||
          c.texto_tela.trim()
      )
      .map((c, idx) => ({
        ordem: idx + 1,
        duracao_ou_slide:
          c.duracao_ou_slide.trim() || `Slide ${idx + 1}`,
        visual_sugerido:
          c.visual_sugerido.trim() || "Foto do produto em destaque",
        texto_tela: c.texto_tela.trim() || "—",
      }));

    const payload = {
      tema: form.tema.trim(),
      formato: form.formato,
      ocasiao_feira: form.ocasiao_feira.trim() || null,
      data_publicacao: form.data_publicacao.trim() || null,
      status: form.status,
      legenda_ia: form.legenda_ia.trim() || null,
      roteiro_cenas_ia: cenasValidas.length > 0 ? cenasValidas : null,
      link_canva: form.link_canva.trim() || null,
    };

    startTransition(async () => {
      const result = editing
        ? await updateConteudoAction(editing.id, payload)
        : await createConteudoAction(payload);

      if (!result.success) {
        setFormError(result.error ?? "Não foi possível salvar o conteúdo.");
        return;
      }

      toast.success(
        editing
          ? "Post atualizado com sucesso!"
          : "Post salvo no calendário editorial!"
      );
      onOpenChange(false);
      router.refresh();
    });
  };

  const hasIaContent =
    Boolean(form.legenda_ia.trim()) || form.roteiro_cenas_ia.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar Post e Roteiro" : "Novo Post para Instagram"}
          </DialogTitle>
          <DialogDescription>
            Defina o tema e clique para a IA montar a legenda com hashtags e o
            roteiro de slides ou vídeo sem aparecer — pronto para copiar no
            Canva e no Instagram.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bloco 1: Informações principais */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="conteudo-tema">Tema ou assunto do post *</Label>
              <Input
                id="conteudo-tema"
                placeholder="Ex.: Bonés bordados 3D para equipes de estande na Agrishow"
                value={form.tema}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, tema: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Formato do post *</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {FORMATO_OPTIONS.map((formatoKey) => {
                  const meta = FORMATO_CONTEUDO_META[formatoKey];
                  const selected = form.formato === formatoKey;
                  return (
                    <button
                      key={formatoKey}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, formato: formatoKey }))
                      }
                      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
                        {formatoKey === "CARROSSEL" ? (
                          <Layers className="size-4 text-primary" />
                        ) : formatoKey === "REELS_SEM_APARECER" ? (
                          <Film className="size-4 text-primary" />
                        ) : (
                          <ImageIcon className="size-4 text-primary" />
                        )}
                        {meta.label}
                      </span>
                      <span className="text-[11px] leading-snug text-muted-foreground">
                        {meta.description}
                      </span>
                    </button>
                  );
                })}
              </div>
              {form.formato === "REELS_SEM_APARECER" ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  <strong>100% sem aparecer:</strong> o roteiro usa apenas fotos
                  e trechos curtos dos produtos com texto na tela e música — sem
                  precisar gravar rosto ou falar para a câmera.
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="conteudo-ocasiao">
                  Ocasião ou Feira (opcional)
                </Label>
                <Input
                  id="conteudo-ocasiao"
                  list="ocasioes-editoriais-sugestoes"
                  placeholder="Ex.: Agrishow, SIPAT, Fim de Ano"
                  value={form.ocasiao_feira}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      ocasiao_feira: e.target.value,
                    }))
                  }
                />
                <datalist id="ocasioes-editoriais-sugestoes">
                  {PRESETS_CALENDARIO_EDITORIAL.map((preset) => (
                    <option key={preset.id} value={preset.nome} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="conteudo-data">Data de Publicação</Label>
                <Input
                  id="conteudo-data"
                  type="date"
                  value={form.data_publicacao}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      data_publicacao: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="conteudo-status">Etapa atual</Label>
                <Select
                  id="conteudo-status"
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as StatusConteudo,
                    }))
                  }
                >
                  {STATUS_CONTEUDO_ORDEM.map((st) => (
                    <option key={st} value={st}>
                      {STATUS_CONTEUDO_META[st].label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          {/* Bloco 2: Assistente de IA */}
          <div className="space-y-3 rounded-2xl border border-primary/25 bg-secondary/45 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Sparkles className="size-4 text-primary" />
                  Assistente de Legenda e Roteiro (IA)
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Gera legenda pronta com chamada para orçamento, hashtags e
                  roteiro passo a passo para montar no Canva.
                </p>
              </div>

              <Button
                type="button"
                size="lg"
                onClick={handleGenerateWithIa}
                disabled={isGeneratingIa || isSaving}
                className="shrink-0 font-semibold"
              >
                {isGeneratingIa ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Criando legenda e roteiro...
                  </>
                ) : (
                  <>
                    <Wand2 className="size-4" />
                    {hasIaContent
                      ? "Gerar Nova Versão com IA"
                      : "Gerar Legenda e Roteiro com IA"}
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label
                  htmlFor="conteudo-produto-destaque"
                  className="text-xs text-muted-foreground"
                >
                  Produto em destaque (opcional, ajuda a IA)
                </Label>
                <Input
                  id="conteudo-produto-destaque"
                  placeholder="Ex.: Boné bordado alto relevo, Camisa UV, Polo"
                  value={form.produto_destaque}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      produto_destaque: e.target.value,
                    }))
                  }
                  className="h-9 bg-card text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label
                  htmlFor="conteudo-obs-extras"
                  className="text-xs text-muted-foreground"
                >
                  Detalhe especial para mencionar (opcional)
                </Label>
                <Input
                  id="conteudo-obs-extras"
                  placeholder="Ex.: Produção sob encomenda, atendimento para grandes contas"
                  value={form.observacoes_extras}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      observacoes_extras: e.target.value,
                    }))
                  }
                  className="h-9 bg-card text-xs"
                />
              </div>
            </div>
          </div>

          {/* Bloco 3: Legenda para o Instagram */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="conteudo-legenda" className="text-sm font-semibold">
                Legenda pronta para o Instagram (com hashtags)
              </Label>
              <CopyButton
                text={textoLegendaCopia}
                label="Copiar Legenda"
                variant="secondary"
                size="sm"
                successMessage="Legenda copiada! Agora é só colar no Instagram."
                emptyMessage="Gere ou escreva uma legenda antes de copiar."
              />
            </div>
            <Textarea
              id="conteudo-legenda"
              rows={7}
              placeholder="Clique em 'Gerar Legenda e Roteiro com IA' acima ou escreva sua legenda aqui..."
              value={form.legenda_ia}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, legenda_ia: e.target.value }))
              }
              className="leading-relaxed"
            />
            {form.legenda_ia.trim() ? (
              <p className="text-right text-[11px] text-muted-foreground tabular-nums">
                {form.legenda_ia.trim().length} caracteres
              </p>
            ) : null}
          </div>

          {/* Bloco 4: Roteiro de Cenas / Slides para Canva */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Label className="text-sm font-semibold">
                  Roteiro passo a passo para o Canva (sem aparecer)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Cada card mostra qual foto/vídeo do produto usar e o texto
                  curto para colar na tela.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CopyButton
                  text={textoRoteiroCopia}
                  label="Copiar Roteiro"
                  variant="secondary"
                  size="sm"
                  successMessage="Roteiro completo copiado! Pronto para usar no Canva."
                  emptyMessage="Gere ou adicione cenas no roteiro antes de copiar."
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCena}
                >
                  <Plus className="size-3.5" />
                  Adicionar slide/cena
                </Button>
              </div>
            </div>

            {dicaCanvaOuMusica ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-950">
                <strong>Dica de música / visual no Canva:</strong>{" "}
                {dicaCanvaOuMusica}
              </div>
            ) : null}

            {form.roteiro_cenas_ia.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center text-xs text-muted-foreground">
                Nenhum slide ou cena criado ainda. Clique em{" "}
                <strong>Gerar Legenda e Roteiro com IA</strong> acima ou
                adicione manualmente.
              </div>
            ) : (
              <div className="space-y-3">
                {form.roteiro_cenas_ia.map((cena, index) => (
                  <div
                    key={`${cena.ordem}-${index}`}
                    className="space-y-3 rounded-xl border border-border bg-muted/25 p-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-1 items-center gap-2">
                        <Badge variant="default" className="shrink-0">
                          {index + 1}
                        </Badge>
                        <Input
                          value={cena.duracao_ou_slide}
                          onChange={(e) =>
                            handleUpdateCena(
                              index,
                              "duracao_ou_slide",
                              e.target.value
                            )
                          }
                          placeholder="Ex.: Slide 1 (Capa) ou 0-3s"
                          className="h-8 max-w-[220px] bg-card text-xs font-semibold"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <CopyButton
                          text={cena.texto_tela}
                          label="Copiar texto"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          successMessage={`Texto de "${cena.duracao_ou_slide}" copiado!`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemoveCena(index)}
                          aria-label="Remover slide ou cena"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Camera className="size-3" />O que mostrar (foto /
                          vídeo do produto)
                        </Label>
                        <Textarea
                          rows={2}
                          value={cena.visual_sugerido}
                          onChange={(e) =>
                            handleUpdateCena(
                              index,
                              "visual_sugerido",
                              e.target.value
                            )
                          }
                          placeholder="Ex.: Foto de perto do bordado do boné sobre mesa clara"
                          className="bg-card text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Texto curto na tela (colar no Canva)
                        </Label>
                        <Textarea
                          rows={2}
                          value={cena.texto_tela}
                          onChange={(e) =>
                            handleUpdateCena(index, "texto_tela", e.target.value)
                          }
                          placeholder="Ex.: Sua marca em destaque na Agrishow"
                          className="bg-card text-xs font-medium"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bloco 5: Link da Arte no Canva */}
          <div className="space-y-1.5">
            <Label
              htmlFor="conteudo-canva"
              className="flex items-center gap-1.5"
            >
              <Palette className="size-4 text-primary" />
              Link da arte no Canva (opcional)
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="conteudo-canva"
                placeholder="https://www.canva.com/design/..."
                value={form.link_canva}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, link_canva: e.target.value }))
                }
                className="flex-1"
              />
              {canvaHref ? (
                <Button
                  asChild
                  type="button"
                  variant="outline"
                  className="shrink-0"
                >
                  <a
                    href={canvaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4" />
                    Abrir no Canva
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          {formError ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <DialogFooter className="flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {editing && onRequestDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onRequestDelete(editing)}
                  disabled={isSaving || isGeneratingIa}
                >
                  <Trash2 className="size-4" />
                  Excluir Post
                </Button>
              ) : null}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving || isGeneratingIa}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving || isGeneratingIa}
                className="font-semibold"
              >
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                {editing ? "Salvar Alterações" : "Salvar Post"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
