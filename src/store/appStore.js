import { create } from 'zustand'
import { getDashboardStats } from '../api/dashboard'
import { getBeneficiaryStats } from '../api/beneficiaries'

export const useAppStore = create((set, get) => ({
  // Dashboard stats
  dashStats: null,
  dashLoading: false,
  dashLastSync: null,

  fetchDashStats: async () => {
    if (get().dashLoading) return
    set({ dashLoading: true })
    try {
      const stats = await getDashboardStats()
      set({ dashStats: stats, dashLastSync: new Date(), dashLoading: false })
    } catch { set({ dashLoading: false }) }
  },

  // Beneficiary filters (shared across components)
  benFilters: { category: '', status: '', district: '', search: '' },
  benPage: 0,
  setBenFilters: (filters) => set({ benFilters: filters, benPage: 0 }),
  setBenPage: (page) => set({ benPage: page }),

  // Notifications unread count
  unreadCount: 0,
  setUnreadCount: (n) => set(s => ({ unreadCount: typeof n === "function" ? n(s.unreadCount) : n })),
  decrementUnread: () => set(s => ({ unreadCount: Math.max(0, s.unreadCount - 1) })),
  clearUnread: () => set({ unreadCount: 0 }),
}))
