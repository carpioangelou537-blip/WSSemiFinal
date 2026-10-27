import { redirect } from 'next/navigation'

export default async function ManagerRequestRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/dashboard/manager/${id}`)
}
