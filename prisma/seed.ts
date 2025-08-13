import { PrismaClient } from '../src/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑 Limpando tabelas...')

  await prisma.process.deleteMany()
  await prisma.department.deleteMany()
  await prisma.organization.deleteMany()

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

  const dpe = await prisma.department.create({
    data: {
      name: 'Diretoria de Planejamento e Estatísticas',
      code: 'DPE',
      organizationId: agerba.id,
    },
  })

  const dqs = await prisma.department.create({
    data: {
      name: 'Diretoria de Qualidade e Serviços',
      code: 'DQS',
      organizationId: agerba.id,
    },
  })

  console.log('🏗 Criando departamentos subordinados à DE...')
  await prisma.department.create({
    data: {
      name: 'Chefia de Gabinete',
      code: 'GAB',
      organizationId: agerba.id,
      parentId: de.id,
    },
  })

  await prisma.department.create({
    data: {
      name: 'Núcleo de Gestão de Tecnologia da Informação',
      code: 'NGTIC',
      organizationId: agerba.id,
      parentId: de.id,
    },
  })

  console.log('✅ Seed concluído!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
