import { z } from 'zod'

// ✅ Validação (runtime) para pares [action, 'Process']
export const processTuple = z.tuple([
  z.union([
    z.literal('manage'),
    z.literal('get'),
    z.literal('create'),
    z.literal('update'),
    z.literal('read'),
    z.literal('delete'),
  ]),
  z.literal('Process'),
])

// Útil quando quiser validar uma tupla vinda de requisições, etc.
export type ProcessTuple = z.infer<typeof processTuple>

// ✅ Nome do subject (para CASL)
export type ProcessSubject = 'Process'
