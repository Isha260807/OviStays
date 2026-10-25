import api from "./axios.js"

export const MAX_IMAGE_MB = 5
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export const MAX_PDF_MB = 10

// PDF documents (e.g. the terms & conditions). Resolves to { url, provider }.
export async function uploadPdf(file) {
  const body = new FormData()
  body.append("file", file)
  const res = await api.post("/uploads/file", body)
  return res.data.data
}

// type: hotel | room | banner | profile | logo | favicon | misc. Resolves to { url, provider }; `url` is what to store.
export async function uploadImage(file, type = "misc", onProgress) {
  const body = new FormData()
  body.append("type", type) // fields must come before the file so the server can read them
  body.append("file", file)
  const res = await api.post("/uploads/image", body, {
    onUploadProgress: (e) => e.total && onProgress?.(Math.round((e.loaded / e.total) * 100)),
  })
  return res.data.data
}

export const MAX_VIDEO_MB = 50
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"]

// Short clips (e.g. Home page reels). Resolves to { url, provider }.
export async function uploadVideo(file) {
  const body = new FormData()
  body.append("file", file)
  const res = await api.post("/uploads/video", body)
  return res.data.data
}
