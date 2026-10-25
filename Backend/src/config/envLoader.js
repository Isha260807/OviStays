import EnvSetting from '../models/EnvSetting.model.js'
import { decrypt, isEncryptionConfigured } from '../utils/encryption.js'
import { refreshEnv } from './env.js'

// Applies the overrides saved from the admin panel on top of .env. Run once after the DB connects.
export async function loadEnvFromDb() {
  if (!isEncryptionConfigured()) return
  try {
    const settings = await EnvSetting.find({})
    let applied = 0
    for (const s of settings) {
      try {
        process.env[s.key] = decrypt(s.value)
        applied++
      } catch {
        console.error(`Could not decrypt env override ${s.key}; keeping the .env value`)
      }
    }
    if (applied) {
      refreshEnv()
      console.log(`Loaded ${applied} environment overrides from the database`)
    }
  } catch (err) {
    console.error('Could not load env overrides:', err.message)
  }
}
