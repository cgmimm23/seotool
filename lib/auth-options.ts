// NextAuth config — replaces Supabase Auth. Two providers:
//  - credentials: bcrypt vs auth.users.encrypted_password (email/password login)
//  - google: social login that ALSO authorizes the Google APIs (Search Console,
//    Analytics, Business Profile, Ads). On sign-in we capture the Google
//    access/refresh tokens into profiles (mirrors the old /auth/callback that
//    saved Supabase's provider_token), so lib/google-token.ts keeps working.
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/business.manage",
  "https://www.googleapis.com/auth/adwords",
].join(" ");

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.users.findFirst({
          where: { email: credentials.email.toLowerCase().trim() },
          select: { id: true, email: true, encrypted_password: true },
        });
        if (!user?.encrypted_password) return null;
        const ok = await bcrypt.compare(credentials.password, user.encrypted_password);
        if (!ok) return null;
        return { id: user.id, email: user.email ?? "" };
      },
    }),
    GoogleProvider({
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: { scope: GOOGLE_SCOPES, access_type: "offline", prompt: "consent" },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      const email = (user.email ?? "").toLowerCase().trim();
      if (!email) return false;

      // Link to an existing auth.users row by email, or create one (the
      // on_auth_user_created trigger provisions the matching profile row).
      let row = await prisma.users.findFirst({ where: { email }, select: { id: true } });
      if (!row) {
        const now = new Date();
        row = await prisma.users.create({
          data: {
            id: randomUUID(),
            email,
            email_confirmed_at: now,
            aud: "authenticated",
            role: "authenticated",
            created_at: now,
            updated_at: now,
            raw_app_meta_data: { provider: "google", providers: ["google"] },
            raw_user_meta_data: {},
          },
          select: { id: true },
        });
      }
      // Carry the canonical auth.users id onto the token.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (user as any).id = row.id;

      // Persist the Google API tokens to the profile (default account).
      if (account.access_token) {
        const expiresAt = account.expires_at
          ? new Date(account.expires_at * 1000)
          : new Date(Date.now() + 3600 * 1000);
        await prisma.profiles
          .update({
            where: { id: row.id },
            data: {
              google_access_token: account.access_token,
              google_refresh_token: account.refresh_token ?? undefined,
              google_token_expires_at: expiresAt,
            },
          })
          .catch((e) => console.error("[next-auth] profile token save failed:", e));
      }
      return true;
    },
    async jwt({ token, user }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (user) token.id = (user as any).id;
      return token;
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (session.user) (session.user as any).id = token.id;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
