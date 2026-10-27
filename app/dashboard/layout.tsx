import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !profile) redirect('/login?error=profile')

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar role={profile.role} userName={profile.full_name} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-9">{children}</main>
    </div>
  )
}
