'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useActionState } from 'react'
import { toast } from 'sonner'

interface ILoginFormProps {
  loginAction: (formData: FormData) => Promise<void | { error: string }>
}

type ActionState = null | void | { error: string }

export function LoginForm({
  className,
  loginAction,
  ...props
}: ILoginFormProps & React.ComponentProps<'div'>) {
  const [_, dispatchAction, isPending] = useActionState<ActionState, FormData>(
    async (_previousData, formData) => {
      const response = await loginAction(formData)

      if (response?.error) {
        toast.error(response.error)
      }
    },
    null,
  )

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Entrar</CardTitle>
          <CardDescription>Entre com seu CPF ou Email</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={dispatchAction} noValidate>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="login">CPF ou Email</Label>
                <Input
                  id="login"
                  name="login"
                  type="text"
                  placeholder=""
                  required
                />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Senha</Label>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Esqueceu sua senha?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="******"
                  required
                />
              </div>
              <div className="flex flex-col gap-3">
                <Button className="w-full">Login</Button>
                <Button type="button" variant="outline" className="w-full">
                  Login with Google
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              Ainda não possui conta?{' '}
              <Link href={'/register'} className="underline underline-offset-4">
                Registre-se
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
