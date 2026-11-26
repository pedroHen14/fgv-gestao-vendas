-- ==========================================
-- TRIGGERS DE updated_at AUTOMÁTICO
-- ==========================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_clientes_updated_at ON public.clientes;
--> statement-breakpoint
CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_pedidos_updated_at ON public.pedidos;
--> statement-breakpoint
CREATE TRIGGER trg_pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_conteudos_updated_at ON public.conteudos;
--> statement-breakpoint
CREATE TRIGGER trg_conteudos_updated_at
  BEFORE UPDATE ON public.conteudos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint

-- ==========================================
-- ROW LEVEL SECURITY (RLS) — SISTEMA INTERNO FECHADO
-- ==========================================
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.enderecos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.compradores ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.pedido_arquivos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.interacoes_cliente ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.conteudos ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS "authenticated_all" ON public.clientes;
--> statement-breakpoint
CREATE POLICY "authenticated_all" ON public.clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint

DROP POLICY IF EXISTS "authenticated_all" ON public.enderecos;
--> statement-breakpoint
CREATE POLICY "authenticated_all" ON public.enderecos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint

DROP POLICY IF EXISTS "authenticated_all" ON public.compradores;
--> statement-breakpoint
CREATE POLICY "authenticated_all" ON public.compradores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint

DROP POLICY IF EXISTS "authenticated_all" ON public.fornecedores;
--> statement-breakpoint
CREATE POLICY "authenticated_all" ON public.fornecedores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint

DROP POLICY IF EXISTS "authenticated_all" ON public.pedidos;
--> statement-breakpoint
CREATE POLICY "authenticated_all" ON public.pedidos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint

DROP POLICY IF EXISTS "authenticated_all" ON public.pedido_itens;
--> statement-breakpoint
CREATE POLICY "authenticated_all" ON public.pedido_itens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint

DROP POLICY IF EXISTS "authenticated_all" ON public.pedido_arquivos;
--> statement-breakpoint
CREATE POLICY "authenticated_all" ON public.pedido_arquivos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint

DROP POLICY IF EXISTS "authenticated_all" ON public.interacoes_cliente;
--> statement-breakpoint
CREATE POLICY "authenticated_all" ON public.interacoes_cliente
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint

DROP POLICY IF EXISTS "authenticated_all" ON public.conteudos;
--> statement-breakpoint
CREATE POLICY "authenticated_all" ON public.conteudos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
--> statement-breakpoint

-- ==========================================
-- SUPABASE STORAGE — BUCKET PRIVADO pedidos-arquivos
-- ==========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('pedidos-arquivos', 'pedidos-arquivos', false, 20971520)
ON CONFLICT (id) DO UPDATE
SET public = false, file_size_limit = 20971520;
--> statement-breakpoint

DROP POLICY IF EXISTS "pedidos_arquivos_select_authenticated" ON storage.objects;
--> statement-breakpoint
CREATE POLICY "pedidos_arquivos_select_authenticated" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pedidos-arquivos');
--> statement-breakpoint

DROP POLICY IF EXISTS "pedidos_arquivos_insert_authenticated" ON storage.objects;
--> statement-breakpoint
CREATE POLICY "pedidos_arquivos_insert_authenticated" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pedidos-arquivos');
--> statement-breakpoint

DROP POLICY IF EXISTS "pedidos_arquivos_update_authenticated" ON storage.objects;
--> statement-breakpoint
CREATE POLICY "pedidos_arquivos_update_authenticated" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'pedidos-arquivos')
  WITH CHECK (bucket_id = 'pedidos-arquivos');
--> statement-breakpoint

DROP POLICY IF EXISTS "pedidos_arquivos_delete_authenticated" ON storage.objects;
--> statement-breakpoint
CREATE POLICY "pedidos_arquivos_delete_authenticated" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pedidos-arquivos');
