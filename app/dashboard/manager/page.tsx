import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadError from '@/components/ui/LoadError'

export default async function ManagerDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <LoadError message="Your session expired. Sign in again to continue." />

  const { data: requests, error } = await supabase
    .from('onboarding_requests')
    .select('id, employee_name, employee_email, job_title, department, start_date, status, created_at')
    .eq('manager_id', user.id)
    .eq('status', 'pending_manager')
    .order('created_at', { ascending: true })

  if (error) return <LoadError message={error.message} />
  const rows = requests ?? []

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="page-heading">
        <div>
          <p className="section-eyebrow">MANAGER WORKSPACE</p>
          <h1 className="mt-2">Review queue</h1>
          <p>Make thoughtful access decisions before each new teammate starts.</p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800">{rows.length} awaiting review</span>
      </header>

      {rows.length ? (
        <div className="space-y-4">
          {rows.map((request) => (
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:p-6" key={request.id}>
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div className="flex items-start gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-semibold text-indigo-700">{request.employee_name.trim().slice(0, 1).toUpperCase()}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-950">{request.employee_name}</h2>
                      <StatusBadge status={request.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{request.employee_email}</p>
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                      <span><span className="text-slate-400">Role</span> · {request.job_title}</span>
                      <span><span className="text-slate-400">Team</span> · {request.department}</span>
                      <span><span className="text-slate-400">Starts</span> · {request.start_date || 'Not set'}</span>
                    </div>
                  </div>
                </div>
                <Link className="button-primary shrink-0" href={`/dashboard/manager/${request.id}`}>Review request <span aria-hidden="true" className="ml-1">→</span></Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state min-h-64">
          <span className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-700">✓</span>
          <p className="font-semibold text-slate-900">You’re all caught up</p>
          <p className="mt-1 text-sm">New requests assigned to you will appear here.</p>
        </div>
      )}
    </div>
  )
}
