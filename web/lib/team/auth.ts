import { createClient } from "@supabase/supabase-js";
import { AppError } from "../store";
export type Identity = { id: string; email: string };
export function teamConfigured() {
  return Boolean(
    process.env.DATABASE_URL &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_ANON_KEY,
  );
}
export async function identity(request: Request): Promise<Identity> {
  if (!teamConfigured())
    throw new AppError("Team mode is not configured on this deployment.", 503);
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token || token.length > 8192)
    throw new AppError("Sign in to continue.", 401);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
      },
    },
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email || !data.user.email_confirmed_at)
    throw new AppError("Sign in with a confirmed email address.", 401);
  return { id: data.user.id, email: data.user.email.toLowerCase() };
}
