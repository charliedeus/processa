import type { AbilityBuilder } from '@casl/ability'
import type { AppAbility } from './abilities'
import type { User } from './models/user'
import type { Role } from './roles'

type PermissionsByRole = (
  user: User,
  builder: AbilityBuilder<AppAbility>,
) => void

export const permissions: Record<Role, PermissionsByRole> = {
  ADMIN: (_, { can, cannot }) => {
    can('manage', 'all')
  },
  MANAGER: (_, { can, cannot }) => {},
  MEMBER: (_, { can, cannot }) => {
    can(['create', 'get'], 'Process')
  },
  REQUESTER: (_, { can, cannot }) => {},
}
