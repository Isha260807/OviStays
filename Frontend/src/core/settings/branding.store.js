import { create } from "zustand"
import { persist } from "zustand/middleware"
import api from "@/services/api/axios.js"
import { applyBranding } from "@/shared/utils/branding.js"

// Public business info (company name, logos, favicon, support details). It is cached in
// localStorage so the logo shows immediately on the next visit, then refreshed from the server.
export const useBranding = create(
  persist(
    (set) => ({
      settings: null,
      load: async () => {
        try {
          const res = await api.get("/settings/public")
          set({ settings: res.data.data })
          applyBranding(res.data.data)
        } catch {
          // keep whatever is cached; branding is not critical
        }
      },
      // Called after the admin saves Business Setup so the UI updates without a reload
      setSettings: (settings) => {
        set({ settings })
        applyBranding(settings)
      },
    }),
    { name: "ovistays-branding", partialize: (state) => ({ settings: state.settings }) }
  )
)
