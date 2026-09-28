import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { parseCredentials, verifyPassword } from "@/lib/auth";
import { ROLES, type Role } from "@/lib/access";
import { queryDb } from "@/lib/db";

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        let creds;
        try {
          creds = parseCredentials(raw);
        } catch {
          return null;
        }
        const rows = await queryDb<UserRow>(
          "SELECT * FROM users WHERE email = $1",
          [creds.email.toLowerCase()],
        );
        const u = rows[0];
        if (!u) return null;
        if (!(await verifyPassword(creds.password, u.password_hash))) return null;
        if (!ROLES.includes(u.role as Role)) return null;
        return { id: u.id, name: u.name, email: u.email, role: u.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user && "role" in user) token.role = (user as { role: Role }).role;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: Role }).role = token.role as Role | undefined;
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
});
