import type { Metadata } from "next";
import { listPedidos } from "@/lib/services/pedidos";
import { getTodayIsoDate } from "@/lib/formatters";
import {
  PedidosListView,
  type FiltroGrupo,
  type VisaoPedidos,
} from "@/components/pedidos/pedidos-list-view";

export const metadata: Metadata = {
  title: "Pedidos e Orçamentos",
};

const GRUPOS_VALIDOS = new Set<FiltroGrupo>([
  "TODOS",
  "ORCAMENTOS",
  "ANDAMENTO",
  "ENTREGUES",
  "ENCERRADOS",
]);

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ visao?: string; grupo?: string }>;
}) {
  const [pedidos, params] = await Promise.all([listPedidos(), searchParams]);
  const hojeIso = getTodayIsoDate();

  const initialVisao: VisaoPedidos =
    params.visao === "tabela" ? "tabela" : "kanban";
  const initialGrupo: FiltroGrupo =
    params.grupo && GRUPOS_VALIDOS.has(params.grupo as FiltroGrupo)
      ? (params.grupo as FiltroGrupo)
      : "TODOS";

  return (
    <PedidosListView
      pedidos={pedidos}
      hojeIso={hojeIso}
      initialVisao={initialVisao}
      initialGrupo={initialGrupo}
    />
  );
}
