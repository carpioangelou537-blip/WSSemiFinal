'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { signIn, signUp } from '@/actions/auth'
import { getActionErrorMessage } from '@/lib/action-errors'

export default function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)

    try {
      if (mode === 'sign-up') {
        const result = await signUp({ full_name: fullName, email, password })
        if (result.error) toast.error(result.error)
        else {
          toast.success(result.message)
          setMode('sign-in')
        }
      } else {
        const result = await signIn({ email, password })
        if (result.error) toast.error(result.error)
        else if (result.destination) {
          router.push(result.destination)
          router.refresh()
        }
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Authentication failed.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      {mode === 'sign-up' && (
        <label className="field-label">
          Full name
          <input
            autoComplete="name"
            className="field-input"
            maxLength={120}
            onChange={(event) => setFullName(event.target.value)}
            required
            value={fullName}
          />
        </label>
      )}
      <label className="field-label">
        Work email
        <input
          autoComplete="email"
          className="field-input"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label className="field-label">
        Password
        <input
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          className="field-input"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      <button className="button-primary w-full" disabled={pending} type="submit">
        {pending ? 'Please wait…' : mode === 'sign-in' ? 'Sign in to AccessFlow' : 'Create HR account'}
      </button>
      <p className="text-center text-sm text-slate-500">
        {mode === 'sign-in' ? 'New to AccessFlow?' : 'Already have an account?'}{' '}
        <button
          className="font-semibold text-indigo-700 hover:text-indigo-900"
          onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
          type="button"
        >
          {mode === 'sign-in' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </form>
  )
}
