import { useEffect, useState } from "react"
import { toast } from "sonner"
import { adminAPI } from "../../services/adminAPI.js"
import { errorMessage } from "@/services/api/axios.js"
import { plainTextToLegalHtml } from "@/shared/utils/legalFormat.js"

// One editor for every legal page (terms, privacy, refund, cancellation).
//   pageKey  server key when there is a single version of the page
//   roles    [{ id, label, key }] when the page has one version per audience (shows the tabs)
export default function LegalPage({ title, description, pageKey, roles }) {
  const [activeRole, setActiveRole] = useState(roles?.[0]?.id)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState("edit") // "edit" | "preview"
  const [data, setData] = useState({ title: "", content: "" })
  const [saved, setSaved] = useState({ title: "", content: "" })

  const role = roles?.find((r) => r.id === activeRole)
  const key = role ? role.key : pageKey
  const dirty = data.title !== saved.title || data.content !== saved.content

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminAPI.getPage(key)
      .then((page) => {
        if (cancelled) return
        const next = { title: page.title, content: page.content || "" }
        setData(next)
        setSaved(next)
      })
      .catch((err) => !cancelled && toast.error(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [key])

  const switchRole = (id) => {
    if (id === activeRole) return
    if (dirty && !window.confirm("You have unsaved changes. Switch anyway?")) return
    setActiveRole(id)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      const page = await adminAPI.savePage(key, { title: data.title, content: data.content })
      const next = { title: page.title, content: page.content || "" }
      setData(next)
      setSaved(next)
      toast.success(`${role ? role.label + " " : ""}${title} updated successfully`)
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const modeButtons = (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
      {[["edit", "Editor"], ["preview", "Preview"]].map(([mode, label]) => (
        <button
          key={mode}
          type="button"
          onClick={() => setViewMode(mode)}
          className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
            viewMode === mode ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )

  const editor = viewMode === "edit" ? (
    <textarea
      value={data.content}
      onChange={(e) => setData((prev) => ({ ...prev, content: e.target.value }))}
      placeholder={`Enter ${title.toLowerCase()} content here...`}
      aria-label="Page content"
      dir="ltr"
      className="min-h-[500px] w-full rounded-lg border border-slate-200 bg-slate-50/30 p-3 text-sm text-slate-700 leading-relaxed resize-y focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
    />
  ) : (
    <div className="min-h-[500px] w-full rounded-xl border border-slate-100 bg-slate-50/30 p-8">
      <div className="legal-preview" dangerouslySetInnerHTML={{ __html: plainTextToLegalHtml(data.content) }} />
    </div>
  )

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-600 mt-1">{description}</p>
          </div>
          {roles && (
            <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
              {roles.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => switchRole(r.id)}
                  className={`px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    activeRole === r.id ? "bg-orange-500 text-white shadow-md shadow-orange-500/20" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/50 p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 shrink-0 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-700 truncate">
                {role ? `Editing ${role.label} Portal ${title}` : `Editing ${title}`}
                {dirty && <span className="ml-2 text-xs font-semibold text-amber-600">Unsaved changes</span>}
              </span>
            </div>
            {modeButtons}
          </div>

          <div className="p-6">
            {loading ? (
              <div className="min-h-[500px] flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                <p className="text-sm text-slate-500 font-medium italic">Synchronizing content...</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label htmlFor="page-title" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Page Title</label>
                  <input
                    id="page-title"
                    type="text"
                    value={data.title}
                    maxLength={150}
                    onChange={(e) => setData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-700 font-medium"
                  />
                </div>
                <p className="mb-3 text-sm text-slate-600">
                  Use headings like <span className="font-mono">#</span>, <span className="font-mono">##</span>, bullets with <span className="font-mono">-</span> and bold like <span className="font-mono">**text**</span>.
                </p>
                {editor}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">Tip:</span> Your changes are only published once you hit save.
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || loading || !dirty}
            className="px-8 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all duration-200 font-bold shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}
