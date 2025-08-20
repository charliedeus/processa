import {
  PrismaClient,
  DepartmentRole,
  EmailType,
} from '../src/generated/prisma'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()
const DEFAULT_PASSWORD = '123456'

function slugify(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^\.|\.$)/g, '')
}

/** ================= CPF helpers (gera CPF VÁLIDO) ================= */
function cpfCalcDigit(nums: number[]) {
  // Peso decrescente: para D1 usa 10..2 (nums.length = 9),
  // para D2 usa 11..2 (nums.length = 10, incluindo D1)
  let factor = nums.length + 1
  const total = nums.reduce((acc, n) => acc + n * factor--, 0)
  const rest = total % 11
  return rest < 2 ? 0 : 11 - rest
}

function cpfFromBase9(base9: string) {
  const nums = base9.split('').map(Number)
  const d1 = cpfCalcDigit(nums)
  const d2 = cpfCalcDigit([...nums, d1])
  return base9 + String(d1) + String(d2)
}

function makeBase9(idx: number) {
  // base determinística de 9 dígitos
  // começa em 100000000 e incrementa
  return String(100_000_000 + idx).slice(-9)
}

function makeValidCpfByIndex(idx: number) {
  const base9 = makeBase9(idx)
  return cpfFromBase9(base9)
}
/** ================================================================= */

