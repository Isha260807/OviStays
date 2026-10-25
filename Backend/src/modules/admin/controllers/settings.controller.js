import Settings from '../../../models/Settings.model.js'

const FIELDS = ['companyName', 'email', 'phone', 'address', 'currency', 'commissionRate', 'platformFee', 'gstRate', 'cancelHours', 'authAssets']

export async function getSettings(req, res) {
  const s = await Settings.get()
  res.json({ success: true, data: s })
}

export async function updateSettings(req, res) {
  const s = await Settings.get()
  for (const key of FIELDS) {
    if (req.body[key] !== undefined) s[key] = req.body[key]
  }
  await s.save()
  res.json({ success: true, data: s })
}
