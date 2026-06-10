// Server-side auth helpers (NextAuth + Prisma) — replaces the
// `supabase.auth.getUser()` pattern. getUser() returns the current user's
// id + email (or null); requireUser() redirects anon visitors to /login.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { redirect } from "next/navigation";

export type SessionUser = { id: string; email: string | null };

export async function getUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = session?.user as any;
  if (!u?.id) return null;
  return { id: u.id, email: u.email ?? null };
}

export async function requireUser(next = "/dashboard"): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}
