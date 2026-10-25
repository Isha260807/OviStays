import { create } from "zustand"
import api, { errorMessage } from "@/services/api/axios.js"

// Feature toggles (maintenance mode, registrations, pay-at-hotel rules). Shared by the Toggle
// Management page and the maintenance switch in the navbar so both always show the same state.
export const useToggles = create((set, get) => ({
  toggles: null,
  loading: false,
  saving: null, // name of the toggle being saved

  load: async () => {
    set({ loading: true })
    try {
      const res = await api.get("/admin/settings/toggles")
      set({ toggles: res.data.data })
    } finally {
      set({ loading: false })
    }
  },

  // Applies the change on screen straight away, saves it, and rolls back if the server refuses.
  update: async (patch, field) => {
    const previous = get().toggles
    set({ toggles: { ...previous, ...patch }, saving: field })
    try {
      const res = await api.patch("/admin/settings/toggles", patch)
      set({ toggles: res.data.data })
    } catch (err) {
      set({ toggles: previous })
      throw new Error(errorMessage(err))
    } finally {
      set({ saving: null })
    }
  },
}))
