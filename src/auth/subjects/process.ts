import { z } from 'zod'

export const processSubject = z.tuple([
  z.union([
    z.literal('manage'),
    z.literal('get'),
    z.literal('create'),
    z.literal('update'),
  ]),
  z.literal('Process'),
])

export type ProcessSubject = z.infer<typeof processSubject>
