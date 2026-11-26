import type { Metadata } from "next";
import { Factory } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Fornecedores",
};

export default function FornecedoresPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Fornecedores e Fábricas</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon={Factory}
          title="Gestão de fabricantes chegando na Sprint 2"
          description="Os fabricantes iniciais (DKS Bonés, Agatha e Elo Brindes) já estão configurados no seed do banco. Na Sprint 2 você poderá editar templates de PDF e numeração por fábrica."
        />
      </CardContent>
    </Card>
  );
}
