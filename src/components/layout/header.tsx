"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { DASHBOARD_NAV_ITEMS } from "@/components/layout/nav-items";
import { SidebarContent } from "@/components/layout/sidebar";
import { logoutAction } from "@/app/(auth)/login/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface HeaderProps {
  userEmail: string;
}

function getInitials(email: string): string {
  const namePart = email.split("@")[0] ?? "FG";
  const cleaned = namePart.replace(/[^a-zA-Z0-9]/g, "");
  return (cleaned.slice(0, 2) || "FG").toUpperCase();
}

export function Header({ userEmail }: HeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();

  const currentNav = DASHBOARD_NAV_ITEMS.find((item) =>
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`)
  );

  const pageTitle = currentNav?.label ?? "FGV Gestão";

  const handleLogout = () => {
    startSignOut(async () => {
      await logoutAction();
    });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:px-8">
      <div className="flex items-center gap-3">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <SheetTitle className="sr-only">Menu principal</SheetTitle>
            <SheetDescription className="sr-only">
              Navegação do sistema FGV Gestão
            </SheetDescription>
            <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {pageTitle}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-10 items-center gap-2.5 rounded-full px-2 pr-3"
            >
              <Avatar className="size-8">
                <AvatarFallback>{getInitials(userEmail)}</AvatarFallback>
              </Avatar>
              <span className="hidden max-w-[200px] truncate text-sm font-medium text-foreground sm:inline">
                {userEmail}
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-xs text-muted-foreground">Conectado como</p>
                <p className="truncate text-sm font-medium text-foreground">
                  {userEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={handleLogout}
              disabled={isSigningOut}
            >
              <LogOut className="size-4" />
              {isSigningOut ? "Saindo..." : "Sair do sistema"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
