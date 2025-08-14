import { MongoQuery } from '@casl/ability'
import { defineAbilityFor, type AppAbility } from './abilities'
import type { AppAction, AppSubject } from './subjects'
import type { User } from './models'

/** Erro 403 com metadados para rotas/API/UI */
export class HttpForbiddenError extends Error {
  status = 403 as const
  code = 'FORBIDDEN' as const
  details?: Record<string, unknown>

  constructor(message = 'Forbidden', details?: Record<string, unknown>) {
    super(message)
    this.name = 'HttpForbiddenError'
    this.details = details
  }
}

/** Lança 403 se não puder (para usar em rotas/server actions) */
export function assertCan(
  user: User,
  action: AppAction,
  subject: AppSubject,
  conditions?: MongoQuery<Record<string, unknown>>,
  message = 'Você não tem permissão para realizar esta ação.',
  details?: Record<string, unknown>,
): void {
  const ability: AppAbility = defineAbilityFor(user)
  const ok = conditions
    ? ability.can(action, subject, conditions as any) // desambigua overload (fields vs conditions)
    : ability.can(action, subject)

  if (!ok) {
    throw new HttpForbiddenError(message, {
      action,
      subject,
      conditions,
      ...details,
    })
  }
}

/** Retorna boolean (útil para UI condicional) */
export function canDo(
  user: User,
  action: AppAction,
  subject: AppSubject,
  conditions?: MongoQuery<Record<string, unknown>>,
): boolean {
  const ability: AppAbility = defineAbilityFor(user)
  return conditions
    ? ability.can(action, subject, conditions as any)
    : ability.can(action, subject)
}
