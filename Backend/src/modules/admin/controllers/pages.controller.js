import { getPage, savePage } from '../../../core/pages/pages.service.js'

// GET /api/admin/pages/:key
export async function getAdminPage(req, res) {
  res.json({ success: true, data: await getPage(req.params.key, { forAdmin: true }) })
}

// PUT /api/admin/pages/:key
export async function updateAdminPage(req, res) {
  const data = await savePage(req.params.key, req.body, req.auth.id)
  res.json({ success: true, message: 'Page updated successfully', data })
}
