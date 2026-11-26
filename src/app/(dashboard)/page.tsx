import Link from "next/link";
import {
  BellRing,
  ClipboardList,
  Factory,
  Plus,
  TrendingUp,
  Truck,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { formatCurrencyBRL } from "@/lib/formatters";

export default function PainelDoDiaPage() {
  return (
    <div className="space-y-8">
      {/* Cabeçalho e 3 botões grandes de atalho */}
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Bom trabalho! O que vamos fazer agora?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use os atalhos abaixo para iniciar um orçamento, lançar um pedido ou
            cadastrar um cliente.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Button asChild size="lg" className="h-12 text-base font-semibold">
            <Link href="/pedidos/novo">
              <Plus className="size-5" />
              Novo Orçamento
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="h-12 text-base font-semibold"
          >
            <Link href="/pedidos/novo?modo=pedido">
              <ClipboardList className="size-5" />
              Lançar Pedido
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 text-base font-semibold"
          >
            <Link href="/clientes/novo">
              <UserPlus className="size-5" />
              Novo Cliente
            </Link>
          </Button>
        </div>
      </section>

      {/* Resumo rápido do mês */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pedidos fechados no mês
            </CardTitle>
            <TrendingUp className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">0</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Os indicadores serão preenchidos com os pedidos lançados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total vendido no mês
            </CardTitle>
            <ClipboardList className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight tabular-nums">
              {formatCurrencyBRL(0)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Soma automática dos pedidos aprovados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fábricas em andamento
            </CardTitle>
            <Factory className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">0</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Pedidos em produção ou em trânsito
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Cards de ação do dia */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BellRing className="size-5 text-amber-600" />
              Orçamentos para Cobrar
            </CardTitle>
            <CardDescription>
              Orçamentos com retorno previsto para hoje ou em atraso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={BellRing}
              title="Nenhum orçamento pendente de cobrança"
              description="Assim que os orçamentos forem cadastrados com data de retorno, os lembretes aparecerão aqui automaticamente."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Truck className="size-5 text-primary" />
              Fábricas e Entregas Próximas
            </CardTitle>
            <CardDescription>
              Pedidos em produção próximos da saída da fábrica e entregas em
              trânsito.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Truck}
              title="Nenhuma entrega próxima no momento"
              description="Pedidos em produção e em trânsito serão acompanhados aqui com alertas de prazo."
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
