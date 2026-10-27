'use client'

import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { deleteAccessCatalogItem, saveAccessCatalogItem } from '@/actions/admin'
import { getActionErrorMessage } from '@/lib/action-errors'
import type { Database } from '@/types/database'

type CatalogItem = Database['public']['Tables']['access_catalog']['Row']

export default function CatalogManager({ initialItems }: { initialItems: CatalogItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [draft, setDraft] = useState({ name: '', description: '', ad_group_name: '' })
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function save(event: FormEvent<HTMLFormElement>, item?: CatalogItem) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const values = {
      ...(item ? { id: item.id } : {}),
      name: String(form.get('name') ?? ''),
      description: String(form.get('description') ?? ''),
      ad_group_name: String(form.get('ad_group_name') ?? ''),
    }
    setPendingId(item?.id ?? 'new')
    try {
      const result = await saveAccessCatalogItem(values)
      if (result.error) toast.error(result.error)
      else {
        toast.success(item ? 'Access item updated.' : 'Access item created.')
        if (!item) setDraft({ name: '', description: '', ad_group_name: '' })
        window.location.reload()
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not save the access item.'))
    } finally {
      setPendingId(null)
    }
  }

  async function remove(item: CatalogItem) {
    if (!window.confirm(`Delete “${item.name}”? Existing requests may prevent this.`)) return
    setPendingId(item.id)
    try {
      const result = await deleteAccessCatalogItem(item.id)
      if (result.error) toast.error(result.error)
      else {
        toast.success('Access item deleted.')
        setItems((current) => current.filter((value) => value.id !== item.id))
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not delete the access item.'))
    } finally {
      setPendingId(null)
    }
  }

  const inputClass = 'field-input min-w-0'

  return (
    <div className="space-y-6">
      <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={(event) => save(event)}>
        <h2 className="text-base font-semibold text-slate-900">Add access item</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input className={inputClass} maxLength={120} name="name" onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Name" required value={draft.name} />
          <input className={inputClass} maxLength={500} name="description" onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Description" value={draft.description} />
          <input className={inputClass} maxLength={128} name="ad_group_name" onChange={(event) => setDraft({ ...draft, ad_group_name: event.target.value })} placeholder="Active Directory group" value={draft.ad_group_name} />
        </div>
        <button className="button-primary mt-4" disabled={pendingId === 'new'} type="submit">{pendingId === 'new' ? 'Adding…' : 'Add to catalog'}</button>
      </form>

      <div className="space-y-3">
        {items.length ? items.map((item) => (
          <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1.4fr_1fr_auto_auto] md:items-center" key={item.id} onSubmit={(event) => save(event, item)}>
            <input aria-label="Access name" className={inputClass} defaultValue={item.name} maxLength={120} name="name" required />
            <input aria-label="Description" className={inputClass} defaultValue={item.description ?? ''} maxLength={500} name="description" />
            <input aria-label="Active Directory group" className={inputClass} defaultValue={item.ad_group_name ?? ''} maxLength={128} name="ad_group_name" />
            <button className="button-secondary" disabled={pendingId === item.id} type="submit">{pendingId === item.id ? 'Saving…' : 'Save'}</button>
            <button className="rounded-lg px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50" disabled={pendingId === item.id} onClick={() => remove(item)} type="button">Delete</button>
          </form>
        )) : <div className="empty-state"><p>No access items yet.</p><p className="mt-1 text-sm">Add the permissions employees can request.</p></div>}
      </div>
    </div>
  )
}
