import mongoose from 'mongoose'
import HomePage, { HOME_SECTION_KEYS, DEFAULT_SECTIONS } from '../../../models/HomePage.model.js'
import { badRequest } from '../../../utils/httpError.js'

const text = (v, max) => String(v ?? '').trim().slice(0, max)
const id = (v) => (mongoose.isValidObjectId(v) ? String(v) : null)
const ids = (list) => [...new Set((Array.isArray(list) ? list : []).map(id).filter(Boolean))]
const arr = (v, max) => (Array.isArray(v) ? v.slice(0, max) : [])

// Keeps only the fields each section type understands, so nothing unexpected is stored.
function cleanSection(raw) {
  const out = {
    key: raw.key,
    enabled: raw.enabled !== false,
    title: text(raw.title, 80),
    subtitle: text(raw.subtitle, 120),
  }
  switch (raw.key) {
    case 'popular':
    case 'bestDeals':
    case 'poolVillas':
    case 'hills':
    case 'beachside':
      out.hotels = ids(raw.hotels)
      break
    case 'offerOfDay':
      out.hotel = id(raw.hotel)
      break
    case 'promo':
      out.promos = arr(raw.promos, 8)
        .map((p) => ({ banner: id(p?.banner), coupon: id(p?.coupon) }))
        .filter((p) => p.banner && p.coupon)
      break
    case 'weekend':
      out.tiles = arr(raw.tiles, 12)
        .map((t) => ({ city: text(t?.city, 60), image: text(t?.image, 500), tagline: text(t?.tagline, 80) }))
        .filter((t) => t.city)
      break
    case 'reels':
      out.reels = arr(raw.reels, 20)
        .map((r) => ({
          title: text(r?.title, 40),
          video: text(r?.video, 500),
          poster: text(r?.poster, 500),
          hotel: id(r?.hotel),
          duration: Math.min(30, Math.max(2, Number(r?.duration) || 6)),
        }))
        .filter((r) => r.title && (r.video || r.poster))
      break
    case 'categories':
      out.categories = arr(raw.categories, 12)
        .map((c) => ({ label: text(c?.label, 30), image: text(c?.image, 500) }))
        .filter((c) => c.label && c.image)
      break
  }
  return out
}

// Existing sections in their saved order, plus any section type that is missing.
function withAllSections(sections) {
  const have = new Set(sections.map((s) => s.key))
  return [...sections, ...DEFAULT_SECTIONS.filter((d) => !have.has(d.key))]
}

// A promo saved before multiple promos existed becomes the first item of the list
const upgradePromo = (s) => (s.key === 'promo' && !s.promos?.length && s.banner && s.coupon ? { ...s, promos: [{ banner: s.banner, coupon: s.coupon }] } : s)

const view = (doc) => {
  const { __v, ...rest } = doc.toObject()
  return { ...rest, sections: withAllSections(rest.sections).map(upgradePromo) }
}

export async function getHomePage(req, res) {
  res.json({ success: true, data: view(await HomePage.get()) })
}

export async function updateHomePage(req, res) {
  const body = req.body || {}
  const doc = await HomePage.get()

  if (body.hero && typeof body.hero === 'object') {
    const h = body.hero
    doc.hero.image = text(h.image, 500)
    doc.hero.eyebrow = text(h.eyebrow, 60)
    doc.hero.line1 = text(h.line1, 30)
    doc.hero.line2 = text(h.line2, 30)
    doc.hero.line3 = text(h.line3, 30)
    doc.hero.subtitle = text(h.subtitle, 120)
  }

  if (body.sections !== undefined) {
    if (!Array.isArray(body.sections)) throw badRequest('sections must be a list')
    const seen = new Set()
    const sections = []
    for (const raw of body.sections) {
      if (!HOME_SECTION_KEYS.includes(raw?.key) || seen.has(raw.key)) continue
      seen.add(raw.key)
      sections.push(cleanSection(raw))
    }
    doc.sections = sections
  }

  await doc.save()
  res.json({ success: true, message: 'Home page updated', data: view(doc) })
}
