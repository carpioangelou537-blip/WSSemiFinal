'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createOnboardingRequest, suggestRoleAccess } from '@/actions/onboarding'
import { getActionErrorMessage } from '@/lib/action-errors'
import type { Database } from '@/types/database'

type Manager = Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'full_name' | 'email'>
type AccessItem = Pick<Database['public']['Tables']['access_catalog']['Row'], 'id' | 'name' | 'description'>

export default function NewRequestForm({
  managers,
  catalog,
}: {
  managers: Manager[]
  catalog: AccessItem[]
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    employee_name: '',
    employee_email: '',
    job_title: '',
    department: '',
    start_date: '',
    manager_id: '',
  })
  const [suggested, setSuggested] = useState<string[]>([])
  const [summary, setSummary] = useState('')
  const [extras, setExtras] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [pending, setPending] = useState(false)

  async function loadSuggestions() {
    setSuggesting(true)
    try {
      const result = await suggestRoleAccess({ job_title: form.job_title, department: form.department })
      if (result.error) {
        toast.error(result.error)
      } else {
        const accessIds = result.accessIds ?? []
        setSuggested(accessIds)
        setSummary(result.summary ?? '')
        toast.success(accessIds.length ? 'Role-based access suggestions loaded.' : 'No matching role template was found.')
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not load suggestions.'))
    } finally {
      setSuggesting(false)
    }
  }

  function toggleExtra(id: string) {
    setExtras((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id])
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    try {
      const result = await createOnboardingRequest({ ...form, extra_access_ids: extras })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Onboarding request sent to the manager.')
        router.push('/dashboard/hr')
        router.refresh()
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not create the request.'))
    } finally {
      setPending(false)
    }
  }

  const selectedSuggested = catalog.filter((item) => suggested.includes(item.id))
  const availableExtras = catalog.filter((item) => !suggested.includes(item.id))

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <p className="section-eyebrow">EMPLOYEE DETAILS</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Who are we onboarding?</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="field-label">
            Full name
            <input className="field-input" maxLength={120} onChange={(event) => setForm({ ...form, employee_name: event.target.value })} required value={form.employee_name} />
          </label>
          <label className="field-label">
            Work email
            <input className="field-input" maxLength={254} onChange={(event) => setForm({ ...form, employee_email: event.target.value })} required type="email" value={form.employee_email} />
          </label>
          <label className="field-label">
            Job title
            <input className="field-input" maxLength={120} onChange={(event) => setForm({ ...form, job_title: event.target.value })} required value={form.job_title} />
          </label>
          <label className="field-label">
            Department
            <input className="field-input" maxLength={120} onChange={(event) => setForm({ ...form, department: event.target.value })} required value={form.department} />
          </label>
          <label className="field-label">
            Start date
            <input className="field-input" onChange={(event) => setForm({ ...form, start_date: event.target.value })} type="date" value={form.start_date} />
          </label>
          <label className="field-label">
            Approving manager
            <select className="field-input" onChange={(event) => setForm({ ...form, manager_id: event.target.value })} required value={form.manager_id}>
              <option value="">{managers.length ? 'Select a manager' : 'No manager accounts available'}</option>
              {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.full_name || manager.email || 'Manager'}</option>)}
            </select>
          </label>
        </div>
        {!managers.length && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            No manager profiles are available to assign. Create the manager in Supabase Authentication, then run the role assignment steps in <code className="rounded bg-amber-100 px-1 py-0.5">supabase/assign-manager-role.sql</code>.
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="section-eyebrow">ACCESS PLAN</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Start with the right permissions</h2>
            <p className="mt-1 text-sm text-slate-500">Recommendations use your role templates. Review them before sending.</p>
          </div>
          <button
            className="button-secondary shrink-0"
            disabled={!form.job_title.trim() || !form.department.trim() || suggesting}
            onClick={loadSuggestions}
            type="button"
          >
            {suggesting ? 'Finding access…' : 'Suggest role access'}
          </button>
        </div>

        {summary && <p className="mt-5 rounded-xl bg-indigo-50 p-4 text-sm leading-6 text-indigo-950">{summary}</p>}

        <div className="mt-6 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Role recommendations</h3>
          {suggested.length ? selectedSuggested.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <span aria-hidden="true" className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">✓</span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                {item.description && <p className="mt-1 text-sm text-slate-500">{item.description}</p>}
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">Suggested</span>
            </div>
          )) : (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              Use “Suggest role access” to find recommendations. No suggestions are added until a matching role template is found.
            </p>
          )}
        </div>

        <div className="mt-7 space-y-3">
          <h3 className="text-sm font-semibold text-slate-800">Additional access</h3>
          {availableExtras.length ? availableExtras.map((item) => (
            <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-indigo-300">
              <input checked={extras.includes(item.id)} className="mt-1 size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" onChange={() => toggleExtra(item.id)} type="checkbox" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">{item.name}</span>
                {item.description && <span className="mt-1 block text-sm text-slate-500">{item.description}</span>}
              </span>
            </label>
          )) : <p className="text-sm text-slate-500">{catalog.length ? 'All catalog items are already in the recommendations.' : 'The access catalog is empty.'}</p>}
        </div>
      </section>

      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <button className="button-secondary" onClick={() => router.back()} type="button">Cancel</button>
        <button className="button-primary" disabled={pending || !managers.length} type="submit">
          {pending ? 'Submitting request…' : 'Send to manager'}
        </button>
      </div>
      {!managers.length && <p className="text-right text-sm text-amber-700">A manager profile is required before a request can be submitted.</p>}
    </form>
  )
}
