/**
 * رفع صور الحالات الإغاثية إلى Cloudinary (استضافة خارجية)
 * مع ضغط تلقائي قبل الرفع لتوفير النقل والتخزين.
 *
 * الإعداد (مرة واحدة):
 *   1. أنشئ حساباً مجانياً على cloudinary.com
 *   2. Settings > Upload > Add upload preset
 *      - Signing Mode: Unsigned
 *      - Folder: jabla-relief-cases
 *      - (اختياري) قيّد الحجم والنوع
 *   3. ضع القيم في .env:
 *      VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
 *      VITE_CLOUDINARY_PRESET=your_unsigned_preset
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const PRESET     = import.meta.env.VITE_CLOUDINARY_PRESET

/**
 * ضغط الصورة في المتصفح قبل الرفع
 * يقلّص الأبعاد والجودة دون فقدان ملحوظ
 */
export function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { resolve(file); return }
    const img = new Image()
    const reader = new FileReader()
    reader.onload = e => { img.src = e.target.result }
    reader.onerror = reject
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        blob => blob ? resolve(new File([blob], file.name, { type: 'image/jpeg' })) : reject(new Error('compress failed')),
        'image/jpeg',
        quality
      )
    }
    img.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * رفع لـ Cloudinary — يرجع رابط الصورة المضغوطة
 * إن لم يُضبط Cloudinary، يُرجع null ليتراجع الكود لـ Supabase
 */
export async function uploadToCloudinary(file) {
  if (!CLOUD_NAME || !PRESET) {
    console.warn('Cloudinary غير مُعدّ — سيُستخدم Supabase Storage بديلاً')
    return null
  }
  // ضغط أولاً
  const compressed = await compressImage(file).catch(() => file)

  const fd = new FormData()
  fd.append('file', compressed)
  fd.append('upload_preset', PRESET)
  fd.append('folder', 'jabla-relief-cases')

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: fd,
  })
  if (!res.ok) throw new Error('Cloudinary upload failed')
  const data = await res.json()
  return data.secure_url   // رابط HTTPS للصورة
}

export const isCloudinaryConfigured = () => Boolean(CLOUD_NAME && PRESET)
