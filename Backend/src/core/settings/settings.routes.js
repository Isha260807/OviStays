import { Router } from 'express'
import Settings from '../../models/Settings.model.js'

const router = Router()

// Public business info for the guest and hotel apps and the login pages. Pricing rules
// (commission, platform fee) are deliberately left out.
// GET /api/settings/public
router.get('/public', async (req, res) => {
  const s = await Settings.get()
  res.json({
    success: true,
    data: {
      companyName: s.companyName,
      email: s.email,
      phoneCountryCode: s.phoneCountryCode,
      phoneNumber: s.phoneNumber,
      address: s.address,
      state: s.state,
      pincode: s.pincode,
      region: s.region,
      gstin: s.gstin,
      supportEmail: s.supportEmail,
      supportPhone: s.supportPhone,
      supportHours: s.supportHours,
      logo: { url: s.logo?.url || '' },
      userLogo: { url: s.userLogo?.url || '' },
      hotelLogo: { url: s.hotelLogo?.url || '' },
      favicon: { url: s.favicon?.url || '' },
      termsAndConditionsPdf: { url: s.termsAndConditionsPdf?.url || '' },
      currency: s.currency,
      gstRate: s.gstRate,
      cancelHours: s.cancelHours,
      // Feature toggles, so the apps can show a maintenance screen or hide sign-up
      onlinePaymentOnly: s.onlinePaymentOnly,
      maxPayAtHotelAmount: s.maxPayAtHotelAmount,
      maintenanceMode: s.maintenanceMode,
      userRegistration: s.userRegistration,
      hotelRegistration: s.hotelRegistration,
    },
  })
})

export default router
