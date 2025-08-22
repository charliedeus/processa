'use server'
import { z } from 'zod'
import { redirect } from 'next/navigation'

import { loginSchema } from '../schemas/loginSchema'
import { signIn } from '@/lib/auth'
import { AuthError, CredentialsSignin } from 'next-auth'

type formData = z.infer<typeof loginSchema>

export async function loginAction(formData: FormData) {
  'use server'
  const raw = Object.fromEntries(formData)
  const { success, data } = loginSchema.safeParse(raw)

  if (!success) {
    // optional: redirecionar com erro
    redirect('/login?error=invalid')
  }

  const { login, password } = data

  try {
    await signIn('credentials', {
      login,
      password,
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return { error: 'Credenciais inválidas.' }
    }

    if (error instanceof AuthError) {
      return { error: 'Algo deu errado.' }
    }

    throw error
  }
}
