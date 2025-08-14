import { email, z } from 'zod'
import { roleSchema } from '../roles'
import { DepartmentRole } from '@/generated/prisma'

// Subschemas
export const userEmailSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  isPrimary: z.boolean().optional().default(false),
})

export const departmentSchema = z.object({
  id: z.string().uuid(),
  code: z.string().optional(),
  name: z.string(),
})

export const membershipSchema = z.object({
  id: z.string().uuid(),
  departmentId: z.string().uuid(),
  // perfil do usuário dentro do departamento
  role: z.custom<DepartmentRole>(),
  department: departmentSchema.optional(), // útil para telas e listas
})

/**
 * User model (para CASL e APP)
 * - Inclui campos essenciais ao RBAC e identificação.
 * - É possível acrescentar outros,conforme necessidade.
 */

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  cpf: z.string(),
  role: z.enum(['ADMIN', 'REQUESTER']).optional(),
  emails: z.array(userEmailSchema).default([]),

  // departamentos aos quais o usuário pertence e seu perfil local
  memberships: z.array(membershipSchema).default([]),

  // metadados
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type User = z.infer<typeof userSchema>

// Normaliza um usuário vindo do Prisma (com includes) para o schema
export function toUser(raw: unknown): User {
  return userSchema.parse(raw)
}

// Exemplo prático de mapeamento a partir do Prisma
// Usar este tipo no repositório/serviço ao buscar o usuário.
export type PrismaUserForAuth = {
  id: string
  name: string
  cpf: string
  role: z.infer<typeof roleSchema>
  createdAt: Date | string
  updatedAt: Date | string
  emails?: Array<{
    id: string
    email: string
    isPrimary?: boolean | null
  }>
  memberships?: Array<{
    id: string
    departmentId: string
    profile: string
    department?: { id: string; name: string } | null
  }>
}

// Mapeia o shape retornado pelo Prisma para o `User`.
export function mapPrismaUserToUser(pu: PrismaUserForAuth): User {
  return userSchema.parse({
    id: pu.id,
    name: pu.name,
    cpf: pu.cpf,
    role: pu.role,
    createdAt: pu.createdAt,
    updatedAt: pu.updatedAt,
    emails: (pu.emails ?? []).map((email) => ({
      id: email.id,
      email: email.email,
      isPrimary: !!email.isPrimary,
    })),
    memberships: (pu.memberships ?? []).map((member) => ({
      id: member.id,
      departmentId: member.departmentId,
      profile: member.profile,
      department: member.department
        ? { id: member.department.id, name: member.department.name }
        : undefined,
    })),
  })
}
