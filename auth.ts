import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SUPER_MENTOR_EMAIL } from '@/lib/mentor-guard'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user || !user.passwordHash) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!valid) return null

        // Defense in depth: MENTOR role is ONLY allowed for SUPER_MENTOR_EMAIL.
        // Even if the DB has role=MENTOR for someone else, downgrade at login.
        const effectiveRole =
          user.role === 'MENTOR' && user.email !== SUPER_MENTOR_EMAIL
            ? 'STUDENT'
            : user.role

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: effectiveRole,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
        token.email = (user as { email?: string }).email ?? token.email
      }
      // Extra safety: enforce the invariant on every token refresh.
      if (token.role === 'MENTOR' && token.email !== SUPER_MENTOR_EMAIL) {
        token.role = 'STUDENT'
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        const role = token.role as string
        ;(session.user as { role?: string }).role =
          role === 'MENTOR' && session.user.email !== SUPER_MENTOR_EMAIL
            ? 'STUDENT'
            : role
      }
      return session
    },
  },
  pages: {
    signIn: '/ar/login',
    signOut: '/ar/login',
    error: '/ar/login',
  },
})
