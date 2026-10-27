import { requirePageRole } from '@/lib/auth'

export default async function HRLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole('hr')
  return children
}
