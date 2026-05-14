// Auth.js (NextAuth v5) configuration.
// MVP: Google only. Microsoft is fully designed and one-line-enableable below.
// See specs/002 + .claude/skills/oauth-flow/SKILL.md.

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
// MVP extension target — uncomment when wiring Microsoft. Also set
// MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET / MICROSOFT_TENANT_ID in env.
// import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "database" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.send",
          ].join(" "),
        },
      },
    }),
    // MicrosoftEntraID({
    //   clientId: process.env.MICROSOFT_CLIENT_ID,
    //   clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    //   issuer: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID ?? "common"}/v2.0`,
    //   authorization: {
    //     params: {
    //       scope:
    //         "openid email profile offline_access Mail.ReadWrite Mail.Send User.Read",
    //     },
    //   },
    // }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user?.email || !account) return true;
      const providerKey =
        account.provider === "google"
          ? "gmail"
          : account.provider === "microsoft-entra-id"
            ? "microsoft"
            : null;
      if (!providerKey) return true;

      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      if (!dbUser) return true;

      const existing = await prisma.emailAccount.findFirst({
        where: { userId: dbUser.id, provider: providerKey, emailAddr: user.email },
      });
      if (!existing) {
        await prisma.emailAccount
          .create({
            data: {
              userId: dbUser.id,
              provider: providerKey,
              emailAddr: user.email,
              displayName: user.name ?? null,
            },
          })
          .catch(() => {
            /* best-effort; surface duplicates via Settings UI */
          });
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
