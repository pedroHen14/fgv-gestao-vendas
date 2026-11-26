"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/middleware";
import { loginSchema } from "@/lib/validators/auth";

export interface LoginActionResult {
  error?: string;
}

function getSafeRedirectPath(nextPath?: string | null): string {
  if (!nextPath) return "/";
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return "/";
  if (nextPath.startsWith("/login")) return "/";
  return nextPath;
}

export async function loginAction(
  values: { email: string; password: string },
  nextPath?: string | null
): Promise<LoginActionResult> {
  if (!isSupabaseConfigured()) {
    return {
      error:
        "O acesso ao banco e login ainda não foi configurado neste ambiente (.env.local).",
    };
  }

  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    return { error: firstIssue ?? "Confira seu e-mail e senha." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      return {
        error: "E-mail ou senha incorretos. Confira os dados e tente novamente.",
      };
    }
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error: "Seu acesso ainda não foi confirmado. Fale com o administrador.",
      };
    }
    return {
      error:
        "Não foi possível entrar agora. Tente novamente em alguns instantes.",
    };
  }

  redirect(getSafeRedirectPath(nextPath));
}

export async function logoutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
