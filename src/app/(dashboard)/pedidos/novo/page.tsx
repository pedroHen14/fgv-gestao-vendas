import type { Metadata } from "next";
import { getFormOptionsParaPedido } from "@/lib/services/pedidos";
import { PedidoForm } from "@/components/pedidos/pedido-form";

export const metadata: Metadata = {
  title: "Novo Orçamento / Pedido",
};

interface NovoPedidoPageProps {
  searchParams: Promise<{ modo?: string; clienteId?: string }>;
}

export default async function NovoPedidoPage({
  searchParams,
}: NovoPedidoPageProps) {
  const [options, params] = await Promise.all([
    getFormOptionsParaPedido(),
    searchParams,
  ]);

  const initialModo = params.modo === "pedido" ? "pedido" : "orcamento";

  return (
    <PedidoForm
      options={options}
      initialModo={initialModo}
      initialClienteId={params.clienteId}
    />
  );
}
