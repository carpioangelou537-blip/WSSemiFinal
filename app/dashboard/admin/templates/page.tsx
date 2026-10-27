import RoleTemplateManager from '@/components/admin/RoleTemplateManager'
import LoadError from '@/components/ui/LoadError'
import { createClient } from '@/lib/supabase/server'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const [{ data: templates, error: templateError }, { data: catalog, error: catalogError }] = await Promise.all([
    supabase.from('role_templates').select('*').order('department').order('job_title'),
    supabase.from('access_catalog').select('id, name').order('name'),
  ])
  if (templateError) return <LoadError message={templateError.message} />
  if (catalogError) return <LoadError message={catalogError.message} />

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="page-heading">
        <div>
          <p className="section-eyebrow">AI RECOMMENDATION RULES</p>
          <h1 className="mt-2">Role templates</h1>
          <p>Map job titles and departments to the access suggestions shown to HR.</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200">{templates?.length ?? 0} rules</span>
      </header>
      <RoleTemplateManager catalog={catalog ?? []} initialTemplates={templates ?? []} />
    </div>
  )
}
