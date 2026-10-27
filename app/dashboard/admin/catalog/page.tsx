import CatalogManager from '@/components/admin/CatalogManager'
import LoadError from '@/components/ui/LoadError'
import { createClient } from '@/lib/supabase/server'

export default async function CatalogPage() {
  const supabase = await createClient()
  const { data: catalog, error } = await supabase.from('access_catalog').select('*').order('name')
  if (error) return <LoadError message={error.message} />

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="page-heading">
        <div>
          <p className="section-eyebrow">ACCESS GOVERNANCE</p>
          <h1 className="mt-2">Access catalog</h1>
          <p>Maintain reusable permissions and their Active Directory group mappings.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200">{catalog?.length ?? 0} items</span>
      </header>
      <CatalogManager initialItems={catalog ?? []} />
    </div>
  )
}
