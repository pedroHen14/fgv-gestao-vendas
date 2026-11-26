import { getAuthenticatedUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/middleware";

export class AuthRequiredError extends Error {
  constructor(message = "Sua sessão expirou. Faça login novamente.") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

/**
 * Valida sessão autenticada em Server Actions e Route Handlers.
 * Lança AuthRequiredError se o usuário não estiver autenticado.
 */
export async function requireAuthenticatedUser() {
  if (!isSupabaseConfigured()) {
    throw new AuthRequiredError(
      "A conexão com o sistema ainda não foi configurada neste ambiente."
    );
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    throw new AuthRequiredError();
  }

  return user;
}
