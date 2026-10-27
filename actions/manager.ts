'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireUserRole } from '@/lib/auth'

const decisionSchema = z.object({
  request_id: z.string().uuid(),
  decision: z.enum(['approved', 'rejected']),
  comment: z.string().trim().max(2000),
  items: z.array(z.object({
    id: z.string().uuid(),
    approved: z.boolean(),
  })).max(200),
})

export async function decideOnboardingRequest(input: unknown) {
  const parsed = decisionSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid review details.' }

  try {
    const { supabase, user } = await requireUserRole('manager')
    const { data: request, error: requestError } = await supabase
      .from('onboarding_requests')
      .select('id, manager_id, status')
      .eq('id', parsed.data.request_id)
      .maybeSingle()
    if (requestError) throw new Error(`Could not load the request: ${requestError.message}`)
    if (!request || request.manager_id !== user.id) throw new Error('This request is not assigned to you.')
    if (request.status !== 'pending_manager') throw new Error('This request has already been reviewed.')

    const { data: existingItems, error: itemsError } = await supabase
      .from('request_access_items')
      .select('id')
      .eq('request_id', request.id)
    if (itemsError) throw new Error(`Could not load request access items: ${itemsError.message}`)

    const existingIds = new Set((existingItems ?? []).map((item) => item.id))
    if (parsed.data.items.length !== existingIds.size || parsed.data.items.some((item) => !existingIds.has(item.id))) {
      throw new Error('The access list changed while you were reviewing. Reload and try again.')
    }

    for (const item of parsed.data.items) {
      const { error } = await supabase
        .from('request_access_items')
        .update({ approved: item.approved })
        .eq('id', item.id)
        .eq('request_id', request.id)
      if (error) throw new Error(`Could not save an access decision: ${error.message}`)

      if (!item.approved) {
        const { error: auditError } = await supabase.from('audit_logs').insert({
          request_id: request.id,
          actor_id: user.id,
          action: 'deny_access_item',
          details: { item_id: item.id },
        })
        if (auditError) throw new Error(`Access decision saved, but its audit record failed: ${auditError.message}`)
      }
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('onboarding_requests')
      .update({ status: parsed.data.decision, manager_comment: parsed.data.comment || null })
      .eq('id', request.id)
      .eq('manager_id', user.id)
      .eq('status', 'pending_manager')
      .select('id')
      .maybeSingle()
    if (updateError) throw new Error(`Could not update the request: ${updateError.message}`)
    if (!updatedRequest) throw new Error('This request was already reviewed. Reload the page to see its current status.')

    const { error: auditError } = await supabase.from('audit_logs').insert({
      request_id: request.id,
      actor_id: user.id,
      action: parsed.data.decision === 'approved' ? 'approve_request' : 'reject_request',
      details: { comment: parsed.data.comment, access_item_count: parsed.data.items.length },
    })
    if (auditError) throw new Error(`Request status updated, but its audit record failed: ${auditError.message}`)

    revalidatePath('/dashboard/manager')
    revalidatePath(`/dashboard/manager/${request.id}`)
    revalidatePath('/dashboard/admin')
    return { success: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not submit the request review.' }
  }
}
