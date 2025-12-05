// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ALLOWED_EMAIL = "99.cent.bagel@gmail.com";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file", // <-- Drive upload scope
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
          scope: SCOPES,
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,

  callbacks: {
    // Only allow this single Gmail
    async signIn({ user }) {
      return user?.email === ALLOWED_EMAIL;
    },

    // Store Google's access token (and refresh token if you want later)
    async jwt({ token, account }) {
      if (account) {
        // these come from Google on login
        // @ts-expect-error - provider-specific fields
        token.accessToken = account.access_token;
        // @ts-expect-error
        token.refreshToken = account.refresh_token;
        // @ts-expect-error
        token.expiresAt = account.expires_at
          ? // Google sends seconds; convert to ms
            (account.expires_at as number) * 1000
          : null;
      }
      return token;
    },

    // Expose accessToken on the session so the client can send it to /save-set
    async session({ session, token }) {
      // @ts-expect-error - custom field
      session.accessToken = token.accessToken;
      return session;
    },
  },
});

export const { GET, POST } = handlers;
