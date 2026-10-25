import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Save, AlertCircle, RefreshCw, Loader2 } from "lucide-react"
import { adminAPI } from "../../services/adminAPI.js"
import { errorMessage } from "@/services/api/axios.js"

export default function EnvManagements() {
  const [groups, setGroups] = useState([])
  const [encryptionConfigured, setEncryptionConfigured] = useState(true)
  // key -> { value, reset } for fields the admin changed; untouched fields are never sent
  const [edits, setEdits] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const data = await adminAPI.getEnvSettings()
      setGroups(data.groups)
      setEncryptionConfigured(data.encryptionConfigured)
      setEdits({})
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSettings() }, [])

  const handleChange = (key, value) => setEdits((prev) => ({ ...prev, [key]: { value, reset: false } }))
  const handleReset = (key) => setEdits((prev) => ({ ...prev, [key]: { value: "", reset: true } }))

  const handleSave = async (e) => {
    e.preventDefault()
    const payload = Object.fromEntries(Object.entries(edits).map(([key, edit]) => [key, edit.reset ? "" : edit.value]))
    if (!Object.keys(payload).length) {
      toast.info("Nothing to save")
      return
    }
    try {
      setSaving(true)
      await adminAPI.saveEnvSettings(payload)
      toast.success("Environment variables saved. Server config updated.")
      fetchSettings()
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Environment Managements</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage environment variables safely. Values set here override the <code>.env</code> file and are encrypted in the database.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !encryptionConfigured}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium transition-all shadow-lg shadow-primary/25"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {!encryptionConfigured && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <code>ENCRYPTION_KEY</code> is not set in the server <code>.env</code>, so overrides cannot be saved. Add a long random value and restart the server.
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">How it works:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Variables changed here are saved encrypted in the database and always take priority over the <code className="bg-blue-100 px-1 rounded">.env</code> file.</li>
            <li>Secret values are never shown. A "Set" badge tells you one exists; type a new value to replace it.</li>
            <li>Click the reset icon on an overridden field and save to go back to the <code className="bg-blue-100 px-1 rounded">.env</code> value.</li>
            <li>Fields marked "Restart needed" only take effect after the server restarts. Changing the JWT secrets signs everyone out.</li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {groups.map((group) => (
          <div key={group.name} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50/80 px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">{group.name}</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {group.keys.map((field) => {
                const edit = edits[field.key]
                const overridden = edit ? !edit.reset : field.isOverridden
                const value = edit ? edit.value : field.value
                const canReset = field.isOverridden && !edit?.reset
                return (
                  <div key={field.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label htmlFor={field.key} className="text-sm font-medium text-gray-700 truncate">{field.key}</label>
                      <div className="flex items-center gap-1 shrink-0">
                        {field.restart && <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Restart needed</span>}
                        {field.secret && field.isSet && !edit && <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Set</span>}
                        {overridden && <span className="text-[10px] font-semibold tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">DB Override</span>}
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        id={field.key}
                        type={field.secret ? "password" : "text"}
                        autoComplete="off"
                        value={value}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={field.secret && field.isSet ? "Hidden. Type to replace" : "Fallback to .env"}
                        className={`w-full px-3 py-2 pr-9 border rounded-lg outline-none transition-all text-sm focus:border-primary focus:ring-1 focus:ring-primary ${
                          overridden ? "bg-orange-50/50 border-orange-200" : "bg-gray-50 border-gray-200"
                        }`}
                      />
                      {canReset && (
                        <button
                          type="button"
                          onClick={() => handleReset(field.key)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                          title="Clear the database override and use .env"
                          aria-label={`Reset ${field.key}`}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        <div className="h-10" />
      </form>
    </div>
  )
}
