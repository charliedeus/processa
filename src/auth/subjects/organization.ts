import { z } from 'zod'

// ✅ Validação (runtime) para pares [action, 'Organization']
export const organizationTuple = z.tuple([
  z.union([
    z.literal('manage'),
    z.literal('get'),
    z.literal('create'),
    z.literal('update'),
    z.literal('read'),
    z.literal('delete'),
  ]),
  z.literal('Organization'),
])

export type OrganizationTuple = z.infer<typeof organizationTuple>

// ✅ Nome do subject (para CASL)
export type OrganizationSubject = 'Organization'
