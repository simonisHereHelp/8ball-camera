// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ALLOWED_EMAIL = "99.cent.bagel@gmail.com";

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,

  callbacks: {
    async signIn({ user }) {
      // Only allow this single Gmail
      return user?.email === ALLOWED_EMAIL;
    },
  },
});

export const { GET, POST } = handlers;