import type { Metadata } from "next";
import { listClientes } from "@/lib/services/clientes";
import { ClientesListView } from "@/components/clientes/clientes-list-view";

export const metadata: Metadata = {
  title: "Clientes",
};

export default async function ClientesPage() {
  const clientes = await listClientes();
  return <ClientesListView clientes={clientes} />;
}
