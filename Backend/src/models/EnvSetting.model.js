import mongoose from 'mongoose'

// One environment variable override. `value` is always stored encrypted.
const envSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, required: true },
  },
  { timestamps: true }
)

export default mongoose.models.EnvSetting || mongoose.model('EnvSetting', envSettingSchema)
