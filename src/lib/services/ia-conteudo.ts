import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { FORMATO_CONTEUDO_META } from "@/lib/constants";
import {
  respostaIaConteudoSchema,
  type GerarConteudoIaInput,
  type RespostaIaConteudo,
} from "@/lib/validators/conteudo";

export class IaConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IaConfigError";
  }
}

export class IaGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IaGenerationError";
  }
}

export interface ResultadoGeracaoIa extends RespostaIaConteudo {
  legenda_completa: string;
  modelo_usado: string;
}

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    legenda: {
      type: Type.STRING,
      description:
        "Texto principal da legenda para Instagram em Português do Brasil, sem incluir as hashtags nem a chamada final repetida.",
    },
    chamada_orcamento: {
      type: Type.STRING,
      description:
        "Chamada clara de 1 a 2 linhas convidando empresas a pedirem orçamento via Direct, WhatsApp ou e-mail comercialfgv@terra.com.br.",
    },
    hashtags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Lista de 6 a 12 hashtags relevantes em português para brindes corporativos, uniformes personalizados e agronegócio (cada item começando com #).",
    },
    dica_musica_ou_canva: {
      type: Type.STRING,
      description:
        "Dica prática de 1 a 2 frases sobre estilo de música (para Reels) ou paleta/layout no Canva (para Carrossel/Foto), sempre sem a pessoa aparecer.",
    },
    roteiro_cenas: {
      type: Type.ARRAY,
      description:
        "Sequência estruturada de cenas ou slides para montar no Canva ou Reels sem aparecer.",
      items: {
        type: Type.OBJECT,
        properties: {
          ordem: {
            type: Type.INTEGER,
            description: "Número sequencial da cena ou slide começando em 1.",
          },
          duracao_ou_slide: {
            type: Type.STRING,
            description:
              "Identificação do slide ou tempo, por exemplo: 'Slide 1 (Capa)' ou '0-3s'.",
          },
          visual_sugerido: {
            type: Type.STRING,
            description:
              "Descrição objetiva da foto ou trecho curto de vídeo mostrando apenas o produto, detalhe do bordado/tecido, estande ou entrega (NUNCA incluir pessoa falando para câmera).",
          },
          texto_tela: {
            type: Type.STRING,
            description:
              "Texto curto, direto e pronto para colar na tela do Canva.",
          },
        },
        required: ["ordem", "duracao_ou_slide", "visual_sugerido", "texto_tela"],
      },
    },
  },
  required: [
    "legenda",
    "chamada_orcamento",
    "hashtags",
    "dica_musica_ou_canva",
    "roteiro_cenas",
  ],
};

const SYSTEM_INSTRUCTION = `Você é um estrategista de marketing B2B especializado na FGV Representações Comerciais.

SOBRE A EMPRESA:
- Nome: FGV Representações Comerciais (e-mail: comercialfgv@terra.com.br).
- Produtos: brindes corporativos e uniformes personalizados de alto padrão — bonés bordados/silk em alto relevo, camisas sociais, camisas polo, camisas de pescaria com proteção UV, camisetas gola careca, guarda-chuvas, chaveiros e kits corporativos.
- Público-alvo: compradores corporativos, áreas de marketing/RH, agências de eventos e empresas/produtores do Agronegócio (participantes de feiras como Agrishow, Show Rural, Expo Direto, Hortitec, Femagri, Show Safra, Showtec, Agrotins, ANDAV, além de SIPAT e eventos corporativos).

REGRAS OBRIGATÓRIAS:
1. Escreva sempre em Português do Brasil (PT-BR) natural, consultivo, profissional e direto (sem exageros ou promessas irreais).
2. RESTRIÇÃO CRÍTICA: A responsável pelo Instagram NÃO aparece em vídeos e NÃO grava falas/narração para a câmera.
   - Em TODOS os formatos (especialmente REELS_SEM_APARECER), sugira APENAS fotos dos produtos, closes do bordado/acabamento, mockups, caixas/entregas prontas ou trechos curtos de mãos segurando/virando o produto + texto curto na tela + música de fundo.
   - NUNCA sugira "olhe para a câmera", "fale", "apresente-se em vídeo", "grave um depoimento seu" ou "narre com sua voz".
3. Valorize o planejamento antecipado (produção sob encomenda para feiras e datas corporativas) e a qualidade do acabamento/personalização.
4. Deixe os textos de tela bem curtos (fáceis de colar no Canva e ler no celular).
5. Retorne estritamente o JSON seguindo o schema fornecido.`;

