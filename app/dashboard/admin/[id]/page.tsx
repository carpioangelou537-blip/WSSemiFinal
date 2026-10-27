import Link from 'next/link'
import { notFound } from 'next/navigation'
import ProvisioningControls from '@/components/admin/ProvisioningControls'
import LoadError from '@/components/ui/LoadError'
import StatusBadge from '@/components/ui/StatusBadge'
import { createClient } from '@/lib/supabase/server'

export default async function AdminRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: request, error } = await supabase
    .from('onboarding_requests')
    .select('id, employee_name, employee_email, job_title, department, start_date, status, ai_summary, manager_comment, powershell_script')
    .eq('id', id)
    .maybeSingle()
  if (error) return <LoadError message={error.message} />
  if (!request) notFound()

  const { data: items, error: itemError } = await supabase
    .from('request_access_items')
    .select('access_id, ai_suggested, approved')
    .eq('request_id', id)
  if (itemError) return <LoadError message={itemError.message} />

  const accessIds = [...new Set((items ?? []).map((item) => item.access_id))]
  const { data: catalog, error: catalogError } = accessIds.length
    ? await supabase.from('access_catalog').select('id, name, description, ad_group_name').in('id', accessIds)
    : { data: [], error: null }
  if (catalogError) return <LoadError message={catalogError.message} />
  const catalogById = new Map((catalog ?? []).map((item) => [item.id, item]))

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header>
        <Link className="text-sm font-medium text-slate-500 hover:text-indigo-700" href="/dashboard/admin">← Back to all requests</Link>
        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="section-eyebrow">REQUEST DETAILS</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{request.employee_name}</h1>
            <p className="mt-2 text-slate-500">{request.job_title} · {request.department} · Starts {request.start_date || 'date not set'}</p>
          </div>
          <StatusBadge status={request.status} />
        </div>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Employee email</p><p className="mt-1 font-medium text-slate-900">{request.employee_email}</p></div>
          <div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Request ID</p><p className="mt-1 break-all font-mono text-sm text-slate-700">{request.id}</p></div>
        </div>
        {request.ai_summary && <p className="mt-6 rounded-xl bg-indigo-50 p-4 text-sm leading-6 text-indigo-950"><span className="font-semibold">Access rationale · </span>{request.ai_summary}</p>}
        {request.manager_comment && <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><span className="font-semibold">Manager note · </span>{request.manager_comment}</p>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="section-eyebrow">REQUESTED PERMISSIONS</p>
        <div className="mt-4 divide-y divide-slate-100">
          {(items ?? []).length ? items?.map((item, index) => {
            const access = catalogById.get(item.access_id)
            return (
              <div className="flex flex-col justify-between gap-2 py-4 sm:flex-row sm:items-center" key={`${item.access_id}-${index}`}>
                <div><p className="font-medium text-slate-900">{access?.name ?? 'Unavailable access item'}</p><p className="mt-1 text-sm text-slate-500">{access?.description || access?.ad_group_name || 'No description'}</p></div>
                <div className="flex items-center gap-2">
                  {item.ai_suggested && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">Suggested</span>}
                  <span className={item.approved ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800' : item.approved === false ? 'rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-800' : 'rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600'}>
                    {item.approved ? 'Approved' : item.approved === false ? 'Denied' : 'Awaiting review'}
                  </span>
                </div>
              </div>
            )
          }) : <p className="py-4 text-sm text-slate-500">No access items were requested.</p>}
        </div>
      </section>
      {request.status === 'approved' || request.status === 'provisioned'
        ? <ProvisioningControls requestId={request.id} savedScript={request.powershell_script} status={request.status} />
        : <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">Provisioning becomes available after a manager approves the request.</div>}
    </div>
  )
}
