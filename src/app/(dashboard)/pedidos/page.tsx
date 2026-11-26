import type { Metadata } from "next";
import { listPedidos } from "@/lib/services/pedidos";
import { PedidosListView } from "@/components/pedidos/pedidos-list-view";

export const metadata: Metadata = {
  title: "Pedidos e Orçamentos",
};

export default async function PedidosPage() {
  const pedidos = await listPedidos();
  return <PedidosListView pedidos={pedidos} />;
}
