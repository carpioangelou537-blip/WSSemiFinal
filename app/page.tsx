import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login')
  const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (error || !profile) redirect('/login?error=profile')
  if (profile.role === 'hr') redirect('/dashboard/hr')
  if (profile.role === 'manager') redirect('/dashboard/manager')
  if (profile.role === 'it_admin') redirect('/dashboard/admin')
  redirect('/login?error=profile')
}
