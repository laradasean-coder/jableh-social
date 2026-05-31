/**
 * Notification Service v2 — بدون Twilio
 * يستخدم Supabase Edge Functions مع Unifonic/Infobip/WhatsApp Direct
 */
import { supabase } from './supabase'

/**
 * إرسال SMS لقائمة أرقام
 * @param {string[]} phones - أرقام الهواتف
 * @param {string} message - نص الرسالة
 */
export async function sendSMS(phones, message) {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: { phones, message, type: 'sms', log: true }
    })
    if (error) throw error
    return { success: true, data }
  } catch(e) {
    console.warn('SMS unavailable:', e.message)
    // Fallback: إشعار داخلي
    return { success: false, error: e.message }
  }
}

/**
 * إرسال واتساب لموظف
 * @param {string} phone
 * @param {string} message
 */
export async function sendWhatsApp(phone, message) {
  try {
    const { data, error } = await supabase.functions.invoke('send-whatsapp', {
      body: { phone, message }
    })
    if (error) throw error
    return { success: true, data }
  } catch(e) {
    console.warn('WhatsApp unavailable:', e.message)
    return { success: false, error: e.message }
  }
}

/**
 * إشعار داخلي عبر Supabase (يعمل دائماً)
 */
export async function sendInAppNotification(userId, title, body, link = null) {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId, title, body, link, type: 'info'
  })
  return { success: !error }
}

/**
 * إشعار جميع الموظفين عند طلب إغاثة جديد
 */
export async function notifyStaffNewRelief(applicantName, requestId) {
  const { data: staff } = await supabase
    .from('profiles').select('id,phone').in('role', ['admin','staff'])
  if (!staff) return

  // إشعارات داخلية
  for (const s of staff) {
    await sendInAppNotification(
      s.id,
      `🆘 طلب إغاثة جديد`,
      `طلب من: ${applicantName}`,
      '/relief-admin'
    )
  }

  // SMS/WhatsApp للموظفين الذين لديهم أرقام (اختياري - يعمل فقط إذا فُعّل المزوّد)
  const phones = staff.filter(s => s.phone).map(s => s.phone)
  if (phones.length) {
    await sendSMS(phones, `🔔 طلب إغاثة جديد من ${applicantName} — يرجى المراجعة على منصة جبلة`)
  }
}

/**
 * إشعار المتقدم بقرار طلبه
 */
export async function notifyApplicant(phone, applicantName, status) {
  const messages = {
    transferred: `مرحباً ${applicantName}، تمت الموافقة على طلب الإغاثة المقدم منك. سيتم التواصل معك قريباً. — دائرة جبلة للشؤون الاجتماعية`,
    rejected:    `مرحباً ${applicantName}، تعذّر قبول طلب الإغاثة المقدم منك في الوقت الحالي. يمكنك التواصل مع الدائرة لمزيد من المعلومات. — دائرة جبلة`,
    reviewed:    `مرحباً ${applicantName}، طلبك قيد المراجعة من قِبل اللجنة المختصة. — دائرة جبلة للشؤون الاجتماعية`,
  }
  const msg = messages[status]
  if (msg && phone) {
    return sendSMS([phone], msg)
  }
}
