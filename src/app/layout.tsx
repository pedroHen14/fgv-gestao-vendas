import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "FGV Gestão — Vendas e Pedidos",
    template: "%s | FGV Gestão",
  },
  description:
    "Sistema interno da FGV Representações Comerciais para gestão de orçamentos, pedidos, clientes e fornecedores.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
