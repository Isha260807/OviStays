import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react"
import PageHeader from "../components/ui/PageHeader.jsx"
import { buttonPrimary } from "../components/ui/FormFields.jsx"
import ImageUpload from "@/shared/components/ImageUpload.jsx"
import { adminAPI } from "../services/adminAPI.js"
import { INPUT, ICON_BTN, Field, TextInput, Select, Toggle, Rows } from "../components/ui/EditorKit.jsx"
import { errorMessage } from "@/services/api/axios.js"

// What each section holds and which editor it needs
const SECTIONS = {
  categories: { label: "Categories", note: "Round photos under the search bar. Each one opens the villa list for its label.", type: "categories", heading: false },
  popular: { label: "Popular Destinations", type: "hotels" },
  promo: { label: "Promo banner", note: "Each promo is a banner (image and line of text) plus a coupon (code and discount). Add as many as you like; with more than one, the app shows them as a swipe row.", type: "promo", heading: false },
  bestDeals: { label: "Best Deals", type: "hotels" },
  reels: { label: "Villa Vibes (reels)", note: "Very short clips. A reel needs a title and a video or a cover photo.", type: "reels" },
  poolVillas: { label: "Private Pool Villas", type: "hotels" },
  weekend: { label: "Weekend Getaways", note: "A tile shows only when its city has at least one active villa; the 'from' price is the cheapest one.", type: "tiles" },
  hills: { label: "Hill Retreats", type: "hotels" },
  offerOfDay: { label: "Offer of the Day", type: "hotel" },
  beachside: { label: "Beachside Villas", type: "hotels" },
}

