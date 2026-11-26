import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getPedidoById } from "@/lib/services/pedidos";
import { PedidoDetalheView } from "@/components/pedidos/pedido-detalhe-view";

interface PedidoDetalhePageProps {
  params: Promise<{ id: string }>;
}

const uuidSchema = z.string().uuid();

export async function generateMetadata({
  params,
}: PedidoDetalhePageProps): Promise<Metadata> {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    return { title: "Pedido não encontrado" };
  }
  const pedido = await getPedidoById(id);
  if (!pedido) return { title: "Pedido não encontrado" };
  return {
    title: pedido.numeroPedido
      ? `Pedido ${pedido.numeroPedido}`
      : `Orçamento — ${pedido.cliente.razaoSocial}`,
  };
}

export default async function PedidoDetalhePage({
  params,
}: PedidoDetalhePageProps) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    notFound();
  }

  const pedido = await getPedidoById(id);
  if (!pedido) {
    notFound();
  }

  return <PedidoDetalheView pedido={pedido} />;
}
