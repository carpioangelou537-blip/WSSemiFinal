import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadError from '@/components/ui/LoadError'

export default async function HRDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <LoadError message="Your session expired. Sign in again to continue." />

  const { data: requests, error } = await supabase
    .from('onboarding_requests')
    .select('id, employee_name, employee_email, job_title, department, status, created_at')
    .eq('requested_by', user.id)
    .order('created_at', { ascending: false })

  if (error) return <LoadError message={error.message} />
  const rows = requests ?? []
  const pendingCount = rows.filter((request) => request.status === 'pending_manager').length
  const completedCount = rows.filter((request) => request.status === 'provisioned').length

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="page-heading">
        <div>
          <p className="section-eyebrow">HR WORKSPACE</p>
          <h1 className="mt-2">Onboarding overview</h1>
          <p>Keep every new teammate’s access request moving forward.</p>
        </div>
        <Link className="button-primary" href="/dashboard/hr/new-request"><span aria-hidden="true" className="mr-2">+</span>New onboarding request</Link>
      </header>

      <section aria-label="Request summary" className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total requests', value: rows.length, tone: 'text-slate-950', detail: 'Submitted by you' },
          { label: 'Awaiting review', value: pendingCount, tone: 'text-amber-700', detail: 'With a manager' },
          { label: 'Provisioned', value: completedCount, tone: 'text-emerald-700', detail: 'Ready to go' },
        ].map((item) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={item.label}>
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            <p className={`mt-3 text-3xl font-semibold tracking-tight ${item.tone}`}>{item.value}</p>
            <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
          <div>
            <h2 className="font-semibold text-slate-900">Your requests</h2>
            <p className="mt-1 text-sm text-slate-500">A live view of employee onboarding progress.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{rows.length} total</span>
        </div>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left">
              <thead className="bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr><th className="px-5 py-3.5 sm:px-7">Employee</th><th className="px-5 py-3.5">Role</th><th className="px-5 py-3.5">Department</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Created</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((request) => (
                  <tr className="transition hover:bg-slate-50/70" key={request.id}>
                    <td className="px-5 py-4 sm:px-7"><p className="text-sm font-semibold text-slate-900">{request.employee_name}</p><p className="mt-0.5 text-xs text-slate-500">{request.employee_email}</p></td>
                    <td className="px-5 py-4 text-sm text-slate-700">{request.job_title}</td>
                    <td className="px-5 py-4 text-sm text-slate-600">{request.department}</td>
                    <td className="px-5 py-4"><StatusBadge status={request.status} /></td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">{request.created_at ? new Date(request.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state m-5 sm:m-7">
            <span className="mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-xl text-indigo-700">✳</span>
            <p className="font-semibold text-slate-900">Your first request starts here</p>
            <p className="mt-1 max-w-sm text-sm leading-6">Create an onboarding request and we’ll help match access to the employee’s role.</p>
            <Link className="button-primary mt-5" href="/dashboard/hr/new-request">Create a request</Link>
          </div>
        )}
      </section>
    </div>
  )
}
