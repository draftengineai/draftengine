import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

/**
 * Parse DRAFTENGINE_USERS env var (JSON array) or fall back to a single
 * default user derived from DRAFTENGINE_PASSWORD.
 *
 * Format: [{"id":"1","name":"Writer","email":"writer@example.com","password":"secret"}]
 */
function getUsers(): { id: string; name: string; email: string; password: string }[] {
  const raw = process.env.DRAFTENGINE_USERS;
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      console.warn('[auth] Failed to parse DRAFTENGINE_USERS — using default user');
    }
  }
  // Fallback: single writer user using the shared password
  const pw = process.env.DRAFTENGINE_PASSWORD;
  if (!pw) {
    throw new Error('DRAFTENGINE_PASSWORD environment variable is required');
  }
  return [
    { id: '1', name: 'Writer', email: 'writer@localhost', password: pw },
  ];
}

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
        const users = getUsers();
        const user = users.find(
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
