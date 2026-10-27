'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { deleteRoleTemplate, saveRoleTemplate } from '@/actions/admin'
import { getActionErrorMessage } from '@/lib/action-errors'
import type { Database } from '@/types/database'

type RoleTemplate = Database['public']['Tables']['role_templates']['Row']
type CatalogItem = Pick<Database['public']['Tables']['access_catalog']['Row'], 'id' | 'name'>

export default function RoleTemplateManager({
  initialTemplates,
  catalog,
}: {
  initialTemplates: RoleTemplate[]
  catalog: CatalogItem[]
}) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [pending, setPending] = useState(false)

  async function save(event: FormEvent<HTMLFormElement>, template?: RoleTemplate) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    try {
      const result = await saveRoleTemplate({
        ...(template ? { id: template.id } : {}),
        job_title: String(form.get('job_title') ?? ''),
        department: String(form.get('department') ?? ''),
        access_id: String(form.get('access_id') ?? ''),
      })
      if (result.error) toast.error(result.error)
      else {
        toast.success(template ? 'Role template updated.' : 'Role template created.')
        window.location.reload()
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not save the role template.'))
    } finally {
      setPending(false)
    }
  }

  async function remove(template: RoleTemplate) {
    if (!window.confirm(`Delete the ${template.job_title} / ${template.department} template?`)) return
    setPending(true)
    try {
      const result = await deleteRoleTemplate(template.id)
      if (result.error) toast.error(result.error)
      else {
        toast.success('Role template deleted.')
        setTemplates((current) => current.filter((value) => value.id !== template.id))
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not delete the role template.'))
    } finally {
      setPending(false)
    }
  }

  const textInput = 'field-input min-w-0'

  return (
    <div className="space-y-6">
      <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={(event) => save(event)}>
        <h2 className="text-base font-semibold text-slate-900">Add role template</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input className={textInput} maxLength={120} name="job_title" placeholder="Job title" required />
          <input className={textInput} maxLength={120} name="department" placeholder="Department" required />
          <select className={textInput} defaultValue="" name="access_id" required>
            <option disabled value="">Select access</option>
            {catalog.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <button className="button-primary mt-4" disabled={pending || !catalog.length} type="submit">{pending ? 'Saving…' : 'Add template'}</button>
        {!catalog.length && <p className="mt-3 text-sm text-amber-700">Add access catalog items first.</p>}
      </form>

      <div className="space-y-3">
        {templates.length ? templates.map((template) => (
          <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_1.2fr_auto_auto] md:items-center" key={template.id} onSubmit={(event) => save(event, template)}>
            <input aria-label="Job title" className={textInput} defaultValue={template.job_title} maxLength={120} name="job_title" required />
            <input aria-label="Department" className={textInput} defaultValue={template.department} maxLength={120} name="department" required />
            <select aria-label="Access item" className={textInput} defaultValue={template.access_id} name="access_id" required>
              {catalog.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button className="button-secondary" disabled={pending} type="submit">Save</button>
            <button className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50" disabled={pending} onClick={() => remove(template)} type="button">Delete</button>
          </form>
        )) : <div className="empty-state"><p>No role templates configured.</p><p className="mt-1 text-sm">Map a job title and department to recommended access.</p></div>}
      </div>
    </div>
  )
}
