import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pedidos e Orçamentos",
};

export default function PedidosPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Pedidos e Orçamentos</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon={ClipboardList}
          title="Módulo pronto para a Sprint 2"
          description="Aqui você vai acompanhar todos os orçamentos e pedidos em um fluxo simples, gerar a ficha em PDF e baixar a pasta completa do pedido."
        />
      </CardContent>
    </Card>
  );
}
