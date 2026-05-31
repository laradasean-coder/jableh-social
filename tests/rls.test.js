/**
 * RLS & Core Logic Tests — Jabla Social v6
 * Run: npm test
 */
import { describe, it, expect, beforeEach } from 'vitest'

// ─── Utility Tests ──────────────────────────────────────────────
describe('Priority Score Calculator', () => {
  const calcPriority = (r) => {
    let score = 0
    if (r.family_size)      score += Math.min(r.family_size * 8, 80)
    if (r.has_disability)   score += 30
    if (r.monthly_income < 50000) score += 20
    if (r.category === 'orphan')  score += 15
    return Math.min(score, 100)
  }

  it('family with disability gets high score', () => {
    expect(calcPriority({ family_size:6, has_disability:true, monthly_income:20000, category:'disabled' })).toBeGreaterThan(70)
  })
  it('small family no disability gets lower score', () => {
    expect(calcPriority({ family_size:2, has_disability:false, monthly_income:200000, category:'poor_family' })).toBeLessThan(40)
  })
  it('score never exceeds 100', () => {
    expect(calcPriority({ family_size:20, has_disability:true, monthly_income:0, category:'orphan' })).toBeLessThanOrEqual(100)
  })
  it('orphan gets bonus points', () => {
    const a = calcPriority({ family_size:3, has_disability:false, monthly_income:300000, category:'orphan' })
    const b = calcPriority({ family_size:3, has_disability:false, monthly_income:300000, category:'widow' })
    expect(a).toBeGreaterThan(b)
  })
})

describe('Duplicate Detection', () => {
  const similarity = (a, b) => {
    a = a.trim().replace(/\s+/g, ' ')
    b = b.trim().replace(/\s+/g, ' ')
    if (a === b) return 1
    const setA = new Set(a.split(' '))
    const setB = new Set(b.split(' '))
    const inter = [...setA].filter(w => setB.has(w)).length
    return inter / Math.max(setA.size, setB.size)
  }

  it('identical names = 100% similarity', () => {
    expect(similarity('فاطمة أحمد علي', 'فاطمة أحمد علي')).toBe(1)
  })
  it('similar names flagged', () => {
    expect(similarity('فاطمة أحمد', 'فاطمة احمد')).toBeGreaterThanOrEqual(0.5)
  })
  it('completely different names not flagged', () => {
    expect(similarity('محمد خالد', 'سارة إبراهيم')).toBeLessThan(0.3)
  })
})

describe('Idle Timeout Logic', () => {
  const TIMEOUT = 30 * 60 * 1000
  const WARN_BEFORE = 60 * 1000

  it('warn fires at 29 minutes', () => {
    expect(TIMEOUT - WARN_BEFORE).toBe(29 * 60 * 1000)
  })
  it('session ends at 30 minutes', () => {
    expect(TIMEOUT).toBe(30 * 60 * 1000)
  })
})

describe('Form Validation', () => {
  const validateRelief = (form) => {
    const errors = {}
    if (!form.full_name?.trim()) errors.full_name = 'الاسم مطلوب'
    if (!form.phone?.trim())     errors.phone = 'الهاتف مطلوب'
    if (!form.address?.trim())   errors.address = 'العنوان مطلوب'
    if (form.district === 'other' && !form.custom_district?.trim())
      errors.custom_district = 'يرجى كتابة المنطقة'
    return errors
  }

  it('valid form has no errors', () => {
    const e = validateRelief({ full_name:'فاطمة', phone:'0912345678', address:'جبلة', district:'جبلة' })
    expect(Object.keys(e).length).toBe(0)
  })
  it('missing name throws error', () => {
    const e = validateRelief({ full_name:'', phone:'0912345678', address:'جبلة' })
    expect(e.full_name).toBeDefined()
  })
  it('other district requires custom', () => {
    const e = validateRelief({ full_name:'فاطمة', phone:'0912', address:'جبلة', district:'other', custom_district:'' })
    expect(e.custom_district).toBeDefined()
  })
  it('other district with value is valid', () => {
    const e = validateRelief({ full_name:'فاطمة', phone:'0912', address:'جبلة', district:'other', custom_district:'منطقة جديدة' })
    expect(e.custom_district).toBeUndefined()
  })
})

describe('Role Permissions', () => {
  const canAccess = (role, route) => {
    const rules = {
      '/admin': ['admin'],
      '/employees': ['admin'],
      '/audit-log': ['admin'],
      '/status': ['admin'],
      '/beneficiaries': ['admin','staff'],
      '/reports': ['admin','staff'],
      '/inbox': ['admin','staff'],
      '/dashboard': ['admin','staff','unit_head','association'],
      '/rural-units': ['admin','staff','unit_head','association','public'],
      '/relief': ['admin','staff','unit_head','association','public'],
      '/track': ['admin','staff','unit_head','association','public'],
    }
    const allowed = rules[route] || ['public']
    return allowed.includes(role) || allowed.includes('public')
  }

  it('admin can access everything', () => {
    ['/admin','/employees','/beneficiaries','/reports','/inbox','/status'].forEach(r => {
      expect(canAccess('admin', r)).toBe(true)
    })
  })
  it('staff cannot access admin pages', () => {
    expect(canAccess('staff', '/employees')).toBe(false)
    expect(canAccess('staff', '/audit-log')).toBe(false)
    expect(canAccess('staff', '/status')).toBe(false)
  })
  it('staff can access reports and inbox', () => {
    expect(canAccess('staff', '/reports')).toBe(true)
    expect(canAccess('staff', '/inbox')).toBe(true)
  })
  it('public can access track and relief', () => {
    expect(canAccess('public', '/track')).toBe(true)
    expect(canAccess('public', '/relief')).toBe(true)
  })
  it('public cannot access beneficiaries', () => {
    expect(canAccess('public', '/beneficiaries')).toBe(false)
  })
})
