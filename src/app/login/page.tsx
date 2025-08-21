import { LoginForm } from '@/components/login-form'
import { z } from 'zod'
import { loginSchema } from '../schemas/loginSchema'
import { redirect } from 'next/navigation'
import { signIn } from '@/lib/auth'
import { AuthError, CredentialsSignin } from 'next-auth'

type formData = z.infer<typeof loginSchema>

export default function Page() {
  async function loginAction(formData: FormData) {
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

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm loginAction={loginAction} />
      </div>
    </div>
  )
}
