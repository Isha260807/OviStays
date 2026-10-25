import PageContent, { LEGAL_PAGES, PAGE_KEYS, SOCIAL_PLATFORMS } from '../../models/PageContent.model.js'
import Settings from '../../models/Settings.model.js'
import { plainTextToLegalHtml } from '../../utils/legalFormat.js'
import { badRequest, notFound } from '../../utils/httpError.js'

// What the about-page editor offers. Class names are looked up here, never taken from the client,
// so the stored styling can only ever be one of these.
export const ABOUT_ICONS = ['Heart', 'Users', 'Shield', 'Clock', 'Star', 'Award', 'Building2', 'BedDouble', 'MapPin']
export const ABOUT_COLORS = {
  'text-pink-600': 'bg-pink-100',
  'text-blue-600': 'bg-blue-100',
  'text-green-600': 'bg-green-100',
  'text-orange-600': 'bg-orange-100',
  'text-purple-600': 'bg-purple-100',
  'text-red-600': 'bg-red-100',
}
const MAX_FEATURES = 12

export function assertKey(key) {
  const k = String(key || '').trim().toLowerCase()
  if (!PAGE_KEYS.includes(k)) throw notFound('Page not found')
  return k
}

// ---- read -------------------------------------------------------------------------------------

export async function getPage(key, { forAdmin = false } = {}) {
  const k = assertKey(key)
  const doc = await PageContent.findOne({ key: k }).lean()

  if (LEGAL_PAGES[k]) {
    const content = doc?.content || ''
    return {
      key: k,
      title: doc?.title || LEGAL_PAGES[k],
      content: forAdmin ? content : undefined, // the source text is only needed by the editor
      html: plainTextToLegalHtml(content),
      updatedAt: doc?.updatedAt || null,
    }
  }

  if (k === 'about') {
    const company = (await Settings.get()).companyName
    const a = doc?.about || {}
    return {
      key: k,
      appName: a.appName || company,
      version: a.version || '1.0.0',
      description: a.description || '',
      logo: a.logo || '',
      features: [...(a.features || [])].sort((x, y) => x.order - y.order),
      updatedAt: doc?.updatedAt || null,
    }
  }

  // social: every platform is listed so the editor can show an empty box for each
  const saved = Object.fromEntries((doc?.social?.links || []).map((l) => [l.platform, l.url]))
  const links = SOCIAL_PLATFORMS.map((platform) => ({ platform, url: saved[platform] || '' }))
  return { key: k, links: forAdmin ? links : links.filter((l) => l.url), updatedAt: doc?.updatedAt || null }
}

// ---- write ------------------------------------------------------------------------------------

function buildUpdate(k, body) {
  if (LEGAL_PAGES[k]) {
    const title = String(body.title ?? '').trim()
    const content = String(body.content ?? '').replace(/\r\n/g, '\n')
    if (title.length > 150) throw badRequest('Title is too long (max 150 characters)')
    if (content.length > 100000) throw badRequest('Content is too long')
    return { title, content }
  }

  if (k === 'about') {
    const features = Array.isArray(body.features) ? body.features : []
    if (features.length > MAX_FEATURES) throw badRequest(`At most ${MAX_FEATURES} features are allowed`)
    const blank = features.findIndex((f) => !String(f?.title ?? '').trim())
    if (blank !== -1) throw badRequest(`Feature ${blank + 1} needs a title`)
    return {
      about: {
        appName: String(body.appName ?? '').trim(),
        version: String(body.version ?? '').trim(),
        description: String(body.description ?? '').trim(),
        logo: String(body.logo ?? '').trim(),
        features: features.map((f, order) => {
          const color = Object.hasOwn(ABOUT_COLORS, f?.color) ? f.color : 'text-pink-600'
          return {
            icon: ABOUT_ICONS.includes(f?.icon) ? f.icon : 'Heart',
            title: String(f?.title ?? '').trim(),
            description: String(f?.description ?? '').trim(),
            color,
            bgColor: ABOUT_COLORS[color],
            order,
          }
        }),
      },
    }
  }

  // social
  const links = []
  for (const l of Array.isArray(body.links) ? body.links : []) {
    const url = String(l?.url ?? '').trim()
    if (!url) continue // blank = not shown
    if (!SOCIAL_PLATFORMS.includes(l?.platform)) throw badRequest(`Unknown platform: ${l?.platform}`)
    if (!/^https:\/\/\S+$/.test(url)) throw badRequest(`${l.platform}: the link must start with https://`)
    links.push({ platform: l.platform, url })
  }
  return { social: { links } }
}

export async function savePage(key, body, adminId) {
  const k = assertKey(key)
  const update = buildUpdate(k, body || {})
  const doc = await PageContent.findOne({ key: k }).then((d) => d || new PageContent({ key: k }))
  doc.set({ ...update, updatedBy: adminId || null })
  await doc.save()
  return getPage(k, { forAdmin: true })
}
