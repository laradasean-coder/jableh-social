import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Upload, X, FileText, Image, RefreshCw, CheckCircle } from 'lucide-react'

// ضغط الصور قبل الرفع: تصغير للأبعاد القصوى وإعادة ترميز لتقليل الحجم
async function compressImage(file, maxDim = 1600, quality = 0.82) {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
    if (scale === 1 && file.size < 500 * 1024) return file
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale)
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
    canvas.getContext('2d').drawImage(bmp, 0, 0, w, h)
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.(png|webp|bmp|jpeg|jpg)$/i, '.jpg'), { type: 'image/jpeg' })
  } catch { return file }
}

export default function FileUpload({ entityType, entityId, onUploaded, accept = '*', label = 'رفع ملف' }) {
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState('')
  const [preview,   setPreview]   = useState(null)
  const inputRef = useRef()

  const handleFile = async (e) => {
    let file = e.target.files[0]
    if (!file) return
    setError('')
    file = await compressImage(file)
    // Preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setPreview(ev.target.result)
      reader.readAsDataURL(file)
    }
    setUploading(true)
    try {
      const path = `${entityType}/${entityId}/${Date.now()}_${file.name}`
      const { data, error: upErr } = await supabase.storage
        .from('uploads').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)
      // Save metadata
      await supabase.from('uploaded_files').insert({
        entity_type: entityType, entity_id: entityId,
        file_name: file.name, file_url: publicUrl,
        file_type: file.type, file_size: file.size
      })
      onUploaded && onUploaded({ name: file.name, url: publicUrl, type: file.type })
    } catch (err) {
      // Fallback: create object URL for demo
      const url = URL.createObjectURL(file)
      onUploaded && onUploaded({ name: file.name, url, type: file.type, demo: true })
      setError('ملاحظة: Supabase Storage غير مهيأ. الملف متاح محلياً فقط.')
    }
    setUploading(false)
    inputRef.current.value = ''
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile}/>
      <button type="button"
        onClick={() => inputRef.current.click()}
        disabled={uploading}
        className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 
                   text-blue-700 px-4 py-2 rounded-xl text-sm transition-colors font-medium">
        {uploading
          ? <><RefreshCw size={15} className="animate-spin"/> جاري الرفع...</>
          : <><Upload size={15}/> {label}</>}
      </button>
      {error && <p className="text-xs text-yellow-700 mt-1">{error}</p>}
    </div>
  )
}

export function ImageUpload({ value, onChange, placeholder = 'رفع صورة', className = '' }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef()

  const handleFile = async (e) => {
    let file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      file = await compressImage(file)
      const path = `images/${Date.now()}_${file.name}`
      const { error: upErr } = await supabase.storage.from('uploads').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)
      onChange(publicUrl)
    } catch {
      // Demo: use object URL
      const url = URL.createObjectURL(file)
      onChange(url)
    }
    setUploading(false)
    inputRef.current.value = ''
  }

  return (
    <div className={`relative ${className}`}>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile}/>
      <div
        onClick={() => inputRef.current.click()}
        className="cursor-pointer border-2 border-dashed border-gray-300 hover:border-blue-400 
                   rounded-2xl flex flex-col items-center justify-center gap-2 p-4 transition-colors
                   bg-gray-50 hover:bg-blue-50 min-h-[120px]">
        {value
          ? <img src={value} alt="preview" className="max-h-28 rounded-xl object-cover"/>
          : <>
              <Image size={28} className="text-gray-300"/>
              <span className="text-xs text-gray-400">{placeholder}</span>
            </>
        }
        {uploading && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-2xl">
            <RefreshCw size={20} className="animate-spin text-blue-600"/>
          </div>
        )}
      </div>
      {value && (
        <button type="button" onClick={() => onChange('')}
          className="absolute top-1 left-1 bg-red-500 text-white rounded-full p-0.5">
          <X size={12}/>
        </button>
      )}
    </div>
  )
}
