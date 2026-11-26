import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  getFormOptionsParaPedido,
  getPedidoById,
} from "@/lib/services/pedidos";
import { PedidoForm } from "@/components/pedidos/pedido-form";

interface EditarPedidoPageProps {
  params: Promise<{ id: string }>;
}

const uuidSchema = z.string().uuid();

export const metadata: Metadata = {
  title: "Editar Pedido / Orçamento",
};

export default async function EditarPedidoPage({
  params,
}: EditarPedidoPageProps) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    notFound();
  }

  const [pedido, options] = await Promise.all([
    getPedidoById(id),
    getFormOptionsParaPedido(),
  ]);

  if (!pedido) {
    notFound();
  }

  return <PedidoForm options={options} editingPedido={pedido} />;
}
