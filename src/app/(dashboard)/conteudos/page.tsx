import type { Metadata } from "next";
import { listConteudos } from "@/lib/services/conteudos";
import { getTodayIsoDate } from "@/lib/formatters";
import { ConteudosView } from "@/components/conteudos/conteudos-view";

export const metadata: Metadata = {
  title: "Conteúdo e Posts",
};

export const dynamic = "force-dynamic";

export default async function ConteudosPage() {
  const [conteudos, hojeIso] = await Promise.all([
    listConteudos(),
    Promise.resolve(getTodayIsoDate()),
  ]);

  return <ConteudosView conteudos={conteudos} hojeIso={hojeIso} />;
}
