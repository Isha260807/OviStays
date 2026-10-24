import { useEffect, useState } from "react"
import { adminAPI } from "../../services/adminAPI.js"

const inputCls =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"

// Options can be plain strings or { value, label }
const normalize = (o) => (typeof o === "string" ? { value: o, label: o } : o)

// field: { name, label, type: text|number|email|date|password|textarea|select, options, optionsFrom, required, placeholder, full }
export function Field({ field, value, onChange, options }) {
  const common = {
    id: field.name,
    name: field.name,
    required: field.required,
    placeholder: field.placeholder,
    value: value ?? "",
    onChange: (e) => onChange(field.name, e.target.value),
    className: inputCls,
  }
  return (
    <div className={field.full ? "sm:col-span-2" : ""}>
      <label htmlFor={field.name} className="mb-1 block text-sm font-medium text-neutral-700">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea rows={3} {...common} />
      ) : field.type === "select" ? (
        <select {...common}>
          <option value="">Select...</option>
          {(options || []).map(normalize).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input type={field.type || "text"} min={field.type === "number" ? 0 : undefined} {...common} />
      )}
    </div>
  )
}

export function FormGrid({ fields, values, onChange }) {
  // Selects with `optionsFrom` load their choices from the API (e.g. the hotel list)
  const [remote, setRemote] = useState({})
  useEffect(() => {
    let cancelled = false
    fields.filter((f) => f.optionsFrom).forEach((f) => {
      adminAPI.options(f.optionsFrom)
        .then((list) => { if (!cancelled) setRemote((r) => ({ ...r, [f.name]: list })) })
        .catch(() => {})
    })
    return () => { cancelled = true }
  }, [fields])

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <Field key={f.name} field={f} value={values[f.name]} onChange={onChange} options={f.optionsFrom ? remote[f.name] : f.options} />
      ))}
    </div>
  )
}

// Blank inputs are not sent, so optional numbers/dates do not fail validation on the server
export const cleanValues = (values) =>
  Object.fromEntries(Object.entries(values).filter(([, v]) => v !== "" && v != null))

export const buttonPrimary =
  "inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition-colors disabled:opacity-60"
export const buttonOutline =
  "inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors disabled:opacity-60"
