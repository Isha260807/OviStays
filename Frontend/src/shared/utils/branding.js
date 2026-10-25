import { assetUrl } from "@/services/api/config.js"

const DEFAULT_TITLE = "OviStays"

// Replaces the tab icon. With no URL the icon from index.html stays as it is.
export function updateFavicon(url) {
  if (typeof document === "undefined" || !url) return
  document.querySelectorAll("link[rel*='icon']").forEach((el) => el.remove())
  const link = document.createElement("link")
  link.rel = "icon"
  link.type = "image/webp"
  link.href = url
  document.head.appendChild(link)
}

export function updateTitle(companyName) {
  if (typeof document !== "undefined") document.title = companyName || DEFAULT_TITLE
}

export function applyBranding(settings) {
  if (!settings) return
  updateTitle(settings.companyName)
  updateFavicon(assetUrl(settings.favicon?.url))
}
