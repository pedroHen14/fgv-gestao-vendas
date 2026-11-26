import type { Metadata } from "next";
import { ClienteNovoForm } from "@/components/clientes/cliente-novo-form";

export const metadata: Metadata = {
  title: "Novo Cliente",
};

export default function NovoClientePage() {
  return <ClienteNovoForm />;
}
