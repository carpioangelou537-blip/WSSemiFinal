import Link from 'next/link'
import { notFound } from 'next/navigation'
import RequestReview from '@/components/manager/RequestReview'
import LoadError from '@/components/ui/LoadError'
import { createClient } from '@/lib/supabase/server'

export default async function ManagerRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: request, error } = await supabase
    .from('onboarding_requests')
    .select('id, employee_name, employee_email, job_title, department, start_date, status, ai_summary')
    .eq('id', id)
    .maybeSingle()

  if (error) return <LoadError message={error.message} />
  if (!request) notFound()
  if (request.status !== 'pending_manager') notFound()

  const { data: requestItems, error: itemError } = await supabase
    .from('request_access_items')
    .select('id, access_id, ai_suggested, approved')
    .eq('request_id', id)
  if (itemError) return <LoadError message={itemError.message} />

  const accessIds = [...new Set((requestItems ?? []).map((item) => item.access_id))]
  const { data: accessItems, error: accessError } = accessIds.length
    ? await supabase.from('access_catalog').select('id, name, description').in('id', accessIds)
    : { data: [], error: null }
  if (accessError) return <LoadError message={accessError.message} />
  const accessById = new Map((accessItems ?? []).map((item) => [item.id, item]))
  const reviewItems = (requestItems ?? []).map((item) => ({
    id: item.id,
    name: accessById.get(item.access_id)?.name ?? 'Unavailable access item',
    description: accessById.get(item.access_id)?.description ?? null,
    ai_suggested: item.ai_suggested,
    approved: item.approved,
  }))

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header>
        <Link className="text-sm font-medium text-slate-500 hover:text-indigo-700" href="/dashboard/manager">← Back to review queue</Link>
        <div className="mt-6">
          <p className="section-eyebrow">MANAGER REVIEW</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{request.employee_name}</h1>
          <p className="mt-2 text-slate-500">{request.job_title} · {request.department} · Starts {request.start_date || 'date not set'}</p>
        </div>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-slate-500">Employee email</p>
        <p className="mt-1 font-semibold text-slate-900">{request.employee_email}</p>
        {request.ai_summary && <div className="mt-5 rounded-xl bg-indigo-50 p-4 text-sm leading-6 text-indigo-950"><span className="font-semibold">Access rationale · </span>{request.ai_summary}</div>}
      </section>
      <RequestReview initialItems={reviewItems} requestId={request.id} />
    </div>
  )
}
