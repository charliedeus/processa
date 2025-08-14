// prisma/seed.ts
import { PrismaClient, DepartmentRole } from '../src/generated/prisma'

const prisma = new PrismaClient()

function slugify(str: string) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^\.|\.$)/g, '')
}

async function main() {
  console.log('🗑 Limpando tabelas...')

  await prisma.$transaction([
    prisma.process.deleteMany(),
    prisma.departmentMembership.deleteMany(),
    prisma.userEmail.deleteMany(),
    prisma.user.deleteMany(),
    prisma.department.deleteMany(),
    prisma.organization.deleteMany(),
  ])

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
    // CPF fictício único por índice
    const cpf = String(10_000_000_000 + idx)
      .padEnd(11, '0')
      .slice(0, 11)

    // Distribui o depto primário por rodada
    const primaryDept = deptCodes[idx % deptCodes.length]

    // Regras de quem é MANAGER no primário:
    // - Fulano da Silva (idx 0): MEMBER em NGTIC, mas também MANAGER em GAB (dupla regra abaixo)
    // - Maria Gerente (idx 1): MANAGER na DE
    // - Demais: a cada 5º usuário, será MANAGER no primário; outros MEMBER
    let isManagerPrimary = idx % 5 === 1 // usuários 1,6,11,... como MANAGER no primário

    // Alguns terão depto extra (sempre MEMBER no extra)
    // Ex.: a cada 3º usuário adiciona um extra
    const extraDepts: string[] = []
    if (idx % 3 === 0) {
      // Escolhe um extra diferente do primário
      const extrasPool = deptCodes.filter((c) => c !== primaryDept)
      extraDepts.push(extrasPool[(idx / 3) % extrasPool.length])
    }

    // Ajustes específicos pedidos:
    if (name === 'Fulano da Silva') {
      // quer: MEMBER no NGTIC + MANAGER no GAB
      // Definimos primário = NGTIC como MEMBER e adicionamos GAB como MANAGER via tratamento especial abaixo
      return {
        name,
        cpf,
        primaryDept: 'NGTIC',
        isManagerPrimary: false,
        extraDepts: ['GAB'],
      }
    }
    if (name === 'Maria Gerente') {
      // quer: MANAGER na DE
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

  for (const plan of plans) {
    const localPart = slugify(plan.name)
    const email = `${localPart}@${agerba.domain}`

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
      // Sobrescreve garantidamente:
      membershipsData.length = 0
      membershipsData.push(
        { role: DepartmentRole.MEMBER, departmentId: ngticId },
        { role: DepartmentRole.MANAGER, departmentId: gabId },
      )
    }

    const created = await prisma.user.create({
      data: {
        name: plan.name,
        cpf: plan.cpf,
        emails: {
          create: { email, isPrimary: true },
        },
        memberships: {
          create: membershipsData.map((m) => ({
            role: m.role,
            department: { connect: { id: m.departmentId } },
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

    console.log(`✅ ${created.name} <${email}> → ${summary}`)
  }

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
