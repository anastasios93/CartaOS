import { type NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/server/db";
import bcrypt from "bcryptjs";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string | null;
      company?: string | null;
      department?: string | null;
    };
  }

  interface User {
    role?: string | null;
    company?: string | null;
    department?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role?: string | null;
    company?: string | null;
    department?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as NextAuthOptions["adapter"],
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user?.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          company: user.company,
          department: user.department,
        };
      },
    }),
    ...(process.env.AZURE_AD_CLIENT_ID
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID ?? "common",
            authorization: {
              params: {
                scope:
                  "openid profile email Mail.ReadWrite Mail.Send Calendars.ReadWrite Files.ReadWrite.All Sites.ReadWrite.All User.Read",
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.company = user.company;
        token.department = user.department;
      }
      // Refresh profile from DB when session is updated
      if (trigger === "update") {
        const dbUser = await db.user.findUnique({
          where: { id: token.id },
          select: { name: true, role: true, company: true, department: true, image: true },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.role = dbUser.role;
          token.company = dbUser.company;
          token.department = dbUser.department;
          token.picture = dbUser.image;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.company = token.company;
        session.user.department = token.department;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
};
