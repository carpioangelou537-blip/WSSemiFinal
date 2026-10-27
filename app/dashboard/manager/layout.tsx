import { requirePageRole } from '@/lib/auth'

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole('manager')
  return children
}
