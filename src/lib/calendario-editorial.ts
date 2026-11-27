import {
  FORMATO_CONTEUDO_META,
  type FormatoConteudo,
} from "@/lib/constants";
import { diffIsoDays } from "@/lib/formatters";
import type { RoteiroCenas } from "@/lib/validators/conteudo";

export type CategoriaEventoEditorial = "FEIRA_AGRO" | "DATA_CORPORATIVA";

export interface EventoEditorialPreset {
  id: string;
  nome: string;
  categoria: CategoriaEventoEditorial;
  mesEvento: number; // 1-12
  diaEvento: number; // dia aproximado de início
  periodoLabel: string;
  localOuContexto: string;
  produtosSugeridos: string;
  temaSugerido: string;
  formatoSugerido: FormatoConteudo;
  recorrenteAnoTodo?: boolean;
}

export interface OportunidadeEditorial extends EventoEditorialPreset {
  proximaDataEventoIso: string;
  diasAteEvento: number;
  faixaAntecedencia: "JANELA_IDEAL" | "ULTIMA_CHAMADA" | "PLANEJAR_DEPOIS";
  mensagemAntecedencia: string;
}

/**
 * Principais feiras do Agronegócio e datas corporativas B2B relevantes para a FGV.
 * O sistema destaca automaticamente oportunidades com 60 a 90 dias de antecedência
 * (janela ideal para empresas cotarem, aprovarem arte e produzirem brindes/uniformes).
 */
