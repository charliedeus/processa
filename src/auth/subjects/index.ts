import type { ProcessSubject } from './process'
import type { OrganizationSubject } from './organization'

// ✅ Ações do app (CASL)
export type AppAction =
  | 'manage'
  | 'get'
  | 'create'
  | 'update'
  | 'read'
  | 'delete'

// ✅ Subjects do app (CASL) — sempre nomes (strings) ou 'all'
export type AppSubject =
  | ProcessSubject
  | OrganizationSubject
  | 'Department'
  | 'DepartmentMembership'
  | 'User'
  | 'all'
