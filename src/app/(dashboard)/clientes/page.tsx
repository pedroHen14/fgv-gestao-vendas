import type { Metadata } from "next";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Clientes",
};

export default function ClientesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon={Users}
          title="Cadastro de clientes chegando na Sprint 2"
          description="Aqui ficarão as fichas completas de cada empresa e produtor rural, com filiais, compradores, histórico de compras e linha do tempo de contatos."
        />
      </CardContent>
    </Card>
  );
}
