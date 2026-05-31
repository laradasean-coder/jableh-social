import { Component } from 'react'
import { supabase } from '../../lib/supabase'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Log to Supabase audit_logs
    supabase.from('audit_logs').insert({
      action: 'create',
      entity: 'خطأ تقني',
      detail: `${error?.message || 'خطأ غير معروف'} | ${info?.componentStack?.slice(0, 200) || ''}`
    }).catch(() => {})
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6" dir="rtl">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">حدث خطأ غير متوقع</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            نعتذر عن هذا الخطأ. تم تسجيله تلقائياً. يمكنك المحاولة مجدداً أو العودة للرئيسية.
          </p>
          {this.state.error?.message && (
            <div className="bg-gray-50 rounded-xl p-3 mb-5 text-xs text-gray-400 text-left font-mono">
              {this.state.error.message.slice(0, 120)}
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="btn-primary text-sm px-5 py-2.5">
              إعادة المحاولة
            </button>
            <button
              onClick={() => { window.location.href = '/' }}
              className="btn-secondary text-sm px-5 py-2.5">
              الرئيسية
            </button>
          </div>
        </div>
      </div>
    )
  }
}
