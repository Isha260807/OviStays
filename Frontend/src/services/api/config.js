const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api"

// Server origin (no /api), used to build links to uploaded files. Empty when the API is on the same origin.
export const API_ORIGIN = /^https?:\/\//i.test(API_BASE_URL) ? new URL(API_BASE_URL).origin : ""

// Stored values are relative (/uploads/x.webp) or absolute (Cloudinary). Returns something an <img> can load.
export function assetUrl(value) {
  if (!value) return ""
  if (/^https?:\/\//i.test(value)) return value
  return `${API_ORIGIN}${value.startsWith("/") ? "" : "/"}${value}`
}
