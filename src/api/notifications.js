import { supabase } from '../lib/supabase'

export async function getNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) return []
  return data || []
}

export async function markNotificationRead(id) {
  await supabase.from('notifications').update({ is_read: true }).eq('id', id)
}

export async function markAllNotificationsRead(userId) {
  await supabase.from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
}
