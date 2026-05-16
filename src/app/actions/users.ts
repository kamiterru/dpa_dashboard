'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@/lib/types'

export async function updateUserRole(userId: string, role: UserRole | 'pending' | 'archived') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: self } = await supabase
    .from('users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (self?.role !== 'admin') return { error: 'Admins only' }

  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}
