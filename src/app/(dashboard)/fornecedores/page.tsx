import type { Metadata } from "next";
import { listFornecedores } from "@/lib/services/fornecedores";
import { FornecedoresView } from "@/components/fornecedores/fornecedores-view";

export const metadata: Metadata = {
  title: "Fornecedores",
};

export default async function FornecedoresPage() {
  const fornecedores = await listFornecedores();
  return <FornecedoresView fornecedores={fornecedores} />;
}
