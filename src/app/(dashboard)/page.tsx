import { getResumoPainelDoDia } from "@/lib/services/alertas";
import { PainelDoDiaView } from "@/components/dashboard/painel-do-dia-view";

export default async function PainelDoDiaPage() {
  const resumo = await getResumoPainelDoDia();
  return <PainelDoDiaView resumo={resumo} />;
}
