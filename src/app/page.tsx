import { defineAbilityFor } from '@/auth/abilities'

const ability = defineAbilityFor({ role: 'MEMBER' })

export default function Home() {
  return (
    <div>
      <h1>Hello World!</h1>
    </div>
  )
}
