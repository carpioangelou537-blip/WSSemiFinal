import { redirect } from 'next/navigation'
import type { UserRole } from '@/types/database'
import { createClient } from '@/lib/supabase/server'

export async function requireUserRole(expectedRole?: UserRole) {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    throw new Error('You must be signed in to do that.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (profileError) throw new Error(`Could not verify your profile: ${profileError.message}`)
  if (!profile) throw new Error('Your account does not have a profile. Contact an administrator.')
  if (expectedRole && profile.role !== expectedRole) {
    throw new Error('You do not have permission to perform this action.')
  }

  return { supabase, user: authData.user, profile }
}

export async function requirePageRole(expectedRole: UserRole) {
  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (error || !profile) redirect('/login?error=profile')
  if (profile.role !== expectedRole) {
    const destinations = {
      hr: '/dashboard/hr',
      manager: '/dashboard/manager',
      it_admin: '/dashboard/admin',
    } as const
    redirect(destinations[profile.role])
  }

  return { supabase, user: authData.user, profile }
}
