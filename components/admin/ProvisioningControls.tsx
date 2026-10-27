'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { generateProvisioningScript, markRequestProvisioned } from '@/actions/admin'
import { getActionErrorMessage } from '@/lib/action-errors'

export default function ProvisioningControls({
  requestId,
  status,
  savedScript,
}: {
  requestId: string
  status: string
  savedScript: string | null
}) {
  const router = useRouter()
  const [script, setScript] = useState(savedScript ?? '')
  const [pending, setPending] = useState(false)

  async function generate() {
    setPending(true)
    try {
      const result = await generateProvisioningScript(requestId)
      if (result.error) toast.error(result.error)
      else if (result.script) {
        setScript(result.script)
        toast.success('PowerShell script generated and saved. Review it before manual use.')
        router.refresh()
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not generate the script.'))
    } finally {
      setPending(false)
    }
  }

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(script)
      toast.success('Script copied to clipboard.')
    } catch {
      toast.error('Clipboard access is unavailable. Select and copy the script manually.')
    }
  }

  async function markProvisioned() {
    setPending(true)
    try {
      const result = await markRequestProvisioned(requestId)
      if (result.error) toast.error(result.error)
      else {
        toast.success('Request marked as provisioned.')
        router.refresh()
      }
    } catch (error) {
      toast.error(getActionErrorMessage(error, 'Could not update the request.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="section-eyebrow">IT PROVISIONING</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Prepare access manually</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">The generated PowerShell is saved for review. AccessFlow AI never runs scripts or connects to Active Directory.</p>
        </div>
        {status === 'approved' && <button className="button-primary shrink-0" disabled={pending} onClick={generate} type="button">{pending ? 'Generating…' : 'Generate script'}</button>}
      </div>
      {script && (
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="text-xs font-medium text-slate-400">PowerShell · review before use</span>
            <button className="text-xs font-semibold text-indigo-300 hover:text-white" onClick={copyScript} type="button">Copy script</button>
          </div>
          <pre className="max-h-96 overflow-auto p-4 text-xs leading-6 text-emerald-200"><code>{script}</code></pre>
        </div>
      )}
      {status === 'approved' && script && (
        <button className="button-secondary mt-5" disabled={pending} onClick={markProvisioned} type="button">
          {pending ? 'Updating…' : 'Mark as provisioned'}
        </button>
      )}
      {status === 'provisioned' && <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-800">This request has been marked as provisioned.</p>}
      {status === 'approved' && !script && <p className="mt-5 text-sm text-slate-500">Generate the script before marking this request as provisioned.</p>}
    </section>
  )
}
