import { Router } from 'express'
import { getPage } from './pages.service.js'

const router = Router()

// Public pages for the guest and hotel apps.
// GET /api/pages/:key  (terms, terms_hotel, privacy, privacy_hotel, refund, cancellation, about, social)
router.get('/:key', async (req, res) => {
  res.json({ success: true, data: await getPage(req.params.key) })
})

export default router
