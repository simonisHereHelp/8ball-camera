// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ALLOWED_EMAIL = "99.cent.bagel@gmail.com";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file", // Drive upload scope
].join(" ");

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
      authorization: {
        params: {
            scope: [
              "openid",
              "email",
              "profile",
              "https://www.googleapis.com/auth/drive.file" // REQUIRED for uploads
            ].join(" "),
            access_type: "offline", // REQUIRED to get refresh_token
            prompt: "consent",      // REQUIRED to force returning refresh_token
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,

  callbacks: {
    // Only allow your own email
    async signIn({ user }) {
      return user?.email === ALLOWED_EMAIL;
    },

    // Store Google's access token (and refresh token if present) on the JWT
    async jwt({ token, account }) {
      if (account) {
        const anyToken = token as any;
        const anyAccount = account as any;

        anyToken.accessToken = anyAccount.access_token;
        anyToken.refreshToken = anyAccount.refresh_token;
        anyToken.expiresAt = anyAccount.expires_at
          ? (anyAccount.expires_at as number) * 1000 // seconds -> ms
          : null;
      }
      return token;
    },

    // Expose accessToken on the session so the client can send it to /api/save-set
    async session({ session, token }) {
      const anySession = session as any;
      const anyToken = token as any;

      anySession.accessToken = anyToken.accessToken;
      return session;
    },
  },
});

export const { GET, POST } = handlers;
