import mongoose from 'mongoose'

// Date-specific pricing for one villa (festival, season, long weekend). Both dates are inclusive.
// nightPricePaise replaces the nightly rate; adjustPct raises or lowers every price on those dates.
const priceRuleSchema = new mongoose.Schema(
  {
    villa: { type: mongoose.Schema.Types.ObjectId, ref: 'Hotel', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Owner', required: true },
    label: { type: String, trim: true, default: '', maxlength: 60 },
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    endDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    nightPricePaise: { type: Number, default: null, min: 0, validate: { validator: (v) => v === null || Number.isInteger(v), message: 'Price must be whole paise' } },
    adjustPct: { type: Number, default: null, min: -90, max: 500 },
  },
  { timestamps: true }
)

priceRuleSchema.index({ villa: 1, startDate: 1, endDate: 1 })

export default mongoose.models.PriceRule || mongoose.model('PriceRule', priceRuleSchema)
