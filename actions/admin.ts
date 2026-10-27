'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUserRole } from '@/lib/auth'

const accessSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500),
  ad_group_name: z.string().trim().max(128),
})

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  job_title: z.string().trim().min(2).max(120),
  department: z.string().trim().min(2).max(120),
  access_id: z.string().uuid(),
})

const requestIdSchema = z.string().uuid()

export async function saveAccessCatalogItem(input: unknown) {
  const parsed = accessSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the access item details.' }

  try {
    const { supabase, user } = await requireUserRole('it_admin')
    const { id, ...values } = parsed.data
    const result = id
      ? await supabase.from('access_catalog').update(values).eq('id', id).select('id').single()
      : await supabase.from('access_catalog').insert(values).select('id').single()
    if (result.error) throw new Error(`Could not save the access item: ${result.error.message}`)

    const { error } = await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: id ? 'update_catalog_item' : 'create_catalog_item',
      details: { id: result.data.id, name: values.name },
    })
    if (error) throw new Error(`Access item saved, but its audit record failed: ${error.message}`)
    revalidatePath('/dashboard/admin/catalog')
    revalidatePath('/dashboard/admin/templates')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the access item.' }
  }
}

export async function deleteAccessCatalogItem(input: unknown) {
  const parsed = requestIdSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid access item.' }

  try {
    const { supabase, user } = await requireUserRole('it_admin')
    const { error } = await supabase.from('access_catalog').delete().eq('id', parsed.data)
    if (error) throw new Error(`Could not delete the access item: ${error.message}`)
    const { error: auditError } = await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'delete_catalog_item',
      details: { id: parsed.data },
    })
    if (auditError) throw new Error(`Access item deleted, but its audit record failed: ${auditError.message}`)
    revalidatePath('/dashboard/admin/catalog')
    revalidatePath('/dashboard/admin/templates')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not delete the access item.' }
  }
}

export async function saveRoleTemplate(input: unknown) {
  const parsed = templateSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Check the role template details.' }

  try {
    const { supabase, user } = await requireUserRole('it_admin')
    const { id, ...values } = parsed.data
    const result = id
      ? await supabase.from('role_templates').update(values).eq('id', id).select('id').single()
      : await supabase.from('role_templates').insert(values).select('id').single()
    if (result.error) throw new Error(`Could not save the role template: ${result.error.message}`)

    const { error } = await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: id ? 'update_template' : 'create_template',
      details: { id: result.data.id, job_title: values.job_title, department: values.department },
    })
    if (error) throw new Error(`Role template saved, but its audit record failed: ${error.message}`)
    revalidatePath('/dashboard/admin/templates')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save the role template.' }
  }
}

export async function deleteRoleTemplate(input: unknown) {
  const parsed = requestIdSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid role template.' }

  try {
    const { supabase, user } = await requireUserRole('it_admin')
    const { error } = await supabase.from('role_templates').delete().eq('id', parsed.data)
    if (error) throw new Error(`Could not delete the role template: ${error.message}`)
    const { error: auditError } = await supabase.from('audit_logs').insert({
      actor_id: user.id,
      action: 'delete_template',
      details: { id: parsed.data },
    })
    if (auditError) throw new Error(`Role template deleted, but its audit record failed: ${auditError.message}`)
    revalidatePath('/dashboard/admin/templates')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not delete the role template.' }
  }
}

function quotePowerShell(value: string) {
  return `'${value.replace(/'/g, "''").replace(/[\r\n]/g, ' ')}'`
}

export async function generateProvisioningScript(input: unknown) {
  const parsed = requestIdSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid onboarding request.' }

  try {
    const { supabase, user } = await requireUserRole('it_admin')
    const { data: request, error: requestError } = await supabase
      .from('onboarding_requests')
      .select('id, employee_name, employee_email, status')
      .eq('id', parsed.data)
      .maybeSingle()
    if (requestError) throw new Error(`Could not load the request: ${requestError.message}`)
    if (!request) throw new Error('Request not found.')
    if (request.status !== 'approved') throw new Error('A PowerShell script can only be generated for an approved request.')

    const { data: items, error: itemsError } = await supabase
      .from('request_access_items')
      .select('access_id')
      .eq('request_id', request.id)
      .eq('approved', true)
    if (itemsError) throw new Error(`Could not load approved access items: ${itemsError.message}`)

    const accessIds = [...new Set((items ?? []).map((item) => item.access_id))]
    let groups: string[] = []
    if (accessIds.length) {
      const { data: accessItems, error: accessError } = await supabase
        .from('access_catalog')
        .select('ad_group_name')
        .in('id', accessIds)
      if (accessError) throw new Error(`Could not load approved access groups: ${accessError.message}`)
      groups = (accessItems ?? [])
        .map((item) => item.ad_group_name)
        .filter((name): name is string => Boolean(name?.trim()))
    }
    const uniqueGroups = [...new Set(groups)]
    const samAccountName = request.employee_email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 20) || 'new.user'
    const lines = [
      '# Review and run this script manually. AccessFlow AI never executes it.',
      `$user = New-ADUser -Name ${quotePowerShell(request.employee_name)} -SamAccountName ${quotePowerShell(samAccountName)} -UserPrincipalName ${quotePowerShell(request.employee_email)} -Enabled $true -PassThru`,
      ...uniqueGroups.map((group) => `Add-ADGroupMember -Identity ${quotePowerShell(group)} -Members $user`),
    ]
    const script = lines.join('\n')

    const { data: savedRequest, error: saveError } = await supabase
      .from('onboarding_requests')
      .update({ powershell_script: script })
      .eq('id', request.id)
      .eq('status', 'approved')
      .select('id')
      .maybeSingle()
    if (saveError) throw new Error(`Could not save the provisioning script: ${saveError.message}`)
    if (!savedRequest) throw new Error('This request is no longer approved. Reload before generating a script.')

    const { error: auditError } = await supabase.from('audit_logs').insert({
      request_id: request.id,
      actor_id: user.id,
      action: 'generate_script',
      details: { approved_group_count: uniqueGroups.length },
    })
    if (auditError) throw new Error(`Script saved, but its audit record failed: ${auditError.message}`)
    revalidatePath('/dashboard/admin')
    revalidatePath(`/dashboard/admin/${request.id}`)
    return { success: true, script }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not generate the provisioning script.' }
  }
}

export async function markRequestProvisioned(input: unknown) {
  const parsed = requestIdSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid onboarding request.' }

  try {
    const { supabase, user } = await requireUserRole('it_admin')
    const { data: updatedRequest, error } = await supabase
      .from('onboarding_requests')
      .update({ status: 'provisioned' })
      .eq('id', parsed.data)
      .eq('status', 'approved')
      .select('id')
      .maybeSingle()
    if (error) throw new Error(`Could not mark the request as provisioned: ${error.message}`)
    if (!updatedRequest) throw new Error('Only approved requests can be marked as provisioned.')

    const { error: auditError } = await supabase.from('audit_logs').insert({
      request_id: parsed.data,
      actor_id: user.id,
      action: 'mark_provisioned',
      details: {},
    })
    if (auditError) throw new Error(`Request updated, but its audit record failed: ${auditError.message}`)
    revalidatePath('/dashboard/admin')
    revalidatePath(`/dashboard/admin/${parsed.data}`)
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not update the request.' }
  }
}
