import type { Metadata } from 'next'
import { Suspense } from 'react'
import AuthForm from '@/components/auth/AuthForm'
import ProfileNotice from '@/components/auth/ProfileNotice'

export const metadata: Metadata = { title: 'Sign in · AccessFlow AI' }

export default function LoginPage() {
  return (
    <main className="login-shell">
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />
      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-12 px-5 py-12 lg:grid-cols-[1.05fr_0.8fr] lg:px-10">
        <section className="hidden text-white lg:block">
          <div className="mb-10 inline-flex items-center gap-3">
            <span className="brand-mark">A</span>
            <span className="text-sm font-semibold tracking-wide text-white/90">ACCESSFLOW AI</span>
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">People-first access management</p>
          <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-[1.1] tracking-tight">
            Make every first day feel <span className="text-indigo-200">ready.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Bring HR, managers, and IT together to request, review, and provision employee access with confidence.
          </p>
          <div className="mt-12 grid max-w-lg grid-cols-3 gap-3">
            {[['01', 'Request'], ['02', 'Review'], ['03', 'Provision']].map(([number, label]) => (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur" key={number}>
                <p className="text-xs font-semibold text-indigo-200">{number}</p>
                <p className="mt-2 text-sm font-medium">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-3xl border border-white/70 bg-white p-7 shadow-2xl shadow-slate-950/20 sm:p-9">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="brand-mark">A</span>
            <span className="text-xs font-bold tracking-widest text-slate-700">ACCESSFLOW AI</span>
          </div>
          <p className="section-eyebrow">WELCOME BACK</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Your access, in flow.</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to manage onboarding and access requests.</p>
          <Suspense fallback={null}><ProfileNotice /></Suspense>
          <AuthForm />
          <p className="mt-6 border-t border-slate-100 pt-5 text-center text-xs leading-5 text-slate-400">
            Account roles are managed by your organization. New accounts start with HR access when permitted by your Supabase policies.
          </p>
        </section>
      </div>
    </main>
  )
}
