import { createClient } from '@/lib/supabase/server'
import LoadError from '@/components/ui/LoadError'
import Link from 'next/link'

const knownActions = [
  'create_request',
  'approve_request',
  'reject_request',
  'deny_access_item',
  'generate_script',
  'mark_provisioned',
  'create_catalog_item',
  'update_catalog_item',
  'delete_catalog_item',
  'create_template',
  'update_template',
  'delete_template',
]

type AuditFilters = { action?: string; from?: string; to?: string }

export default async function AuditPage({ searchParams }: { searchParams: Promise<AuditFilters> }) {
  const filters = await searchParams
  const supabase = await createClient()
  let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
  if (filters.action && knownActions.includes(filters.action)) query = query.eq('action', filters.action)
  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) query = query.gte('created_at', `${filters.from}T00:00:00.000Z`)
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) query = query.lte('created_at', `${filters.to}T23:59:59.999Z`)
  const { data: logs, error } = await query
  if (error) return <LoadError message={error.message} />

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="page-heading">
        <div>
          <p className="section-eyebrow">ACCOUNTABILITY</p>
          <h1 className="mt-2">Audit log</h1>
          <p>Review a read-only history of access decisions and administrative changes.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200">{logs?.length ?? 0} events</span>
      </header>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4 sm:items-end" method="get">
        <label className="field-label">
          Action
          <select className="field-input" defaultValue={filters.action ?? ''} name="action">
            <option value="">All actions</option>
            {knownActions.map((action) => <option key={action} value={action}>{action.replaceAll('_', ' ')}</option>)}
          </select>
        </label>
        <label className="field-label">
          From
          <input className="field-input" defaultValue={filters.from ?? ''} name="from" type="date" />
        </label>
        <label className="field-label">
          To
          <input className="field-input" defaultValue={filters.to ?? ''} name="to" type="date" />
        </label>
        <div className="flex gap-2">
          <button className="button-primary flex-1" type="submit">Apply filters</button>
          <Link className="button-secondary" href="/dashboard/admin/audit">Clear</Link>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {(logs ?? []).length ? <div className="divide-y divide-slate-100">
          {logs?.map((log) => (
            <article className="grid gap-3 px-5 py-5 sm:grid-cols-[minmax(130px,0.6fr)_minmax(160px,1fr)_minmax(0,2fr)] sm:items-start sm:px-7" key={log.id}>
              <div>
                <p className="text-sm font-semibold text-slate-900">{log.action.replaceAll('_', ' ')}</p>
                <p className="mt-1 text-xs text-slate-500">{log.created_at ? new Date(log.created_at).toLocaleString() : 'Date unavailable'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Request</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-600">{log.request_id ?? '—'}</p>
              </div>
              <details className="min-w-0">
                <summary className="cursor-pointer text-xs font-semibold text-indigo-700">View event details</summary>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs leading-5 text-emerald-100">{JSON.stringify(log.details, null, 2)}</pre>
              </details>
            </article>
          ))}
        </div> : <div className="empty-state"><p className="font-semibold text-slate-900">No matching audit events</p><p className="mt-1 text-sm">Try widening the selected date range or clearing the action filter.</p></div>}
      </section>
      <p className="text-xs text-slate-400">Showing up to 200 events. Audit records are read-only in this interface.</p>
    </div>
  )
}
