'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveRecord(
  orgId: string,
  docId: string,
  orgFields: Record<string, unknown>,
  docFields: Record<string, unknown>,
  changeSummary: string,
  needsReview = false,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: appUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || !['admin', 'authorised'].includes(appUser.role)) {
    return { error: 'Insufficient permissions' }
  }

  if (Object.keys(orgFields).length > 0) {
    const { error } = await supabase.from('org_entity').update(orgFields).eq('id', orgId)
    if (error) return { error: error.message }
  }

  if (Object.keys(docFields).length > 0) {
    const { error } = await supabase.from('document').update(docFields).eq('id', docId)
    if (error) return { error: error.message }
  }

  await supabase.from('changes').insert({
    doc_id: docId,
    is_changed: true,
    summary_changes: changeSummary || 'Fields updated via dashboard',
    needs_review: needsReview,
    status: 'Updated',
    changed_by: user.id,
    date_of_review: new Date().toISOString(),
  })

  revalidatePath(`/records/${docId}`)
  revalidatePath('/records')
  return { success: true }
}

export async function createRecord(
  orgFields: {
    name: string
    legal_name?: string
    url_link?: string
    products?: string
    product_description?: string
    location?: string[]
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: appUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || !['admin', 'authorised'].includes(appUser.role)) {
    return { error: 'Insufficient permissions' }
  }

  const { data: org, error: orgError } = await supabase
    .from('org_entity')
    .insert({ ...orgFields, published: false })
    .select()
    .single()

  if (orgError) return { error: orgError.message }

  const { data: doc, error: docError } = await supabase
    .from('document')
    .insert({ org_id: org.id, current_status: 'Not Assessed' })
    .select()
    .single()

  if (docError) return { error: docError.message }

  await supabase.from('changes').insert({
    doc_id: doc.id,
    is_changed: false,
    summary_changes: 'Record created via dashboard',
    needs_review: false,
    status: 'Initial analysis',
    changed_by: user.id,
    date_of_review: new Date().toISOString(),
  })

  return { success: true, orgId: org.id, docId: doc.id }
}

/**
 * Create a new org + document row and immediately queue a new analysis.
 * Used by the New Record page — the only required field is display name.
 */
export async function createAndQueueRecord(name: string, url_link?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: appUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || !['admin', 'authorised'].includes(appUser.role)) {
    return { error: 'Insufficient permissions' }
  }

  const { data: org, error: orgError } = await supabase
    .from('org_entity')
    .insert({ name, url_link: url_link || null, published: false })
    .select()
    .single()

  if (orgError) return { error: orgError.message }

  const { data: doc, error: docError } = await supabase
    .from('document')
    .insert({ org_id: org.id, current_status: 'Not Assessed' })
    .select()
    .single()

  if (docError) return { error: docError.message }

  await supabase.from('changes').insert({
    doc_id: doc.id,
    is_changed: false,
    summary_changes: 'Record created via dashboard — analysis queued',
    needs_review: false,
    status: 'Initial analysis',
    changed_by: user.id,
    date_of_review: new Date().toISOString(),
  })

  const { error: queueError } = await supabase.from('analysis_queue').insert({
    company_name: name,
    company_url: url_link || null,
    analysis_type: 'new',
    status: 'pending',
    org_id: org.id,
    requested_by: user.id,
  })

  if (queueError) return { error: queueError.message }

  revalidatePath('/records')
  return { success: true, docId: doc.id }
}

export async function requestAnalysis(
  companyName: string,
  companyUrl: string,
  analysisType: 'new' | 'reanalyse' | 'hard_reanalyse'
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: appUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || !['admin', 'authorised'].includes(appUser.role)) {
    return { error: 'Insufficient permissions' }
  }

  const { error } = await supabase.from('analysis_queue').insert({
    company_name: companyName,
    company_url: companyUrl || null,
    analysis_type: analysisType,
    status: 'pending',
  })

  if (error) return { error: error.message }

  revalidatePath('/records?filter=requested')
  return { success: true }
}

/**
 * Save any pending edits, then add the company to the analysis queue.
 * Called from the Re-analyse and Check DPA Date confirm modals.
 * The record will be locked for editing until the queue item completes.
 */
export async function queueAnalysis(
  orgId: string,
  docId: string,
  companyName: string,
  companyUrl: string,
  analysisType: 'reanalyse' | 'hard_reanalyse',
  orgChanges: Record<string, unknown>,
  docChanges: Record<string, unknown>,
  needsReview: boolean,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: appUser } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (!appUser || !['admin', 'authorised'].includes(appUser.role)) {
    return { error: 'Insufficient permissions' }
  }

  // Save any pending edits first
  if (Object.keys(orgChanges).length > 0) {
    const { error } = await supabase.from('org_entity').update(orgChanges).eq('id', orgId)
    if (error) return { error: error.message }
  }

  if (Object.keys(docChanges).length > 0) {
    const { error } = await supabase.from('document').update(docChanges).eq('id', docId)
    if (error) return { error: error.message }
  }

  if (Object.keys(orgChanges).length > 0 || Object.keys(docChanges).length > 0) {
    const changedKeys = [...Object.keys(orgChanges), ...Object.keys(docChanges)]
    await supabase.from('changes').insert({
      doc_id: docId,
      is_changed: true,
      summary_changes: `Fields saved before analysis: ${changedKeys.join(', ')}`,
      needs_review: needsReview,
      status: 'Updated',
      changed_by: user.id,
      date_of_review: new Date().toISOString(),
    })
  }

  // Add to analysis queue
  const { error: queueError } = await supabase.from('analysis_queue').insert({
    company_name: companyName,
    company_url: companyUrl || null,
    analysis_type: analysisType,
    status: 'pending',
    org_id: orgId,
    requested_by: user.id,
  })

  if (queueError) return { error: queueError.message }

  revalidatePath(`/records/${docId}`)
  revalidatePath('/records')
  return { success: true }
}
