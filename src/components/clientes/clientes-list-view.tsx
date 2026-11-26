"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  MapPin,
  Search,
  Tractor,
  UserPlus,
  Users,
} from "lucide-react";
import type { ClienteResumo } from "@/lib/services/clientes";
import { TIPO_PESSOA_CURTO, type TipoPessoa } from "@/lib/constants";
import {
  formatCpfCnpj,
  formatCurrencyBRL,
  onlyDigits,
} from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/layout/empty-state";

interface ClientesListViewProps {
  clientes: ClienteResumo[];
}

export function ClientesListView({ clientes }: ClientesListViewProps) {
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"TODOS" | TipoPessoa>("TODOS");

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const termoDigitos = onlyDigits(termo);

    return clientes.filter((c) => {
      if (tipoFiltro !== "TODOS" && c.tipoPessoa !== tipoFiltro) {
        return false;
      }
      if (!termo) return true;

      if (c.razaoSocial.toLowerCase().includes(termo)) return true;
      if (c.origemIndicacao?.toLowerCase().includes(termo)) return true;
      if (c.cidadeUfPrincipal?.toLowerCase().includes(termo)) return true;
      if (c.cpfCnpj) {
        if (c.cpfCnpj.toLowerCase().includes(termo)) return true;
        if (termoDigitos && onlyDigits(c.cpfCnpj).includes(termoDigitos)) {
          return true;
        }
      }
      if (
        c.compradoresResumo.some(
          (comp) =>
            comp.nome.toLowerCase().includes(termo) ||
            comp.email?.toLowerCase().includes(termo)
        )
      ) {
        return true;
      }
      return false;
    });
  }, [clientes, busca, tipoFiltro]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Clientes
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Busque por empresa, produtor rural, CPF/CNPJ ou nome do comprador.
          </p>
        </div>

        <Button asChild size="lg" className="font-semibold">
          <Link href="/clientes/novo">
            <UserPlus className="size-4" />
            Novo Cliente
          </Link>
        </Button>
      </div>

      {/* Barra de busca e filtros */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nome, CNPJ/CPF, comprador, e-mail ou cidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { value: "TODOS", label: "Todos" },
              { value: "PJ", label: "Empresas (PJ)" },
              { value: "PF", label: "Produtores / PF" },
            ] as const
          ).map((opt) => (
            <Button
              key={opt.value}
              type="button"
              size="sm"
              variant={tipoFiltro === opt.value ? "default" : "outline"}
              onClick={() => setTipoFiltro(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {clientes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Users}
              title="Nenhum cliente cadastrado ainda"
              description="Cadastre sua primeira empresa ou produtor rural para organizar filiais, compradores e histórico de pedidos em um só lugar."
              action={
                <Button asChild size="lg">
                  <Link href="/clientes/novo">
                    <UserPlus className="size-4" />
                    Cadastrar Primeiro Cliente
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : filtrados.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Search}
              title="Nenhum cliente encontrado"
              description="Tente buscar com outro termo ou limpe os filtros acima."
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setBusca("");
                    setTipoFiltro("TODOS");
                  }}
                >
                  Limpar busca
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtrados.map((cliente) => (
            <Link
              key={cliente.id}
              href={`/clientes/${cliente.id}`}
              className="group block rounded-2xl border border-border bg-card p-5 shadow-xs transition-all hover:border-primary/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                    {cliente.tipoPessoa === "PJ" ? (
                      <Building2 className="size-5" />
                    ) : (
                      <Tractor className="size-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-semibold text-foreground group-hover:text-primary">
                      {cliente.razaoSocial}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[11px]">
                        {TIPO_PESSOA_CURTO[cliente.tipoPessoa]}
                      </Badge>
                      {cliente.cpfCnpj ? (
                        <span className="tabular-nums">
                          {formatCpfCnpj(cliente.cpfCnpj)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">Total vendido</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">
                    {formatCurrencyBRL(cliente.valorVendidoTotal)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                {cliente.cidadeUfPrincipal ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {cliente.cidadeUfPrincipal}
                  </span>
                ) : null}

                <span>
                  {cliente.compradoresResumo.length}{" "}
                  {cliente.compradoresResumo.length === 1
                    ? "comprador"
                    : "compradores"}
                  {cliente.compradoresResumo.length > 0
                    ? `: ${cliente.compradoresResumo
                        .slice(0, 2)
                        .map((c) => c.nome)
                        .join(", ")}${
                        cliente.compradoresResumo.length > 2 ? "..." : ""
                      }`
                    : ""}
                </span>

                <span className="ml-auto font-medium text-foreground">
                  {cliente.totalPedidos}{" "}
                  {cliente.totalPedidos === 1 ? "registro" : "registros"}
                </span>
              </div>

              {cliente.origemIndicacao ? (
                <p className="mt-2 truncate text-xs text-primary/80">
                  Origem: {cliente.origemIndicacao}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
