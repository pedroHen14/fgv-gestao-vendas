import {
  CalendarHeart,
  ClipboardList,
  Factory,
  LayoutDashboard,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const DASHBOARD_NAV_ITEMS: NavItem[] = [
  {
    label: "Painel do Dia",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Pedidos e Orçamentos",
    href: "/pedidos",
    icon: ClipboardList,
  },
  {
    label: "Clientes",
    href: "/clientes",
    icon: Users,
  },
  {
    label: "Fornecedores",
    href: "/fornecedores",
    icon: Factory,
  },
  {
    label: "Conteúdo e Posts",
    href: "/conteudos",
    icon: CalendarHeart,
    badge: "Em breve",
  },
];
