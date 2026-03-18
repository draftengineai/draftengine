import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const USERS = [
  { id: '1', name: 'Alex Writer', email: 'alex@example.com', password: 'REDACTED' },
  { id: '2', name: 'Morgan Editor', email: 'morgan@example.com', password: 'REDACTED' },
  { id: '3', name: 'Riley Admin', email: 'riley@example.com', password: 'REDACTED' },
];

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = USERS.find(
          u => u.email === credentials.email && u.password === credentials.password
        );
        if (!user) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/' },
};
