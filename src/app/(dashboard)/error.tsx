"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error("Erro ao carregar tela do painel:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-10">
      <Card>
        <CardHeader>
          <div className="bg-destructive/10 text-destructive mb-3 flex size-12 items-center justify-center rounded-full">
            <AlertTriangle className="size-6" />
          </div>
          <CardTitle className="text-xl">
            Não foi possível carregar esta página
          </CardTitle>
          <CardDescription>
            Houve uma falha temporária ao consultar os dados no servidor. Tente
            novamente em alguns instantes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button type="button" onClick={reset}>
            <RotateCcw className="size-4" />
            Tentar novamente
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="size-4" />
              Voltar ao Painel do Dia
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
