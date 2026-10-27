'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const credentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
})

const signUpSchema = credentialsSchema.extend({
  full_name: z.string().trim().min(2).max(120),
})

export async function signIn(input: unknown) {
  const parsed = credentialsSchema.safeParse(input)
  if (!parsed.success) return { error: 'Enter a valid email and a password with at least 8 characters.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: error.message }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) return { error: `Signed in, but your profile could not be loaded: ${profileError.message}` }
  if (!profile) return { error: 'Your account does not have a profile yet. Ask an administrator to set it up.' }

  const destinations = {
    hr: '/dashboard/hr',
    manager: '/dashboard/manager',
    it_admin: '/dashboard/admin',
  } as const

  return { destination: destinations[profile.role] }
}

export async function signUp(input: unknown) {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) return { error: 'Enter your name, a valid email, and a password with at least 8 characters.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.full_name } },
  })

  if (error) return { error: error.message }
  if (!data.user) return { error: 'The account could not be created.' }

  if (data.session) {
    const { data: existingProfile, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user.id)
      .maybeSingle()

    if (lookupError) return { error: `Account created, but the profile could not be checked: ${lookupError.message}` }

    if (!existingProfile) {
      const { error: insertError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        role: 'hr',
      })
      if (insertError) return { error: `Account created, but profile setup failed: ${insertError.message}` }
    }

    return { message: 'Account created. You can now sign in.' }
  }

  return { message: 'Account created. Check your email to confirm it, then ask an administrator to assign your role.' }
}

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(`Could not sign out: ${error.message}`)
  redirect('/login')
}