// Ordered list of villas for a section: the order here is the order on the Home page
function HotelList({ ids, onChange, hotels }) {
  const label = Object.fromEntries(hotels.map((h) => [h.value, h.label]))
  const available = hotels.filter((h) => !ids.includes(h.value))
  const move = (i, d) => {
    const next = [...ids]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    onChange(next)
  }
  return (
    <div className="space-y-3">
      {ids.length === 0 && <p className="text-sm text-neutral-500">No villas added yet. Only active villas show on the app.</p>}
      <ul className="space-y-2">
        {ids.map((id, i) => (
          <li key={id} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
            <span className="text-xs font-bold text-neutral-400 w-5">{i + 1}</span>
            <span className="flex-1 text-sm text-neutral-800 truncate">{label[id] || "Villa not found (removed?)"}</span>
            <button type="button" className={ICON_BTN} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ChevronUp className="w-4 h-4" /></button>
            <button type="button" className={ICON_BTN} disabled={i === ids.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ChevronDown className="w-4 h-4" /></button>
            <button type="button" className={ICON_BTN} onClick={() => onChange(ids.filter((x) => x !== id))} aria-label="Remove"><Trash2 className="w-4 h-4 text-red-600" /></button>
          </li>
        ))}
      </ul>
      <Select value="" onChange={(v) => v && onChange([...ids, v])} options={available} placeholder={available.length ? "+ Add a villa..." : "No more villas to add"} />
    </div>
  )
}

function SectionEditor({ section, patch, opts }) {
  const meta = SECTIONS[section.key]
  switch (meta.type) {
    case "hotels":
      return <HotelList ids={section.hotels || []} onChange={(hotels) => patch({ hotels })} hotels={opts.hotels} />

    case "hotel":
      return (
        <Field label="Villa">
          <Select value={section.hotel} onChange={(hotel) => patch({ hotel: hotel || null })} options={opts.hotels} />
        </Field>
      )

    case "promo":
      return (
        <div className="space-y-3">
          <Rows
            items={section.promos || []}
            onChange={(promos) => patch({ promos })}
            blank={{ banner: null, coupon: null }}
            addLabel="Add promo"
            render={(p, set) => (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Banner">
                  <Select value={p.banner} onChange={(banner) => set({ banner: banner || null })} options={opts.banners} />
                </Field>
                <Field label="Coupon">
                  <Select value={p.coupon} onChange={(coupon) => set({ coupon: coupon || null })} options={opts.coupons} />
                </Field>
              </div>
            )}
          />
          <p className="text-xs text-neutral-500">
            A promo shows only when both are chosen, Active and not expired. Add or edit them in <Link to="/admin/banners" className="underline">Banners</Link> and <Link to="/admin/coupons" className="underline">Coupons</Link>.
          </p>
        </div>
      )

    case "tiles":
      return (
        <Rows
          items={section.tiles || []}
          onChange={(tiles) => patch({ tiles })}
          blank={{ city: "", image: "", tagline: "" }}
          addLabel="Add city"
          render={(t, set) => (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="City (from Locations)"><Select value={t.city} onChange={(city) => set({ city })} options={opts.locations} /></Field>
              <Field label="Short description"><TextInput value={t.tagline} onChange={(tagline) => set({ tagline })} placeholder="Beach villas with private pools" maxLength={80} /></Field>
              <Field label="Photo" className="sm:col-span-2"><ImageUpload id={`tile-${t.city}`} value={t.image} preset="misc" onChange={(image) => set({ image })} /></Field>
            </div>
          )}
        />
      )

    case "reels":
      return (
        <Rows
          items={section.reels || []}
          onChange={(reels) => patch({ reels })}
          blank={{ title: "", video: "", poster: "", hotel: null, duration: 6 }}
          addLabel="Add reel"
          render={(r, set) => (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Title"><TextInput value={r.title} onChange={(title) => set({ title })} placeholder="Pool Party" maxLength={40} /></Field>
              <Field label="Seconds on screen"><input type="number" min={2} max={30} className={INPUT} value={r.duration ?? 6} onChange={(e) => set({ duration: Number(e.target.value) })} /></Field>
              <Field label="Video"><VideoUpload value={r.video} onChange={(video) => set({ video })} /></Field>
              <Field label="Cover photo"><ImageUpload id={`reel-${r.title}`} value={r.poster} preset="misc" onChange={(poster) => set({ poster })} /></Field>
              <Field label="Linked villa (optional)" className="sm:col-span-2">
                <Select value={r.hotel} onChange={(hotel) => set({ hotel: hotel || null })} options={opts.hotels} placeholder="No villa" />
              </Field>
            </div>
          )}
        />
      )

    case "categories":
      return (
        <Rows
          items={section.categories || []}
          onChange={(categories) => patch({ categories })}
          blank={{ label: "", image: "" }}
          addLabel="Add category"
          render={(c, set) => (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Label"><TextInput value={c.label} onChange={(label) => set({ label })} placeholder="Beach" maxLength={30} /></Field>
              <Field label="Photo"><ImageUpload id={`cat-${c.label}`} value={c.image} preset="misc" onChange={(image) => set({ image })} /></Field>
            </div>
          )}
        />
      )

    default:
      return null
  }
}

export default function HomeDesign() {
  const [config, setConfig] = useState(null)
  const [opts, setOpts] = useState({ hotels: [], banners: [], coupons: [], locations: [] })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [tab, setTab] = useState("hero") // hero | order | a section key

  useEffect(() => {
    let alive = true
    const safe = (p) => p.catch(() => [])
    Promise.all([
      adminAPI.getHomePage(),
      safe(adminAPI.options("hotels")), safe(adminAPI.options("banners")),
      safe(adminAPI.options("coupons")), safe(adminAPI.options("locations")),
    ])
      .then(([page, hotels, banners, coupons, locations]) => {
        if (!alive) return
        setConfig(page)
        setOpts({ hotels, banners, coupons, locations })
      })
      .catch((err) => alive && setError(errorMessage(err)))
    return () => { alive = false }
  }, [])

  if (error) return <div className="p-6 text-red-700">{error}</div>
  if (!config) return <div className="flex items-center gap-2 p-6 text-neutral-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>

  const setHero = (patch) => setConfig((c) => ({ ...c, hero: { ...c.hero, ...patch } }))
  const patchSection = (key, patch) => setConfig((c) => ({ ...c, sections: c.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)) }))
  const moveSection = (i, d) => setConfig((c) => {
    const sections = [...c.sections]
    ;[sections[i], sections[i + d]] = [sections[i + d], sections[i]]
    return { ...c, sections }
  })

  const save = async () => {
    setSaving(true)
    try {
      setConfig(await adminAPI.saveHomePage({ hero: config.hero, sections: config.sections }))
      toast.success("Home page updated")
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const { hero } = config
  const current = config.sections.find((x) => x.key === tab)
  const tabCls = (active, dim) =>
    `shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-colors cursor-pointer ${
      active ? "bg-black text-white border-black" : `bg-white border-neutral-300 hover:bg-neutral-50 ${dim ? "text-neutral-400" : "text-neutral-800"}`
    }`

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title="Home Page Design"
        subtitle="Everything on the user Home page. Sections with nothing to show stay hidden on the app."
        actions={<button type="button" onClick={save} disabled={saving} className={buttonPrimary}>{saving ? "Saving..." : "Save Changes"}</button>}
      />

      {/* Horizontal tabs: Hero, every section (greyed when hidden), and the order of sections */}
      <div role="tablist" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        <button type="button" role="tab" aria-selected={tab === "hero"} className={tabCls(tab === "hero")} onClick={() => setTab("hero")}>Hero</button>
        {config.sections.map((x) => (
          <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} className={tabCls(tab === x.key, !x.enabled)} onClick={() => setTab(x.key)} title={x.enabled ? "" : "Hidden on the app"}>
            {SECTIONS[x.key].label}
          </button>
        ))}
        <button type="button" role="tab" aria-selected={tab === "order"} className={tabCls(tab === "order")} onClick={() => setTab("order")}>Order</button>
      </div>

      {tab === "hero" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-4 text-base font-semibold text-neutral-900">Hero (top of the page)</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hero photo" className="sm:col-span-2"><ImageUpload id="hero-image" value={hero.image} preset="banner" onChange={(image) => setHero({ image })} /></Field>
            <Field label="Small line above the headline" className="sm:col-span-2"><TextInput value={hero.eyebrow} onChange={(eyebrow) => setHero({ eyebrow })} maxLength={60} /></Field>
            <Field label="Headline, line 1"><TextInput value={hero.line1} onChange={(line1) => setHero({ line1 })} maxLength={30} /></Field>
            <Field label="Headline, line 2"><TextInput value={hero.line2} onChange={(line2) => setHero({ line2 })} maxLength={30} /></Field>
            <Field label="Headline, line 3 (highlighted)"><TextInput value={hero.line3} onChange={(line3) => setHero({ line3 })} maxLength={30} /></Field>
            <Field label="Sub text"><TextInput value={hero.subtitle} onChange={(subtitle) => setHero({ subtitle })} maxLength={120} /></Field>
          </div>
        </div>
      )}

      {current && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-neutral-900">{SECTIONS[current.key].label}</h2>
            <Toggle checked={current.enabled} onChange={(enabled) => patchSection(current.key, { enabled })} label={current.enabled ? "Shown on the app" : "Hidden on the app"} />
          </div>
          {SECTIONS[current.key].note && <p className="mb-4 text-sm text-neutral-500">{SECTIONS[current.key].note}</p>}
          {SECTIONS[current.key].heading !== false && (
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Heading"><TextInput value={current.title} onChange={(title) => patchSection(current.key, { title })} maxLength={80} /></Field>
              <Field label="Small text under the heading"><TextInput value={current.subtitle} onChange={(subtitle) => patchSection(current.key, { subtitle })} maxLength={120} /></Field>
            </div>
          )}
          <SectionEditor section={current} patch={(patch) => patchSection(current.key, patch)} opts={opts} />
        </div>
      )}

      {tab === "order" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-1 text-base font-semibold text-neutral-900">Order of sections</h2>
          <p className="mb-4 text-sm text-neutral-500">The first one shows right under the hero. Use the arrows to move a section up or down.</p>
          <ul className="space-y-2">
            {config.sections.map((x, i) => (
              <li key={x.key} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                <span className="w-5 text-xs font-bold text-neutral-400">{i + 1}</span>
                <span className="flex-1 truncate text-sm text-neutral-800">{SECTIONS[x.key].label}</span>
                {!x.enabled && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-600">Hidden</span>}
                <button type="button" className={ICON_BTN} disabled={i === 0} onClick={() => moveSection(i, -1)} aria-label="Move up"><ChevronUp className="w-4 h-4" /></button>
                <button type="button" className={ICON_BTN} disabled={i === config.sections.length - 1} onClick={() => moveSection(i, 1)} aria-label="Move down"><ChevronDown className="w-4 h-4" /></button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className={buttonPrimary}>{saving ? "Saving..." : "Save Changes"}</button>
      </div>
    </div>
  )
}
