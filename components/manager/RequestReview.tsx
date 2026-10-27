'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { decideOnboardingRequest } from '@/actions/manager'
import { getActionErrorMessage } from '@/lib/action-errors'

type AccessItem = { id: string; name: string; description: string | null; ai_suggested: boolean; approved: boolean | null }

export default function RequestReview({
  requestId,
  initialItems,
}: {
  requestId: string
  initialItems: AccessItem[]
}) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems.map((item) => ({ id: item.id, approved: item.approved !== false })))
  const [comment, setComment] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(decision: 'approved' | 'rejected') {
    setPending(true)
    try {
      const result = await decideOnboardingRequest({ request_id: requestId, decision, comment, items })
      if (result.error) toast.error(result.error)
      else {
        toast.success(decision === 'approved' ? 'Request approved.' : 'Request rejected.')
        router.push('/dashboard/manager')
        router.refresh()
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not submit your review.'))
    } finally {
      setPending(false)
    }
  }

  function setApproved(id: string, approved: boolean) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, approved } : item))
  }

  return (
    <form className="space-y-6" onSubmit={(event) => {
      event.preventDefault()
      void submit('approved')
    }}>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-5">
          <p className="section-eyebrow">ACCESS REVIEW</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Approve the access this employee needs</h2>
        </div>
        {initialItems.length ? (
          <div className="divide-y divide-slate-100">
            {initialItems.map((item) => {
              const approved = items.find((value) => value.id === item.id)?.approved ?? true
              return (
                <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center" key={item.id}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">{item.name}</p>
                      {item.ai_suggested && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">Role suggested</span>}
                    </div>
                    {item.description && <p className="mt-1 text-sm text-slate-500">{item.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button aria-pressed={approved} className={approved ? 'rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800' : 'rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500'} onClick={() => setApproved(item.id, true)} type="button">Approve</button>
                    <button aria-pressed={!approved} className={!approved ? 'rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-800' : 'rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500'} onClick={() => setApproved(item.id, false)} type="button">Deny</button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : <p className="text-sm text-slate-500">No access items were requested. You can still approve or reject this onboarding request.</p>}
      </section>

      <label className="field-label">
        Note for HR and IT
        <textarea className="field-input min-h-28 resize-y" maxLength={2000} onChange={(event) => setComment(event.target.value)} placeholder="Add context or an approval condition…" value={comment} />
      </label>
      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <button className="button-danger" disabled={pending} onClick={() => void submit('rejected')} type="button">{pending ? 'Saving…' : 'Reject request'}</button>
        <button className="button-primary" disabled={pending} type="submit">{pending ? 'Saving…' : 'Approve request'}</button>
      </div>
    </form>
  )
}
