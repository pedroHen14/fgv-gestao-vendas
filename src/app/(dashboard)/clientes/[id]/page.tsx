import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getClienteById } from "@/lib/services/clientes";
import { ClienteDetalheView } from "@/components/clientes/cliente-detalhe-view";

interface ClientePageProps {
  params: Promise<{ id: string }>;
}

const uuidSchema = z.string().uuid();

export async function generateMetadata({
  params,
}: ClientePageProps): Promise<Metadata> {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    return { title: "Cliente não encontrado" };
  }
  const cliente = await getClienteById(id);
  return {
    title: cliente ? cliente.razaoSocial : "Cliente não encontrado",
  };
}

export default async function ClienteDetalhePage({ params }: ClientePageProps) {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) {
    notFound();
  }

  const cliente = await getClienteById(id);
  if (!cliente) {
    notFound();
  }

  return <ClienteDetalheView cliente={cliente} />;
}
