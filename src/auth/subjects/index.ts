import type { OrganizationSubject } from './organization'
import type { ProcessSubject } from './process'

export type AppSubjects =
  | ProcessSubject
  | OrganizationSubject
  | ['manage', 'all']
