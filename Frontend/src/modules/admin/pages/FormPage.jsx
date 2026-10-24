import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import PageHeader from "../components/ui/PageHeader.jsx"
import { FormGrid, cleanValues, buttonPrimary } from "../components/ui/FormFields.jsx"
import { errorMessage } from "@/services/api/axios.js"

// config: { title, subtitle, sections, submitLabel, load?: () => Promise<values>,
//           save: (values) => Promise, successMessage, redirectTo?, resetOnSave? }
export default function FormPage({ config }) {
  const navigate = useNavigate()
  const [values, setValues] = useState({})
  const [loading, setLoading] = useState(Boolean(config.load))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!config.load) return
    let cancelled = false
    config.load()
      .then((data) => { if (!cancelled) setValues(data || {}) })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [config])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      // Edit forms keep blanks so a field can be cleared; create forms drop them
      await config.save(config.keepEmpty ? values : cleanValues(values))
      toast.success(config.successMessage || `${config.title} saved`)
      if (config.redirectTo) navigate(config.redirectTo)
      else if (config.resetOnSave) setValues((v) => ({ ...v, ...config.resetOnSave }))
    } catch (err) {
      setError(errorMessage(err))
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 p-6 text-neutral-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader title={config.title} subtitle={config.subtitle} />
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {config.sections.map((s) => (
          <div key={s.title} className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 text-base font-semibold text-neutral-900">{s.title}</h2>
            <FormGrid fields={s.fields} values={values} onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))} />
          </div>
        ))}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className={buttonPrimary}>
            {saving ? "Saving..." : config.submitLabel || "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  )
}
