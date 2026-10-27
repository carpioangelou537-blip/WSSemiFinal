import { requirePageRole } from '@/lib/auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole('it_admin')
  return children
}
