import crypto from 'crypto'

// AES-256-GCM (encrypted + tamper-evident). The key comes from ENCRYPTION_KEY in .env.
// It is deliberately separate from the JWT secrets: those can be changed from the admin panel,
// and doing so must not make stored values unreadable.
const getKey = () => {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) throw new Error('ENCRYPTION_KEY is not set in the server .env file')
  return crypto.createHash('sha256').update(String(secret)).digest()
}

export const isEncryptionConfigured = () => Boolean(process.env.ENCRYPTION_KEY)

export function encrypt(text) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv)
  const data = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()])
  return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), data.toString('hex')].join(':')
}

export function decrypt(payload) {
  const [iv, tag, data] = String(payload).split(':')
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString('utf8')
}
