import {
  AbilityBuilder,
  createMongoAbility,
  CreateAbility,
  MongoAbility,
} from '@casl/ability'
import type { AppAction, AppSubject } from './subjects'
import type { User } from './models'

// Tipagem base (mantemos actions/subjects estritos)
export type AppAbility = MongoAbility<[AppAction, AppSubject]>
export const createAppAbility = createMongoAbility as CreateAbility<AppAbility>

// Helper para tipar condições como 'any' e evitar o bug do TS com `$in`
const where = <T extends object>(conditions: T) => conditions as any

/**
 * Define a ability do usuário:
 * - Papéis departamentais (MANAGER / MEMBER)
 * - Papel global opcional (ADMIN / REQUESTER)
 */
export function defineAbilityFor(user: User): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(
    createAppAbility,
  )

  // IDs de departamentos por papel departamental
  const managerDeptIds = user.memberships
    .filter((m) => m.role === 'MANAGER')
    .map((m) => m.departmentId)

  const memberDeptIds = user.memberships
    .filter((m) => m.role === 'MEMBER')
    .map((m) => m.departmentId)

  // Papel global (opcional)
  if (user.role === 'ADMIN') {
    can('manage', 'all')
  } else if (user.role === 'REQUESTER') {
    can(['create', 'get'], 'Process')
  }

  // MANAGER — poderes ampliados nos seus departamentos
  if (managerDeptIds.length) {
    // use undefined no 3º arg para cair no overload de CONDITIONS (4º arg)
    can(
      'manage',
      'Process',
      undefined,
      where({ departmentId: { $in: managerDeptIds } }),
    )
    can(
      'manage',
      'DepartmentMembership',
      undefined,
      where({ departmentId: { $in: managerDeptIds } }),
    )
    can('read', 'Department', undefined, where({ id: { $in: managerDeptIds } }))
  }

  // MEMBER — poderes restritos nos seus departamentos
  if (memberDeptIds.length) {
    can(
      ['create', 'get'],
      'Process',
      undefined,
      where({ departmentId: { $in: memberDeptIds } }),
    )
    can('read', 'Department', undefined, where({ id: { $in: memberDeptIds } }))
  }

  // Regras comuns
  can('read', 'User', undefined, where({ id: user.id }))
  cannot('delete', 'User', undefined, where({ id: user.id }))

  return build({
    // permite usar objetos com __typename: 'Process' | 'Department' | ...
    detectSubjectType: (obj) => (obj as any).__typename as AppSubject,
  })
}
