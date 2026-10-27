import mongoose from 'mongoose'
import { codePlugin } from '../utils/codePlugin.js'

// A location is a state where OviStays operates. The admin adds the states; a villa owner picks one of them
// and writes the villa's own city inside it. Villas can only be listed, shown and booked in an Active state.
const locationSchema = new mongoose.Schema(
  {
    state: { type: String, required: true, trim: true, unique: true },
    image: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  },
  { timestamps: true }
)

locationSchema.plugin(codePlugin, { prefix: 'LC' })

export default mongoose.models.Location || mongoose.model('Location', locationSchema)
