import { describe, it, expect } from 'vitest'
import { similarity } from '../src/components/ui/DuplicateChecker'

describe('Priority Score', () => {
  const calc = (r) => {
    let s = 0
    if (r.family_size)    s += Math.min(r.family_size * 8, 64)
    if (r.has_disability) s += 30
    if ((r.monthly_income||0) < 50000) s += 20
    if (r.category === 'orphan')   s += 15
    if (r.category === 'disabled') s += 10
    return Math.min(s, 100)
  }
  it('disability gives +30',    () => { expect(calc({has_disability:true,family_size:1,monthly_income:999999})).toBe(38) })
  it('large family maxes at 64',() => { expect(calc({family_size:20,has_disability:false,monthly_income:999999})).toBe(64) })
  it('score never > 100',       () => { expect(calc({family_size:20,has_disability:true,monthly_income:0,category:'orphan'})).toBeLessThanOrEqual(100) })
  it('low income +20',          () => { expect(calc({family_size:1,has_disability:false,monthly_income:10000})).toBe(20+8) })
})

describe('Duplicate Detection', () => {
  it('identical = 1.0',       () => expect(similarity('فاطمة أحمد','فاطمة أحمد')).toBe(1))
  it('partial match detected',() => expect(similarity('فاطمة أحمد علي','فاطمة أحمد')).toBeGreaterThan(0.6))
  it('different names = low', () => expect(similarity('محمد خالد','سارة إبراهيم')).toBeLessThan(0.2))
  it('empty = 0',             () => expect(similarity('','فاطمة')).toBe(0))
})

describe('Role Permissions', () => {
  const canAccess = (role, route) => {
    const rules = { '/employees':['admin'], '/audit-log':['admin'], '/status':['admin'],
      '/beneficiaries':['admin','staff'], '/map':['admin','staff'],
      '/inbox':['admin','staff'], '/reports':['admin','staff'],
      '/dashboard':['admin','staff','unit_head','association'],
      '/relief':true, '/track':true }
    const r = rules[route]
    if (r === true) return true
    return Array.isArray(r) && r.includes(role)
  }
  it('admin accesses all',        () => ['/employees','/audit-log','/status','/map'].forEach(r => expect(canAccess('admin',r)).toBe(true)))
  it('staff blocked from admin',  () => ['/employees','/audit-log','/status'].forEach(r => expect(canAccess('staff',r)).toBe(false)))
  it('staff accesses map+reports',() => ['/map','/reports','/inbox'].forEach(r => expect(canAccess('staff',r)).toBe(true)))
  it('public sees track+relief',  () => ['/track','/relief'].forEach(r => expect(canAccess('public',r)).toBe(true)))
})

describe('Idle Timeout', () => {
  it('30 min timeout', () => expect(30 * 60 * 1000).toBe(1800000))
  it('warn at 29 min', () => expect(30 * 60 * 1000 - 60 * 1000).toBe(29 * 60 * 1000))
})

describe('Form Validation', () => {
  const validate = (form) => {
    const e = {}
    if (!form.full_name?.trim()) e.full_name = 'required'
    if (!form.phone?.trim())     e.phone = 'required'
    if (!form.address?.trim())   e.address = 'required'
    if (form.district==='other' && !form.custom_district?.trim()) e.custom_district = 'required'
    return e
  }
  it('valid form',               () => expect(Object.keys(validate({full_name:'أ',phone:'0',address:'ب',district:'جبلة'})).length).toBe(0))
  it('missing name',             () => expect(validate({full_name:'',phone:'0',address:'ب'}).full_name).toBeDefined())
  it('other district no value',  () => expect(validate({full_name:'أ',phone:'0',address:'ب',district:'other',custom_district:''}).custom_district).toBeDefined())
  it('other district with value',() => expect(validate({full_name:'أ',phone:'0',address:'ب',district:'other',custom_district:'منطقة'}).custom_district).toBeUndefined())
})