export const PRESETS_CALENDARIO_EDITORIAL: EventoEditorialPreset[] = [
  // ==========================================
  // FEIRAS DO AGRONEGÓCIO
  // ==========================================
  {
    id: "show-rural-coopavel",
    nome: "Show Rural Coopavel",
    categoria: "FEIRA_AGRO",
    mesEvento: 2,
    diaEvento: 9,
    periodoLabel: "Fevereiro",
    localOuContexto: "Cascavel / PR • Abertura do calendário de feiras do Agro",
    produtosSugeridos: "Bonés bordados 3D, camisas de pescaria UV e polos para equipe de estande",
    temaSugerido:
      "Sua marca pronta para o Show Rural: uniformes e bonés personalizados para equipe e clientes",
    formatoSugerido: "CARROSSEL",
  },
  {
    id: "expo-direto-cotrijal",
    nome: "Expo Direto Cotrijal",
    categoria: "FEIRA_AGRO",
    mesEvento: 3,
    diaEvento: 9,
    periodoLabel: "Março",
    localOuContexto: "Não-Me-Toque / RS • Grande vitrine do Agro no Sul",
    produtosSugeridos: "Bonés trucker, camisas polo com bordado no peito e guarda-chuvas corporativos",
    temaSugerido:
      "Checklist de brindes e uniformes para se destacar na Expo Direto Cotrijal",
    formatoSugerido: "REELS_SEM_APARECER",
  },
  {
    id: "femagri",
    nome: "FEMAGRI",
    categoria: "FEIRA_AGRO",
    mesEvento: 3,
    diaEvento: 18,
    periodoLabel: "Março",
    localOuContexto: "Guaxupé / MG • Feira de Máquinas, Implementos e Insumos (Café)",
    produtosSugeridos: "Bonés com bordado em alto relevo, camisas sociais e chaveiros personalizados",
    temaSugerido:
      "Bonés e uniformes que fortalecem a presença da sua empresa na FEMAGRI",
    formatoSugerido: "CARROSSEL",
  },
  {
    id: "show-safra",
    nome: "Show Safra",
    categoria: "FEIRA_AGRO",
    mesEvento: 3,
    diaEvento: 24,
    periodoLabel: "Março",
    localOuContexto: "Lucas do Rio Verde / MT • Forte presença de revendas e produtores",
    produtosSugeridos: "Camisas de pescaria proteção UV, bonés personalizados e kits para clientes",
    temaSugerido:
      "Camisas UV e bonés sob medida para o calor e o ritmo do Show Safra",
    formatoSugerido: "REELS_SEM_APARECER",
  },
  {
    id: "agrishow",
    nome: "Agrishow",
    categoria: "FEIRA_AGRO",
    mesEvento: 4,
    diaEvento: 27,
    periodoLabel: "Abril / Maio",
    localOuContexto: "Ribeirão Preto / SP • Maior feira de tecnologia agrícola da América Latina",
    produtosSugeridos: "Bonés bordados, polos da equipe, camisas sociais, guarda-chuvas e kits VIP",
    temaSugerido:
      "Agrishow está chegando: garanta com antecedência os uniformes e brindes do seu estande",
    formatoSugerido: "CARROSSEL",
  },
  {
    id: "agrotins",
    nome: "Agrotins",
    categoria: "FEIRA_AGRO",
    mesEvento: 5,
    diaEvento: 12,
    periodoLabel: "Maio",
    localOuContexto: "Palmas / TO • Feira de Tecnologia Agropecuária do Tocantins",
    produtosSugeridos: "Camisas de pescaria com proteção UV, bonés telados e brindes leves",
    temaSugerido:
      "Conforto térmico e identidade visual: uniformes ideais para a Agrotins",
    formatoSugerido: "REELS_SEM_APARECER",
  },
  {
    id: "showtec",
    nome: "Showtec",
    categoria: "FEIRA_AGRO",
    mesEvento: 5,
    diaEvento: 20,
    periodoLabel: "Maio",
    localOuContexto: "Maracaju / MS • Feira técnica voltada para produtividade no campo",
    produtosSugeridos: "Bonés personalizados, camisetas gola careca e camisas polo corporativas",
    temaSugerido:
      "Como escolher brindes que o produtor rural realmente usa depois da Showtec",
    formatoSugerido: "CARROSSEL",
  },
  {
    id: "hortitec",
    nome: "Hortitec",
    categoria: "FEIRA_AGRO",
    mesEvento: 6,
    diaEvento: 17,
    periodoLabel: "Junho",
    localOuContexto: "Holambra / SP • Principal exposição de horticultura e cultivo protegido",
    produtosSugeridos: "Camisas polo elegantes, bonés bordados e brindes corporativos para estande",
    temaSugerido:
      "Uniformes padronizados que passam profissionalismo no seu estande da Hortitec",
    formatoSugerido: "FOTO_UNICA",
  },
  {
    id: "congresso-andav",
    nome: "Congresso ANDAV",
    categoria: "FEIRA_AGRO",
    mesEvento: 8,
    diaEvento: 5,
    periodoLabel: "Agosto",
    localOuContexto: "São Paulo / SP • Encontro nacional de distribuidores de insumos",
    produtosSugeridos: "Camisas sociais bordadas, polos premium e kits executivos personalizados",
    temaSugerido:
      "Uniforme social e kits corporativos de alto padrão para o Congresso ANDAV",
    formatoSugerido: "CARROSSEL",
  },

  // ==========================================
  // DATAS CORPORATIVAS E CAMPANHAS B2B
  // ==========================================
  {
    id: "kits-onboarding",
    nome: "Kits Onboarding / Início de Ano",
    categoria: "DATA_CORPORATIVA",
    mesEvento: 1,
    diaEvento: 20,
    periodoLabel: "Janeiro (e o ano todo)",
    localOuContexto: "Boas-vindas a novos colaboradores e renovação anual de uniformes",
    produtosSugeridos: "Camisas polo, camisetas gola careca, bonés e chaveiros institucionais",
    temaSugerido:
      "Kit boas-vindas e renovação de uniformes: como valorizar sua equipe desde o primeiro dia",
    formatoSugerido: "CARROSSEL",
    recorrenteAnoTodo: true,
  },
  {
    id: "dia-da-mulher",
    nome: "Dia Internacional da Mulher",
    categoria: "DATA_CORPORATIVA",
    mesEvento: 3,
    diaEvento: 8,
    periodoLabel: "Março",
    localOuContexto: "Ações de endomarketing e presentes corporativos para colaboradoras e clientes",
    produtosSugeridos: "Kits corporativos delicados, guarda-chuvas personalizados e peças femininas",
    temaSugerido:
      "Ideias de brindes úteis e elegantes para homenagear colaboradoras e clientes no Dia da Mulher",
    formatoSugerido: "CARROSSEL",
  },
  {
    id: "dia-das-maes",
    nome: "Dia das Mães Corporativo",
    categoria: "DATA_CORPORATIVA",
    mesEvento: 5,
    diaEvento: 10,
    periodoLabel: "Maio",
    localOuContexto: "Campanhas de RH e relacionamento com clientes",
    produtosSugeridos: "Kits personalizados, guarda-chuvas e brindes corporativos com marca discreta",
    temaSugerido:
      "Planeje com antecedência os brindes corporativos da sua empresa para o Dia das Mães",
    formatoSugerido: "REELS_SEM_APARECER",
  },
  {
    id: "sipat",
    nome: "SIPAT (Segurança no Trabalho)",
    categoria: "DATA_CORPORATIVA",
    mesEvento: 7,
    diaEvento: 27,
    periodoLabel: "Julho / 2º Semestre",
    localOuContexto: "Semana Interna de Prevenção de Acidentes (forte demanda de fábricas e usinas)",
    produtosSugeridos: "Camisetas personalizadas da campanha, bonés, chaveiros e kits de participação",
    temaSugerido:
      "Brindes e camisetas personalizadas para engajar toda a equipe na SIPAT",
    formatoSugerido: "CARROSSEL",
    recorrenteAnoTodo: true,
  },
  {
    id: "dia-dos-pais",
    nome: "Dia dos Pais Corporativo",
    categoria: "DATA_CORPORATIVA",
    mesEvento: 8,
    diaEvento: 9,
    periodoLabel: "Agosto",
    localOuContexto: "Presentes de RH e brindes para clientes do agro e indústria",
    produtosSugeridos: "Camisas de pescaria, bonés bordados, polos e kits corporativos masculinos",
    temaSugerido:
      "Brindes que realmente surpreendem no Dia dos Pais corporativo (bonés, polos e kits)",
    formatoSugerido: "REELS_SEM_APARECER",
  },
  {
    id: "dia-do-cliente",
    nome: "Dia do Cliente",
    categoria: "DATA_CORPORATIVA",
    mesEvento: 9,
    diaEvento: 15,
    periodoLabel: "Setembro",
    localOuContexto: "Fidelização de grandes contas e ações comerciais B2B",
    produtosSugeridos: "Kits personalizados com logo, bonés premium e guarda-chuvas reforçados",
    temaSugerido:
      "Dia do Cliente: presentes corporativos personalizados para manter sua marca lembrada",
    formatoSugerido: "FOTO_UNICA",
  },
  {
    id: "fim-de-ano",
    nome: "Kits de Fim de Ano e Confraternização",
    categoria: "DATA_CORPORATIVA",
    mesEvento: 12,
    diaEvento: 15,
    periodoLabel: "Dezembro",
    localOuContexto: "Maior volume de pedidos corporativos — fábricas lotam cedo!",
    produtosSugeridos: "Kits corporativos completos, camisas polo, bonés, guarda-chuvas e chaveiros",
    temaSugerido:
      "Antecipe os kits de Fim de Ano da sua empresa e evite fila de produção nas fábricas",
    formatoSugerido: "CARROSSEL",
  },
];