function buildUserPrompt(input: GerarConteudoIaInput): string {
  const formatoInfo = FORMATO_CONTEUDO_META[input.formato];
  const estruturaSugerida =
    input.formato === "CARROSSEL"
      ? "Gere entre 5 e 7 slides (ex.: 'Slide 1 (Capa)', 'Slide 2', ..., 'Slide 6 (CTA)'), com texto curto para colar no Canva."
      : input.formato === "REELS_SEM_APARECER"
        ? "Gere entre 4 e 6 cenas rápidas com duração (ex.: '0-3s', '3-6s', '6-10s', '10-14s', '14-18s'), 100% SEM APARECER e SEM FALA — apenas fotos/vídeos curtos do produto, texto curto na tela e música de fundo."
        : "Gere 1 a 2 orientações de cena/layout (ex.: 'Foto Principal' e opcionalmente 'Story de Apoio') com indicação clara da foto do produto e texto curto de destaque no Canva.";

  const lines = [
    `Crie um conteúdo completo para o Instagram da FGV Representações Comerciais:`,
    `- Tema / Assunto: ${input.tema}`,
    `- Formato escolhido: ${formatoInfo.label} (${input.formato})`,
    input.ocasiao_feira
      ? `- Ocasião / Feira comercial: ${input.ocasiao_feira}`
      : null,
    input.produto_destaque
      ? `- Produto(s) em destaque: ${input.produto_destaque}`
      : null,
    input.observacoes_extras
      ? `- Observações adicionais da equipe: ${input.observacoes_extras}`
      : null,
    "",
    `Instrução de roteiro: ${estruturaSugerida}`,
    "Mantenha a legenda pronta para copiar e colar no Instagram, com quebras de linha leves para boa leitura.",
  ];

  return lines.filter((line): line is string => line !== null).join("\n");
}

function normalizeHashtags(rawTags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of rawTags) {
    const cleaned = tag.trim().replace(/\s+/g, "");
    if (!cleaned) continue;
    const withHash = cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
    const key = withHash.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(withHash);
    }
  }

  return result;
}

function formatLegendaCompleta(parsed: RespostaIaConteudo): string {
  const hashtags = normalizeHashtags(parsed.hashtags);
  const parts = [parsed.legenda.trim()];

  const cta = parsed.chamada_orcamento.trim();
  if (cta && !parsed.legenda.toLowerCase().includes(cta.toLowerCase().slice(0, 24))) {
    parts.push(cta);
  }

  if (hashtags.length > 0) {
    parts.push(hashtags.join(" "));
  }

  return parts.join("\n\n");
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  return trimmed;
}

export async function gerarConteudoComGemini(
  input: GerarConteudoIaInput
): Promise<ResultadoGeracaoIa> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === "sua_chave_gemini_aqui") {
    throw new IaConfigError(
      "A chave da inteligência artificial ainda não foi configurada neste ambiente. Adicione GEMINI_API_KEY nas configurações para gerar legendas e roteiros automaticamente."
    );
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  const ai = new GoogleGenAI({ apiKey });

  let rawText: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: buildUserPrompt(input),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });
    rawText = response.text;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    if (/api key|permission|unauthenticated|401|403/i.test(detail)) {
      throw new IaConfigError(
        "A chave da inteligência artificial foi recusada. Verifique se GEMINI_API_KEY está correta e ativa."
      );
    }
    if (/quota|rate|429|resource_exhausted/i.test(detail)) {
      throw new IaGenerationError(
        "O limite temporário de gerações da IA foi atingido. Aguarde alguns instantes e tente novamente."
      );
    }
    throw new IaGenerationError(
      "Não foi possível conectar ao assistente de criação agora. Tente novamente em alguns instantes."
    );
  }

  if (!rawText) {
    throw new IaGenerationError(
      "O assistente não retornou nenhum texto desta vez. Tente clicar em gerar novamente."
    );
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripJsonFences(rawText));
  } catch {
    throw new IaGenerationError(
      "A resposta gerada veio incompleta. Clique em gerar novamente para criar uma nova versão."
    );
  }

  const validated = respostaIaConteudoSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new IaGenerationError(
      "Não foi possível organizar o roteiro retornado. Tente gerar novamente."
    );
  }

  const normalizedHashtags = normalizeHashtags(validated.data.hashtags);
  const roteiroOrdenado = validated.data.roteiro_cenas.map((cena, idx) => ({
    ...cena,
    ordem: idx + 1,
  }));

  const normalizedData: RespostaIaConteudo = {
    ...validated.data,
    hashtags: normalizedHashtags,
    roteiro_cenas: roteiroOrdenado,
  };

  return {
    ...normalizedData,
    legenda_completa: formatLegendaCompleta(normalizedData),
    modelo_usado: model,
  };
}
