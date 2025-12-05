import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const {
  handlers: {GET, POST},
} = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.AUTH_SECRET,
});

export { GET, POST };