function buildIsoDate(year: number, month: number, day: number): string {
  const safeMonth = String(month).padStart(2, "0");
  const safeDay = String(day).padStart(2, "0");
  return `${year}-${safeMonth}-${safeDay}`;
}

/**
 * Calcula a próxima ocorrência de cada feira/data corporativa a partir de hoje
 * e destaca a janela ideal de 60 a 90 dias de antecedência (expandida suavemente para 45–100 dias
 * para não perder oportunidades na virada do mês).
 */
export function getOportunidadesEditoriais(
  hojeIso: string
): OportunidadeEditorial[] {
  const [yearStr] = hojeIso.split("-");
  const currentYear = Number.parseInt(yearStr ?? "2026", 10);

  return PRESETS_CALENDARIO_EDITORIAL.map((preset) => {
    let eventIso = buildIsoDate(currentYear, preset.mesEvento, preset.diaEvento);
    let diasAteEvento = diffIsoDays(hojeIso, eventIso);

    if (diasAteEvento < -7) {
      eventIso = buildIsoDate(
        currentYear + 1,
        preset.mesEvento,
        preset.diaEvento
      );
      diasAteEvento = diffIsoDays(hojeIso, eventIso);
    }

    let faixaAntecedencia: OportunidadeEditorial["faixaAntecedencia"];
    let mensagemAntecedencia: string;

    if (diasAteEvento >= 45 && diasAteEvento <= 100) {
      faixaAntecedencia = "JANELA_IDEAL";
      mensagemAntecedencia = `Hora ideal de divulgar (${diasAteEvento} dias antes)`;
    } else if (diasAteEvento >= 0 && diasAteEvento < 45) {
      faixaAntecedencia = "ULTIMA_CHAMADA";
      mensagemAntecedencia =
        diasAteEvento === 0
          ? "Acontece hoje"
          : `Faltam ${diasAteEvento} dias (últimos pedidos)`;
    } else if (diasAteEvento < 0) {
      faixaAntecedencia = "ULTIMA_CHAMADA";
      mensagemAntecedencia = "Acontecendo nesta semana";
    } else {
      faixaAntecedencia = "PLANEJAR_DEPOIS";
      const meses = Math.round(diasAteEvento / 30);
      mensagemAntecedencia = `Daqui a ~${meses} meses`;
    }

    return {
      ...preset,
      proximaDataEventoIso: eventIso,
      diasAteEvento,
      faixaAntecedencia,
      mensagemAntecedencia,
    };
  }).sort((a, b) => {
    const priority = {
      JANELA_IDEAL: 0,
      ULTIMA_CHAMADA: 1,
      PLANEJAR_DEPOIS: 2,
    };
    if (priority[a.faixaAntecedencia] !== priority[b.faixaAntecedencia]) {
      return priority[a.faixaAntecedencia] - priority[b.faixaAntecedencia];
    }
    return a.diasAteEvento - b.diasAteEvento;
  });
}

export function formatLegendaParaCopia(legenda: string | null | undefined): string {
  return (legenda ?? "").trim();
}

export function formatRoteiroParaCopia(params: {
  tema: string;
  formato: FormatoConteudo;
  ocasiaoFeira?: string | null;
  cenas: RoteiroCenas | null | undefined;
}): string {
  const cenas = params.cenas ?? [];
  if (cenas.length === 0) return "";

  const formatoLabel = FORMATO_CONTEUDO_META[params.formato].label;
  const headerLines = [
    `ROTEIRO PARA CANVA — ${params.tema.toUpperCase()}`,
    `Formato: ${formatoLabel}${params.ocasiaoFeira ? ` | Ocasião: ${params.ocasiaoFeira}` : ""}`,
    "",
  ];

  const bodyLines = cenas
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .flatMap((cena) => [
      `${cena.ordem}. ${cena.duracao_ou_slide}`,
      `   Visual (foto/vídeo do produto): ${cena.visual_sugerido}`,
      `   Texto na tela (Canva): ${cena.texto_tela}`,
      "",
    ]);

  return [...headerLines, ...bodyLines].join("\n").trim();
}
