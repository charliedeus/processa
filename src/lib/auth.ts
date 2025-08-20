// src/lib/auth.ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import prisma from './prisma'
import bcrypt from 'bcryptjs'
import { loginSchema } from '@/app/schemas/loginSchema'

// helpers
function onlyDigits(v: string) {
  return v.replace(/\D+/g, '')
}
function isValidCPF(raw: string) {
  const cpf = onlyDigits(raw)
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false
  const calc = (slice: number) => {
    let sum = 0
    for (let i = 0; i < slice - 1; i++) sum += parseInt(cpf[i]) * (slice - i)
    const mod = (sum * 10) % 11
    return mod === 10 ? 0 : mod
  }
  const d1 = calc(10),
    d2 = calc(11)
  return d1 === parseInt(cpf[9]) && d2 === parseInt(cpf[10])
}
const isEmail = (s: string) => /\S+@\S+\.\S+/.test(s)

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 }, // ✅ JWT 7 dias
  pages: { signIn: '/login' },

  providers: [
    Credentials({
      id: 'credentials',
      name: 'E-mail ou CPF',
      credentials: {
        login: { label: 'E-mail ou CPF', type: 'text' },
        password: { label: 'Senha', type: 'password' },
      },
      authorize: async (rawCreds) => {
        // 🔒 valida e tipa
        const parsed = loginSchema.safeParse(rawCreds)
        if (!parsed.success) return null
        const { login: rawLogin, password } = parsed.data

        const login = rawLogin.trim()
        if (!login || !password) return null

        // busca por email (lowercase) ou cpf (validado)
        let user = null as null | {
          id: string
          cpf: string | null
          email: string | null
          emailVerified: Date | null
          passwordHash: string | null
        }
        if (isEmail(login)) {
          user = await prisma.user.findUnique({
            where: { email: login.toLowerCase() },
            select: {
              id: true,
              cpf: true,
              email: true,
              emailVerified: true,
              passwordHash: true,
            },
          })
        } else {
          const cpf = onlyDigits(login)
          if (!isValidCPF(cpf)) return null
          // (use sua isValidCPF aqui se quiser bloquear)

          user = await prisma.user.findUnique({
            where: { cpf },
            select: {
              id: true,
              cpf: true,
              email: true,
              emailVerified: true,
              passwordHash: true,
            },
          })
        }

        // exige senha cadastrada + email verificado
        if (!user?.passwordHash) return null
        if (!user.email || !user.emailVerified) return null

        const ok = await bcrypt.compare(password, user.passwordHash) // ✅ agora password é string
        if (!ok) return null

        // retorna um "User" completo para o adapter resolver
        return await prisma.user.findUnique({ where: { id: user.id } })
      },
    }),
  ],

  callbacks: {
    // 🔐 Com strategy: "jwt", precisamos popular o token na 1ª vez
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.cpf = (user as any).cpf ?? null
      }
      return token
    },
    // 🎫 Monta a session a partir do token e carrega memberships do banco
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = (token as any).id
        ;(session.user as any).cpf = (token as any).cpf ?? null

        if ((token as any).id) {
          const memberships = await prisma.departmentMembership.findMany({
            where: { userId: String((token as any).id) },
            select: {
              role: true,
              isActive: true,
              department: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  organizationId: true,
                },
              },
            },
          })
          ;(session.user as any).memberships = memberships.map((m) => ({
            role: m.role,
            isActive: m.isActive,
            departmentId: m.department.id,
            departmentCode: m.department.code,
            departmentName: m.department.name,
            organizationId: m.department.organizationId,
          }))
        }
      }
      return session
    },
  },
})
