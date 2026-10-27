'use client'

import { useSearchParams } from 'next/navigation'

export default function ProfileNotice() {
  const isProfileError = useSearchParams().get('error') === 'profile'
  if (!isProfileError) return null

  return (
    <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900" role="alert">
      Your account profile could not be found or read. Ask an administrator to verify your profile and role.
    </p>
  )
}
