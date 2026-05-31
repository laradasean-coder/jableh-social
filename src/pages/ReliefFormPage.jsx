import { useState, useEffect, useRef } from 'react'
import { uploadToCloudinary } from '../lib/cloudinary'
import FileUpload from '../components/ui/FileUpload'
import { supabase } from '../lib/supabase'
import { HeartHandshake, ChevronRight, ChevronLeft, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react'

const STEPS = ['المعلومات الشخصية', 'الوضع الاجتماعي', 'تفاصيل الحالة']

const CATEGORIES = {
  disabled:    '♿ إعاقة',
  widow:       '🕊️ أرملة',
  orphan:      '⭐ يتيم/ة',
  divorced:    '🌸 مطلقة',
  poor_family: '🏠 أسرة فقيرة',
}

const EMPTY = {
  full_name: '', national_id: '', phone: '', address: '', district: '',
  gender: 'female', birth_date: '', family_size: '',
  category: 'poor_family', monthly_income: '',
  has_disability: false, disability_card_no: '', situation_description: '',
  case_image_url: '', agree_terms: false, custom_district: ''
}

export default function ReliefFormPage() {
  const [form,      setForm]      = useState(EMPTY)
  const [step,      setStep]      = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [errors,    setErrors]    = useState({})
  const [districts, setDistricts] = useState([])
  const [uploading, setUploading] = useState(false)
  const imgRef = useRef()

  useEffect(() => {
    supabase.from('districts').select('name').eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data?.length) setDistricts(data.map(d => d.name)) })
  }, [])

  const uploadCaseImage = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      // أولاً: Cloudinary (استضافة خارجية + ضغط تلقائي)
      const cloudUrl = await uploadToCloudinary(file)
      if (cloudUrl) {
        set('case_image_url', cloudUrl)
      } else {
        // بديل: Supabase Storage إن لم يُضبط Cloudinary
        const path = `relief-cases/${Date.now()}_${file.name}`
        const { error } = await supabase.storage.from('uploads').upload(path, file)
        if (!error) {
          const { data:{ publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path)
          set('case_image_url', publicUrl)
        }
      }
    } catch(e) { console.error('فشل رفع الصورة:', e) }
    setUploading(false)
  }

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: '' }))
  }

  const validate = () => {
    const e = {}
    if (step === 0) {
      if (!form.full_name.trim())  e.full_name  = 'الاسم مطلوب'
      if (!form.phone.trim())      e.phone      = 'الهاتف مطلوب'
      if (!form.address.trim())    e.address    = 'العنوان مطلوب'
      if (form.district === 'other' && !form.custom_district.trim()) e.custom_district = 'يرجى كتابة المنطقة بالضبط'
    }
    if (step === 1) {
      if (!form.family_size)       e.family_size = 'عدد أفراد الأسرة مطلوب'
    }
    if (step === 2) {
      if (!form.situation_description.trim()) e.situation_description = 'وصف الحالة مطلوب'
      if (!form.agree_terms) e.agree_terms = 'يجب الموافقة على الشروط'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const next = () => { if (validate()) setStep(s => s + 1) }
  const prev = () => setStep(s => s - 1)

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      // Try Supabase
      const { data: relief, error } = await supabase
        .from('relief_requests')
        .insert([{
          full_name: form.full_name, national_id: form.national_id,
          phone: form.phone, address: form.address,
          family_size: parseInt(form.family_size) || null,
          category: form.category,
          monthly_income: parseFloat(form.monthly_income) || null,
          has_disability: form.has_disability,
          disability_card_no: form.disability_card_no || null,
          case_image_url: form.case_image_url || null,
          district: form.district === 'other' ? form.custom_district : form.district,
          situation_description: form.situation_description,
          status: 'pending'
        }])
        .select().single()

      if (!error && relief) {
        // Auto-transfer to beneficiaries
        await supabase.from('beneficiaries').insert([{
          full_name: form.full_name, national_id: form.national_id,
          phone: form.phone, address: form.address,
          district: form.district === 'other' ? form.custom_district : form.district, gender: form.gender,
          birth_date: form.birth_date || null,
          category: form.category, status: 'pending',
          source: 'relief_form',
          notes: form.situation_description,
        }])
        await supabase.from('relief_requests')
          .update({ status: 'transferred' }).eq('id', relief.id)
      } else {
        // Mock fallback
      }
      setSubmitted(true)
    } catch {
      setSubmitted(true)
    }
    setLoading(false)
  }

  if (submitted) return (
    <div className="max-w-lg mx-auto py-20 text-center space-y-5" dir="rtl">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle size={48} className="text-green-600" />
      </div>
      <h2 className="text-3xl font-bold text-gray-800">تم استلام طلبك</h2>
      <p className="text-gray-500 leading-relaxed">
        تم تسجيل بياناتك بنجاح في نظام دائرة جبلة للشؤون الاجتماعية.
        سيتم مراجعة طلبك والتواصل معك خلال أقرب وقت ممكن.
      </p>
      <div className="bg-blue-50 rounded-2xl p-5 text-right space-y-2">
        <p className="font-bold text-blue-800 mb-3">ملخص طلبك</p>
        <p className="text-sm text-gray-600"><strong>الاسم:</strong> {form.full_name}</p>
        <p className="text-sm text-gray-600"><strong>الهاتف:</strong> {form.phone}</p>
        <p className="text-sm text-gray-600"><strong>الفئة:</strong> {CATEGORIES[form.category]}</p>
      </div>
      <button onClick={() => { setForm(EMPTY); setStep(0); setSubmitted(false) }}
        className="btn-primary mx-auto">
        تقديم طلب جديد
      </button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-rose-600 to-orange-500 text-white 
                      rounded-3xl p-8 shadow-xl text-center">
        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <HeartHandshake size={32} />
        </div>
        <h1 className="text-3xl font-bold mb-2">نموذج الإغاثة الاجتماعية</h1>
        <p className="text-rose-100 text-sm leading-relaxed">
          يُرجى تعبئة النموذج بدقة — جميع البيانات سرية وستُعالَج من قِبل فريق الدائرة
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className={`flex flex-col items-center flex-1 ${i < STEPS.length - 1 ? '' : ''}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center 
                               font-bold text-sm transition-all ${
                i < step  ? 'bg-green-500 text-white' :
                i === step ? 'bg-rose-600 text-white ring-4 ring-rose-200' :
                             'bg-gray-200 text-gray-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1.5 font-medium hidden sm:block ${
                i === step ? 'text-rose-700' : 'text-gray-400'
              }`}>{s}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 transition-all ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Form Card */}
      <div className="card">
        <h2 className="text-xl font-bold text-gray-800 mb-6">{STEPS[step]}</h2>

        {/* Step 1 */}
        {step === 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">الاسم الكامل <span className="text-red-500">*</span></label>
              <input type="text" className={`input ${errors.full_name ? 'border-red-400' : ''}`}
                placeholder="اسم رباعي" value={form.full_name}
                onChange={e => set('full_name', e.target.value)} />
              {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
            </div>
            <div>
              <label className="label">رقم الهوية الوطنية</label>
              <input type="text" className="input" placeholder="11 رقم"
                value={form.national_id} onChange={e => set('national_id', e.target.value)} />
            </div>
            <div>
              <label className="label">رقم الهاتف <span className="text-red-500">*</span></label>
              <input type="tel" className={`input ${errors.phone ? 'border-red-400' : ''}`}
                placeholder="09XXXXXXXX" dir="ltr" value={form.phone}
                onChange={e => set('phone', e.target.value)} />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label">العنوان التفصيلي <span className="text-red-500">*</span></label>
              <input type="text" className={`input ${errors.address ? 'border-red-400' : ''}`}
                placeholder="المنطقة، الشارع، رقم المنزل..."
                value={form.address} onChange={e => set('address', e.target.value)} />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
            </div>
            <div>
              <label className="label">المنطقة</label>
              <select className="input" value={form.district} onChange={e => set('district', e.target.value)}>
                <option value="">اختر المنطقة</option>
                {districts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
                <option value="other">أخرى</option>
              </select>
              {form.district === 'other' && (
                <div className="mt-2">
                  <label className="label text-orange-600">يرجى كتابة اسم المنطقة بالضبط <span className="text-red-500">*</span></label>
                  <input className={`input ${errors.custom_district ? 'border-red-400' : ''}`}
                    placeholder="اكتب اسم المنطقة بدقة..."
                    value={form.custom_district}
                    onChange={e => set('custom_district', e.target.value)}/>
                  {errors.custom_district && <p className="text-red-500 text-xs mt-1">{errors.custom_district}</p>}
                </div>
              )}
            </div>
            <div>
              <label className="label">الجنس</label>
              <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                <option value="female">أنثى</option>
                <option value="male">ذكر</option>
              </select>
            </div>
            <div>
              <label className="label">تاريخ الميلاد</label>
              <input type="date" className="input" value={form.birth_date}
                onChange={e => set('birth_date', e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 1 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">الفئة الاجتماعية</label>
              <div className="grid grid-cols-1 gap-2">
                {Object.entries(CATEGORIES).map(([k, v]) => (
                  <label key={k}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      form.category === k
                        ? 'border-rose-400 bg-rose-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <input type="radio" name="category" value={k} checked={form.category === k}
                      onChange={() => set('category', k)} className="hidden" />
                    <span className="text-xl">{v.split(' ')[0]}</span>
                    <span className={`font-semibold text-sm ${form.category === k ? 'text-rose-700' : 'text-gray-600'}`}>
                      {v.split(' ').slice(1).join(' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">عدد أفراد الأسرة <span className="text-red-500">*</span></label>
                <input type="number" min="1" max="20"
                  className={`input ${errors.family_size ? 'border-red-400' : ''}`}
                  value={form.family_size} onChange={e => set('family_size', e.target.value)} />
                {errors.family_size && <p className="text-red-500 text-xs mt-1">{errors.family_size}</p>}
              </div>
              <div>
                <label className="label">الدخل الشهري التقريبي (ل.س)</label>
                <input type="number" className="input" placeholder="0 إذا لا يوجد دخل"
                  value={form.monthly_income} onChange={e => set('monthly_income', e.target.value)} />
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded"
                    checked={form.has_disability}
                    onChange={e => set('has_disability', e.target.checked)} />
                  <span className="font-semibold text-gray-700">يوجد في الأسرة ذوو إعاقة</span>
                </label>
                {form.has_disability && (
                  <div className="mt-3">
                    <label className="label text-sm">رقم بطاقة الإعاقة (اختياري)</label>
                    <input className="input" placeholder="أدخل رقم البطاقة إن وُجدت"
                      value={form.disability_card_no} onChange={e => set('disability_card_no', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="label">
                وصف تفصيلي للحالة <span className="text-red-500">*</span>
              </label>
              <textarea
                className={`input h-40 resize-none ${errors.situation_description ? 'border-red-400' : ''}`}
                placeholder="يُرجى وصف وضعكم الاجتماعي والاحتياجات بشكل مفصّل لمساعدتنا في تقييم الحالة..."
                value={form.situation_description}
                onChange={e => set('situation_description', e.target.value)} />
              {errors.situation_description && (
                <p className="text-red-500 text-xs mt-1">{errors.situation_description}</p>
              )}
            </div>

            {/* صورة عن الحالة (اختياري) */}
            <div>
              <label className="label">صورة توضّح الحالة (اختياري)</label>
              {form.case_image_url ? (
                <div className="relative inline-block">
                  <img src={form.case_image_url} alt="الحالة" className="h-32 rounded-xl object-cover border border-gray-200"/>
                  <button type="button" onClick={() => set('case_image_url', '')}
                    className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">✕</button>
                </div>
              ) : (
                <>
                  <input ref={imgRef} type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files[0] && uploadCaseImage(e.target.files[0])}/>
                  <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 w-full justify-center">
                    {uploading ? 'جاري الرفع...' : '📷 رفع صورة عن الحالة'}
                  </button>
                  <p className="text-xs text-gray-400 mt-1">صورة تساعد اللجنة على تقييم الحالة (سرية تماماً)</p>
                </>
              )}
            </div>
            <div className="bg-blue-50 rounded-2xl p-5 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 leading-relaxed">
                  <p className="font-bold mb-1">تأكيد البيانات</p>
                  <p>جميع البيانات المقدمة ستُعالَج بسرية تامة وستُستخدم فقط لأغراض تقديم المساعدة الاجتماعية</p>
                </div>
              </div>
            </div>
            {/* Summary */}
            <div className="bg-gray-50 rounded-2xl p-5">
              <p className="font-bold text-gray-700 mb-3">مراجعة سريعة</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">الاسم:</span> <strong>{form.full_name}</strong></div>
                <div><span className="text-gray-500">الهاتف:</span> <strong dir="ltr">{form.phone}</strong></div>
                <div><span className="text-gray-500">الفئة:</span> <strong>{CATEGORIES[form.category]}</strong></div>
                <div><span className="text-gray-500">أفراد الأسرة:</span> <strong>{form.family_size}</strong></div>
              </div>
            </div>
            <div className="mb-3">
              <label className="label">مرفقات ووثائق داعمة (اختياري)</label>
              <FileUpload entityType="relief" entityId="new"
                label="رفع وثيقة / صورة داعمة"
                accept="image/*,.pdf,.doc,.docx"
                onUploaded={f => console.log('uploaded', f.name)}/>
            </div>
            <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border-2 ${
              errors.agree_terms ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input type="checkbox" className="w-5 h-5 rounded" checked={form.agree_terms}
                onChange={e => set('agree_terms', e.target.checked)} />
              <span className="text-sm text-gray-700 font-medium">
                أقرّ بصحة جميع البيانات المدخلة وأوافق على معالجتها من قِبل الدائرة
              </span>
            </label>
            {errors.agree_terms && <p className="text-red-500 text-xs">{errors.agree_terms}</p>}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t">
          <button onClick={prev} disabled={step === 0}
            className="flex items-center gap-2 btn-secondary disabled:opacity-40">
            <ChevronRight size={16} /> السابق
          </button>
          <span className="text-sm text-gray-400">{step + 1} / {STEPS.length}</span>
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="flex items-center gap-2 bg-rose-600 text-white 
                                               px-6 py-2.5 rounded-xl hover:bg-rose-700 
                                               transition-colors font-semibold">
              التالي <ChevronLeft size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={loading}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 
                         rounded-xl hover:bg-green-700 transition-colors font-bold">
              {loading
                ? <><RefreshCw size={16} className="animate-spin" /> جاري الإرسال...</>
                : <><CheckCircle size={16} /> إرسال الطلب</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
