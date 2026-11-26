import type { Metadata } from "next";
import { CalendarHeart } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Conteúdo e Posts",
};

export default function ConteudosPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Conteúdo e Posts (Fase 2)</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          icon={CalendarHeart}
          title="Calendário editorial planejado para a Sprint 5"
          description="Nesta área você terá lembretes antecipados das feiras do agronegócio e apoio para criar legendas e roteiros práticos para o Instagram."
        />
      </CardContent>
    </Card>
  );
}
