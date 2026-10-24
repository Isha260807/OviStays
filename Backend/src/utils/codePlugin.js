import mongoose from 'mongoose'

const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
})
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema)

export async function nextCode(prefix) {
  const counter = await Counter.findByIdAndUpdate(
    prefix,
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  )
  return `${prefix}-${String(counter.seq).padStart(4, '0')}`
}

// Adds a human readable id (BK-0001, HT-0001, ...) as `refId`, generated on first save.
export function codePlugin(schema, { prefix }) {
  schema.add({ refId: { type: String, unique: true, index: true } })
  schema.pre('validate', async function () {
    if (this.isNew && !this.refId) this.refId = await nextCode(prefix)
  })
}
