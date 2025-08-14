import prisma from '@/lib/prisma'

type DeptNode = {
  id: string
  code: string
  name: string
  parentId: string | null
}

export default async function HomePage() {
  const departments = await prisma.department.findMany({
    select: { id: true, code: true, name: true, parentId: true },
  })

  const memberships = await prisma.departmentMembership.findMany({
    include: {
      department: {
        select: { id: true, code: true, name: true, parentId: true },
      },
      user: {
        select: {
          id: true,
          name: true,
          cpf: true,
          emails: { select: { email: true, isPrimary: true } },
        },
      },
    },
  })

  const deptById = new Map<string, DeptNode>(
    departments.map((d) => [
      d.id,
      { id: d.id, code: d.code, name: d.name, parentId: d.parentId },
    ]),
  )

  const levelMemo = new Map<string, number>()
  function getLevel(deptId: string): number {
    if (levelMemo.has(deptId)) return levelMemo.get(deptId)!
    const node = deptById.get(deptId)
    if (!node || !node.parentId) {
      levelMemo.set(deptId, 0)
      return 0
    }
    const lvl = 1 + getLevel(node.parentId)
    levelMemo.set(deptId, lvl)
    return lvl
  }

  const usersByDept = new Map<
    string,
    Array<{
      id: string
      name: string
      cpf: string
      email?: string
      role: string
    }>
  >()

  for (const m of memberships) {
    const deptId = m.department.id
    const primaryEmail =
      m.user.emails.find((e) => e.isPrimary)?.email ?? m.user.emails[0]?.email
    if (!usersByDept.has(deptId)) usersByDept.set(deptId, [])
    usersByDept.get(deptId)!.push({
      id: m.user.id,
      name: m.user.name,
      cpf: m.user.cpf,
      email: primaryEmail,
      role: String(m.role),
    })
  }

  const orderedDepts = [...deptById.values()]
    .filter((d) => usersByDept.has(d.id))
    .sort((a, b) => {
      const la = getLevel(a.id)
      const lb = getLevel(b.id)
      if (la !== lb) return la - lb
      return a.code.localeCompare(b.code)
    })

  const roleRank = (role: string) =>
    role === 'MANAGER' ? 0 : role === 'MEMBER' ? 1 : 99
  const roleLabel = (role: string) =>
    role === 'MANAGER' ? 'Gerente' : role === 'MEMBER' ? 'Membro' : role

  return (
    <main className="space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Usuários por Setor</h1>

      {orderedDepts.map((dept) => {
        const level = getLevel(dept.id)
        const users = (usersByDept.get(dept.id) ?? []).slice().sort((a, b) => {
          const r = roleRank(a.role) - roleRank(b.role)
          if (r !== 0) return r
          return a.name.localeCompare(b.name)
        })

        return (
          <section
            key={dept.id}
            className="relative rounded-2xl border p-4"
            style={{
              marginLeft: level * 32, // indentação
            }}
          >
            {/* linha vertical de conexão */}
            {level > 0 && (
              <span
                className="absolute top-0 bottom-0 left-[-16px] w-px bg-gray-300"
                aria-hidden="true"
              />
            )}

            <header className="mb-3">
              <div className="text-sm text-gray-500">
                Nível {level} • Código {dept.code}
              </div>
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                {dept.name} <span className="text-gray-500">({dept.code})</span>
              </h2>
            </header>

            {users.length === 0 ? (
              <div className="text-sm text-gray-500">
                Sem usuários atribuídos
              </div>
            ) : (
              <ul className="space-y-2">
                {users.map((u) => (
                  <li key={u.id} className="text-sm">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-gray-600">
                      {roleLabel(u.role)} • CPF: {u.cpf}
                      {u.email && (
                        <>
                          {' '}
                          • <span className="font-mono">{u.email}</span>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </main>
  )
}
