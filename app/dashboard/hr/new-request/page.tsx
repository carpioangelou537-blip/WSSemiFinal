import Link from 'next/link'
import NewRequestForm from '@/components/onboarding/NewRequestForm'
import LoadError from '@/components/ui/LoadError'
import { createClient } from '@/lib/supabase/server'

export default async function NewRequestPage() {
  const supabase = await createClient()
  const [{ data: managers, error: managersError }, { data: catalog, error: catalogError }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email').eq('role', 'manager').order('full_name'),
    supabase.from('access_catalog').select('id, name, description').order('name'),
  ])

  if (managersError) return <LoadError message={managersError.message} />
  if (catalogError) return <LoadError message={catalogError.message} />

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header className="page-heading">
        <div>
          <Link className="text-sm font-medium text-slate-500 hover:text-indigo-700" href="/dashboard/hr">← Back to overview</Link>
          <p className="section-eyebrow mt-6">NEW HIRE INTAKE</p>
          <h1 className="mt-2">Create an onboarding request</h1>
          <p>Share the essentials, choose a manager, and shape the access plan.</p>
        </div>
      </header>
      <NewRequestForm managers={managers ?? []} catalog={catalog ?? []} />
    </div>
  )
}