async function main() {
  console.log('🗑 Limpando tabelas...')

  await prisma.$transaction(
    [
      prisma.process.deleteMany(),
      prisma.departmentMembership.deleteMany(),
      prisma.userEmail.deleteMany(),
      prisma.user.deleteMany(),
      prisma.department.deleteMany(),
      prisma.organization.deleteMany(),
      prisma.account?.deleteMany?.(), // caso existam (Auth.js)
      prisma.session?.deleteMany?.(),
      prisma.verificationToken?.deleteMany?.(),
      prisma.passwordResetToken?.deleteMany?.(),
    ].filter(Boolean) as any,
  )

  console.log('🏗 Criando organização...')
  const agerba = await prisma.organization.create({
    data: {
      name: 'AGERBA',
      slug: 'agerba',
      domain: 'agerba.ba.gov.br',
      processLabel: 'Processo',
    },
  })

  console.log('🏗 Criando departamentos principais...')
  const de = await prisma.department.create({
    data: {
      name: 'Diretoria Executiva',
      code: 'DE',
      organizationId: agerba.id,
    },
  })

  await prisma.department.create({
    data: {
      name: 'Diretoria de Planejamento e Estatísticas',
      code: 'DPE',
      organizationId: agerba.id,
    },
  })

  await prisma.department.create({
    data: {
      name: 'Diretoria de Qualidade e Serviços',
      code: 'DQS',
      organizationId: agerba.id,
    },
  })

  console.log('🏗 Criando departamentos subordinados à DE...')
  const gab = await prisma.department.create({
    data: {
      name: 'Chefia de Gabinete',
      code: 'GAB',
      organizationId: agerba.id,
      parentId: de.id,
    },
  })

  const ngtic = await prisma.department.create({
    data: {
      name: 'Núcleo de Gestão de Tecnologia da Informação',
      code: 'NGTIC',
      organizationId: agerba.id,
      parentId: de.id,
    },
  })

  // Mapa código -> id
  const departments = await prisma.department.findMany({
    where: { organizationId: agerba.id },
    select: { id: true, code: true },
  })
  const deptByCode = new Map(departments.map((d) => [d.code, d.id]))

  console.log('👥 Gerando usuários...')
  // Lista base de nomes (pode ampliar/alterar quando quiser)
  const baseNames = [
    'Fulano da Silva',
    'Maria Gerente',
    'João Santos',
    'Ana Pereira',
    'Carlos Almeida',
    'Beatriz Souza',
    'Pedro Lima',
    'Fernanda Rocha',
    'Rafael Nunes',
    'Juliana Costa',
    'Lucas Ribeiro',
    'Patrícia Carvalho',
    'Thiago Teixeira',
    'Camila Fernandes',
    'André Moreira',
    'Larissa Araújo',
    'Bruno Martins',
    'Aline Freitas',
    'Diego Correia',
    'Natália Gomes',
    'Gabriel Barros',
    'Priscila Duarte',
    'Rodrigo Pires',
    'Letícia Farias',
    'Vinícius Macedo',
    'Bianca Castro',
    'Felipe Antunes',
    'Renata Moraes',
    'Gustavo Prado',
    'Sabrina Tavares',
  ]

  // Regras de distribuição:
  // - Alternar departamentos principais para os usuários
  // - Alguns usuários receberão um segundo setor (sempre MEMBER no extra)
  // - Cada usuário no máximo 1 MANAGER (no setor "primário" dele)
  const deptCodes = ['DE', 'DPE', 'DQS', 'GAB', 'NGTIC'] as const

  type Plan = {
    name: string
    cpf: string
    primaryDept: string
    isManagerPrimary: boolean
    extraDepts: string[] // sempre MEMBER
  }

  const plans: Plan[] = baseNames.map((name, idx) => {
    // ✅ CPF VÁLIDO (com D1/D2 calculados)
    const cpf = makeValidCpfByIndex(idx)

    // Distribui o depto primário por rodada
    const primaryDept = deptCodes[idx % deptCodes.length]

    // Regras de quem é MANAGER no primário:
    // - Fulano da Silva (idx 0): MEMBER em NGTIC + MANAGER em GAB (ajuste específico abaixo)
    // - Maria Gerente (idx 1): MANAGER na DE
    // - Demais: a cada 5º usuário, será MANAGER no primário; outros MEMBER
    let isManagerPrimary = idx % 5 === 1 // usuários 1,6,11,... como MANAGER no primário

    // Alguns terão depto extra (sempre MEMBER no extra)
    // Ex.: a cada 3º usuário adiciona um extra
    const extraDepts: string[] = []
    if (idx % 3 === 0) {
      const extrasPool = deptCodes.filter((c) => c !== primaryDept)
      extraDepts.push(extrasPool[(idx / 3) % extrasPool.length])
    }

    // Ajustes específicos pedidos:
    if (name === 'Fulano da Silva') {
      return {
        name,
        cpf,
        primaryDept: 'NGTIC',
        isManagerPrimary: false,
        extraDepts: ['GAB'],
      }
    }
    if (name === 'Maria Gerente') {
      return {
        name,
        cpf,
        primaryDept: 'DE',
        isManagerPrimary: true,
        extraDepts: [],
      }
    }

    return { name, cpf, primaryDept, isManagerPrimary, extraDepts }
  })

  // hash padrão para todos
  const passwordHash = await hash(DEFAULT_PASSWORD, 10)
  const now = new Date()

  for (const plan of plans) {
    const localPart = slugify(plan.name)
    const email = `${localPart}@${agerba.domain}`.toLowerCase()

    const primaryDeptId = deptByCode.get(plan.primaryDept)
    if (!primaryDeptId)
      throw new Error(
        `Departamento primário ${plan.primaryDept} não encontrado`,
      )

    // Monta memberships: primário (MANAGER ou MEMBER) + extras (sempre MEMBER)
    const membershipsData: Array<{
      role: DepartmentRole
      departmentId: string
    }> = [
      {
        role: plan.isManagerPrimary
          ? DepartmentRole.MANAGER
          : DepartmentRole.MEMBER,
        departmentId: primaryDeptId,
      },
    ]

    for (const extra of plan.extraDepts) {
      const extraId = deptByCode.get(extra)
      if (!extraId)
        throw new Error(`Departamento extra ${extra} não encontrado`)
      membershipsData.push({
        role: DepartmentRole.MEMBER,
        departmentId: extraId,
      })
    }

    // Tratamento especial para Fulano: garantir MEMBER no NGTIC e MANAGER no GAB
    if (plan.name === 'Fulano da Silva') {
      const gabId = deptByCode.get('GAB')
      const ngticId = deptByCode.get('NGTIC')
      if (!gabId || !ngticId) throw new Error('GAB/NGTIC não encontrados')
      membershipsData.length = 0
      membershipsData.push(
        { role: DepartmentRole.MEMBER, departmentId: ngticId },
        { role: DepartmentRole.MANAGER, departmentId: gabId },
      )
    }

    const created = await prisma.user.create({
      data: {
        name: plan.name,
        cpf: plan.cpf, // ✅ agora é VÁLIDO

        // 👇 novos campos do schema para Auth.js (Credentials)
        email, // e-mail principal (login)
        emailVerified: now, // seed já como verificado
        passwordHash, // senha padrão 123456

        // e-mails adicionais (mantém seu modelo)
        emails: {
          create: {
            email,
            type: EmailType.CORPORATE,
            isPrimary: true,
            isVerified: true,
            verifiedAt: now,
            organization: { connect: { id: agerba.id } },
          },
        },

        memberships: {
          create: membershipsData.map((m) => ({
            role: m.role,
            department: { connect: { id: m.departmentId } },
            // isActive default(false) — mantém a regra de aprovação
          })),
        },
      },
      include: {
        emails: true,
        memberships: { include: { department: true } },
      },
    })

    const summary = created.memberships
      .map((m) => `${m.department.code}:${m.role}`)
      .join(', ')
    console.log(`✅ ${created.name} <${email}> (CPF: ${plan.cpf}) → ${summary}`)
  }

  console.log('🔑 Usuários criados com senha padrão:', DEFAULT_PASSWORD)
  console.log('🎉 Seed concluído!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
