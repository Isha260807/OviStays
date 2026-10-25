import { create } from 'zustand'
import api from '@/services/api/axios.js'

// Ids of the villas the signed-in guest saved. The list itself lives on the server (User.wishlist);
// this keeps a copy so every heart on the page can fill in without its own request.
export const useWishlist = create((set, get) => ({
  ids: [],
  loaded: false,

  load: async () => {
    try {
      const res = await api.get('/user/wishlist')
      set({ ids: res.data.data.ids, loaded: true })
    } catch {
      // hearts simply stay empty; favourites are not critical
    }
  },

  clear: () => set({ ids: [], loaded: false }),

  // Updates the heart straight away and rolls back if the server says no
  toggle: async (id) => {
    const had = get().ids.includes(id)
    set((s) => ({ ids: had ? s.ids.filter((x) => x !== id) : [id, ...s.ids] }))
    try {
      if (had) await api.delete(`/user/wishlist/${id}`)
      else await api.put(`/user/wishlist/${id}`)
    } catch {
      set((s) => ({ ids: had ? [id, ...s.ids] : s.ids.filter((x) => x !== id) }))
    }
  },
}))
