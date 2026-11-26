import type { Metadata } from "next";
import { BriefcaseBusiness, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/middleware";

export const metadata: Metadata = {
  title: "Entrar",
};

interface LoginPageProps {
  searchParams: Promise<{ next?: string; config?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const configPendente =
    params.config === "pendente" || !isSupabaseConfigured();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#eef5f0] via-background to-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="bg-primary text-primary-foreground mb-4 flex size-14 items-center justify-center rounded-2xl shadow-sm">
            <BriefcaseBusiness className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            FGV Representações Comerciais
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestão de orçamentos, pedidos e relacionamento com clientes
          </p>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Acessar o painel</CardTitle>
            <CardDescription>
              Use seu e-mail e senha internos para entrar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm
              nextPath={params.next}
              configPendente={configPendente}
            />
          </CardContent>
        </Card>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          <span>Acesso restrito à equipe FGV</span>
        </div>
      </div>
    </main>
  );
}
