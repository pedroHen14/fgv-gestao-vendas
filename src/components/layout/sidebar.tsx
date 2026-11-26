"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { DASHBOARD_NAV_ITEMS } from "@/components/layout/nav-items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <div className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-xl shadow-xs">
          <BriefcaseBusiness className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold tracking-tight text-foreground">
            FGV Gestão
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Representações Comerciais
          </p>
        </div>
      </div>

      <div className="p-4">
        <Button asChild className="w-full justify-center font-semibold" size="lg">
          <Link href="/pedidos/novo" onClick={onNavigate}>
            <Plus className="size-4" />
            Novo Orçamento
          </Link>
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-3" aria-label="Menu principal">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span>{item.label}</span>
              </span>
              {item.badge ? (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {item.badge}
                </Badge>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground">
          comercialfgv@terra.com.br
        </p>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
      <div className="sticky top-0 h-screen">
        <SidebarContent />
      </div>
    </aside>
  );
}
