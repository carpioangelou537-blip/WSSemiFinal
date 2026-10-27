import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/ui/StatusBadge'
import LoadError from '@/components/ui/LoadError'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: requests, error } = await supabase
    .from('onboarding_requests')
    .select('id, employee_name, employee_email, job_title, department, status, created_at')
    .order('created_at', { ascending: false })
  if (error) return <LoadError message={error.message} />

  const rows = requests ?? []
  const approved = rows.filter((request) => request.status === 'approved').length
  const pending = rows.filter((request) => request.status === 'pending_manager').length
  const provisioned = rows.filter((request) => request.status === 'provisioned').length

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="page-heading">
        <div>
          <p className="section-eyebrow">IT OPERATIONS</p>
          <h1 className="mt-2">Access request center</h1>
          <p>Track approvals and prepare access provisioning across your organization.</p>
        </div>
        <Link className="button-secondary" href="/dashboard/admin/catalog">Manage access catalog <span aria-hidden="true" className="ml-1">→</span></Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Awaiting managers', value: pending, tone: 'text-amber-700' },
          { label: 'Ready to provision', value: approved, tone: 'text-indigo-700' },
          { label: 'Provisioned', value: provisioned, tone: 'text-emerald-700' },
        ].map((item) => (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={item.label}>
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            <p className={`mt-3 text-3xl font-semibold tracking-tight ${item.tone}`}>{item.value}</p>
            <p className="mt-1 text-xs text-slate-400">Across {rows.length} total requests</p>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
          <h2 className="font-semibold text-slate-900">All onboarding requests</h2>
          <p className="mt-1 text-sm text-slate-500">Review status and prepare approved access.</p>
        </div>
        {rows.length ? <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-left">
            <thead className="bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr><th className="px-5 py-3.5 sm:px-7">Employee</th><th className="px-5 py-3.5">Role</th><th className="px-5 py-3.5">Department</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Created</th><th className="px-5 py-3.5" /></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((request) => (
                <tr className="transition hover:bg-slate-50/70" key={request.id}>
                  <td className="px-5 py-4 sm:px-7"><p className="text-sm font-semibold text-slate-900">{request.employee_name}</p><p className="mt-0.5 text-xs text-slate-500">{request.employee_email}</p></td>
                  <td className="px-5 py-4 text-sm text-slate-700">{request.job_title}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{request.department}</td>
                  <td className="px-5 py-4"><StatusBadge status={request.status} /></td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">{request.created_at ? new Date(request.created_at).toLocaleDateString() : '—'}</td>
                  <td className="px-5 py-4"><Link className="text-sm font-semibold text-indigo-700 hover:text-indigo-900" href={`/dashboard/admin/${request.id}`}>Details →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div> : <div className="empty-state m-5"><p className="font-semibold text-slate-900">No onboarding requests</p><p className="mt-1 text-sm">Requests will appear here as HR submits them.</p></div>}
      </section>
    </div>
  )
}
