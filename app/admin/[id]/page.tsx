import { redirect } from 'next/navigation'

export default async function AdminRequestRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/dashboard/admin/${id}`)
}
