import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { Role } from "@/lib/access";

// Edge-safe Auth.js config for src/proxy.ts.
// Must NOT import node:* modules (crypto, sqlite, postgres) — the edge
// runtime only decodes/validates the JWT session here; authorize() never runs.
export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  // Short sessions bound the window a suspended account stays usable (see 018).
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      // Never invoked on edge; the real implementation lives in src/auth.ts.
      authorize: async () => null,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user && "roles" in user) {
        const u = user as unknown as { roles: Role[]; role: Role };
        token.roles = u.roles;
        token.role = u.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.id;
        (session.user as { role?: Role }).role = (token.role ?? "rider") as Role;
        (session.user as { roles?: Role[] }).roles = (token.roles ?? []) as Role[];
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
};

export const { auth } = NextAuth(authConfig);
