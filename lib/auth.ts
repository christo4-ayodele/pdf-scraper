import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.toLowerCase()

        // Find user
        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user) {
          return null
        }

        // Check password (if user has one)
        const userWithPassword = user as any
        if (userWithPassword.password && await bcrypt.compare(credentials.password, userWithPassword.password)) {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          }
        }

        // Fallback for users without password (legacy)
        if (!userWithPassword.password) {
          return null
        }

        return null
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle OAuth sign in
      if (account?.provider === "github" || account?.provider === "google") {
        if (!user.email) {
          return false
        }

        const email = user.email.toLowerCase()
        
        // Check if user exists
        let dbUser = await prisma.user.findUnique({
          where: { email },
        })

        if (!dbUser) {
          // Create new user
          dbUser = await prisma.user.create({
            data: {
              email,
              name: user.name || null,
              image: user.image || null,
              credits: 1000,
              planType: "FREE",
            },
          })
        } else {
          // Update existing user's image/name if needed
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              name: user.name || dbUser.name,
              image: user.image || dbUser.image,
            },
          })
        }

        // Create or update account record
        if (account) {
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
            update: {
              access_token: account.access_token || null,
              refresh_token: account.refresh_token || null,
              expires_at: account.expires_at || null,
              token_type: account.token_type || null,
              scope: account.scope || null,
              id_token: account.id_token || null,
              session_state: account.session_state || null,
            },
            create: {
              userId: dbUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token || null,
              refresh_token: account.refresh_token || null,
              expires_at: account.expires_at || null,
              token_type: account.token_type || null,
              scope: account.scope || null,
              id_token: account.id_token || null,
              session_state: account.session_state || null,
            },
          })
        }

        // Update user object with database ID
        user.id = dbUser.id
      }

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // Fetch user data from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { credits: true, planType: true }
        })
        if (dbUser) {
          token.credits = dbUser.credits
          token.planType = dbUser.planType
        }
      } else if (token.id) {
        // Refresh user data on subsequent requests
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { credits: true, planType: true }
        })
        if (dbUser) {
          token.credits = dbUser.credits
          token.planType = dbUser.planType
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        (session.user as any).id = token.id
        ;(session.user as any).credits = token.credits
        ;(session.user as any).planType = token.planType
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: "jwt",
  },
}
