import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[AUTH] Login attempt for:", credentials?.email);
        
        // HARDCODED DEMO BYPASS
        if (credentials?.email === "demo@vyaaparmitra.com" && credentials?.password === "password123") {
          console.log("[AUTH] Demo login bypass active");
          return {
            id: "demo-user-123",
            email: "demo@vyaaparmitra.com",
            name: "Demo User",
          };
        }

        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string },
          });

          if (!user) {
            console.log("[AUTH] User not found:", credentials.email);
            return null;
          }
          
          if (!user.passwordHash) {
            console.log("[AUTH] User has no password hash");
            return null;
          }

          console.log("[AUTH] Comparing passwords...");
          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );

          if (!isValid) {
            console.log("[AUTH] Invalid password for:", credentials.email);
            return null;
          }

          console.log("[AUTH] Login successful for:", credentials.email);
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? user.email,
          };
        } catch (error) {
          console.error("[AUTH] Error in authorize:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
