import { useState, useEffect, useMemo } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Search, X, ChevronDown, ChevronRight, ChevronLeft, LayoutDashboard, CalendarCheck,
  Building2, BedDouble, MapPin, Users, Star, Gift, Image, Bell, CreditCard, Wallet,
  FileText, MessageSquare, Mail, Settings, UserCog, User, Hotel,
} from "lucide-react"
import { cn } from "@/shared/utils/cn.js"
import { adminSidebarMenu } from "../constants/adminSidebarMenu.js"

const iconMap = {
  LayoutDashboard, CalendarCheck, Building2, BedDouble, MapPin, Users, Star, Gift, Image,
  Bell, CreditCard, Wallet, FileText, MessageSquare, Mail, Settings, UserCog, User,
}

const STORAGE_KEY = "admin_sidebar_state"
const keyOf = (label) => label.toLowerCase().replace(/\s+/g, "")

export default function AdminSidebar({ isOpen = false, onClose, onCollapseChange }) {
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState("")

  const getInitialStates = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch { /* ignore */ }
    return { isCollapsed: false, expandedSections: {} }
  }

  const [isCollapsed, setIsCollapsed] = useState(() => !!getInitialStates().isCollapsed)
  const isVisuallyCollapsed = isCollapsed && !isOpen
  const [expandedSections, setExpandedSections] = useState(() => getInitialStates().expandedSections || {})

  useEffect(() => {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, isCollapsed, expandedSections }))
    } catch { /* ignore */ }
  }, [isCollapsed, expandedSections])

  useEffect(() => {
    onCollapseChange?.(isCollapsed)
  }, [isCollapsed, onCollapseChange])

  const filteredMenuData = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return adminSidebarMenu
    const filtered = []
    adminSidebarMenu.forEach((item) => {
      if (item.type === "link") {
        if (item.label.toLowerCase().includes(query)) filtered.push(item)
      } else if (item.type === "section") {
        const items = []
        item.items.forEach((sub) => {
          if (sub.type === "link") {
            if (sub.label.toLowerCase().includes(query)) items.push(sub)
          } else if (sub.type === "expandable") {
            const matchesLabel = sub.label.toLowerCase().includes(query)
            const matching = sub.subItems.filter((si) => si.label.toLowerCase().includes(query))
            if (matchesLabel || matching.length) {
              items.push({ ...sub, subItems: matchesLabel ? sub.subItems : matching })
            }
          }
        })
        if (items.length) filtered.push({ ...item, items })
      }
    })
    return filtered
  }, [searchQuery])

  // Auto-expand matching groups while searching
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim()
    if (!query) return
    setExpandedSections((prev) => {
      const next = { ...prev }
      adminSidebarMenu.forEach((item) => {
        if (item.type !== "section") return
        item.items.forEach((sub) => {
          if (sub.type === "expandable" && (sub.label.toLowerCase().includes(query) ||
            sub.subItems.some((si) => si.label.toLowerCase().includes(query)))) {
            next[keyOf(sub.label)] = true
          }
        })
      })
      return next
    })
  }, [searchQuery])

  const isActive = (path, allPaths = []) => {
    const current = location.pathname.replace(/\/+$/, "") || "/"
    const target = String(path || "").replace(/\/+$/, "") || "/"
    const matches = (p) => current === p || current.startsWith(`${p}/`)
    if (target === "/admin") return current === target
    if (allPaths.length > 0) {
      const best = [...allPaths].sort((a, b) => b.length - a.length).find((p) => matches(p))
      return best === target
    }
    return matches(target)
  }

  // Accordion: opening one group closes the others
  const toggleSection = (sectionKey) => {
    setExpandedSections((prev) => {
      if (prev[sectionKey]) return { ...prev, [sectionKey]: false }
      const next = {}
      Object.keys(prev).forEach((k) => { next[k] = false })
      next[sectionKey] = true
      return next
    })
  }

  const closeOnMobile = () => {
    if (window.innerWidth < 1024 && onClose) onClose()
  }

  const renderMenuItem = (item, index) => {
    if (item.type === "link") {
      const Icon = iconMap[item.icon] || Hotel
      const active = isActive(item.path)
      return (
        <Link
          key={item.path || item.label || index}
          to={item.path}
          onClick={closeOnMobile}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-300 ease-out menu-item-animate text-left text-base font-bold",
            active ? "bg-white/10 text-white border border-white/15" : "text-neutral-100 hover:bg-white/5 hover:text-white",
            isVisuallyCollapsed && "justify-center px-2"
          )}
          style={{ animationDelay: `${index * 0.05}s` }}
          title={isVisuallyCollapsed ? item.label : undefined}
        >
          <Icon className={cn("w-4 h-4 shrink-0 transition-all duration-300", active ? "text-white scale-110" : "text-neutral-300")} />
          {!isVisuallyCollapsed && <span className="text-left font-bold">{item.label}</span>}
        </Link>
      )
    }

    if (item.type === "expandable") {
      const Icon = iconMap[item.icon] || Hotel
      const sectionKey = keyOf(item.label)
      const isExpanded = expandedSections[sectionKey] || false

      if (isVisuallyCollapsed) {
        return (
          <div key={item.label || index} className="menu-item-animate" style={{ animationDelay: `${index * 0.05}s` }}>
            <button
              onClick={() => toggleSection(sectionKey)}
              className="w-full flex items-center justify-center px-2 py-2 rounded-lg transition-all duration-300 text-base font-bold text-white hover:bg-white/5"
              title={item.label}
            >
              <Icon className="w-4 h-4 shrink-0 text-neutral-300" />
            </button>
          </div>
        )
      }

      return (
        <div key={item.label || index} className="menu-item-animate" style={{ animationDelay: `${index * 0.05}s` }}>
          <button
            onClick={() => toggleSection(sectionKey)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-all duration-300 ease-out text-base font-bold text-left text-white hover:bg-white/5"
          >
            <div className="flex items-center gap-2.5 text-left flex-1 min-w-0">
              <Icon className="w-4 h-4 shrink-0 text-neutral-100" />
              <span className="font-bold text-left">{item.label}</span>
            </div>
            <div className="transition-transform duration-300 shrink-0" style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}>
              <ChevronDown className="w-4 h-4 shrink-0 text-neutral-300" />
            </div>
          </button>
          {isExpanded && (
            <div className="ml-5 mt-1 space-y-1 border-neutral-800/60 pl-3 submenu-animate overflow-hidden">
              {item.subItems.map((subItem, subIndex) => {
                const allSubPaths = item.subItems.map((si) => si.path)
                const active = isActive(subItem.path, allSubPaths)
                return (
                  <Link
                    key={subItem.path}
                    to={subItem.path}
                    onClick={closeOnMobile}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-300 ease-out text-base font-bold text-left",
                      active ? "bg-white/10 text-white" : "text-neutral-100 hover:bg-white/5 hover:text-white"
                    )}
                    style={{ animationDelay: `${subIndex * 0.03}s` }}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-300", active ? "bg-white scale-125" : "bg-neutral-400")} />
                    <span className="text-left flex-1">{subItem.label}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <>
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes expandDown { from { opacity: 0; max-height: 0; transform: translateY(-10px); } to { opacity: 1; max-height: 500px; transform: translateY(0); } }
        .menu-item-animate { animation: slideIn 0.3s ease-out forwards; }
        .submenu-animate { animation: expandDown 0.3s ease-out forwards; }
        .admin-sidebar-scroll::-webkit-scrollbar { width: 2px; }
        .admin-sidebar-scroll::-webkit-scrollbar-track { background: rgba(17, 24, 39, 0.4); }
        .admin-sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
        .admin-sidebar-scroll:hover::-webkit-scrollbar { width: 6px; }
        .admin-sidebar-scroll { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.25) rgba(17, 24, 39, 0.4); }
      `}</style>
      <div
        className={cn(
          "border-r border-neutral-800 fixed left-0 top-0 z-[70] flex h-[100dvh] flex-col overflow-hidden",
          "transform transition-all duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "w-[min(20rem,calc(100vw-1.5rem))]",
          isVisuallyCollapsed ? "lg:w-20" : "lg:w-80",
          "bg-black"
        )}
        style={{
          backgroundColor: "#000000",
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* Header with brand */}
        <div className="shrink-0 px-3 py-3 border-b border-neutral-800 animate-[fadeIn_0.4s_ease-out] bg-black">
          <div className="flex items-center justify-between mb-3">
            {!isVisuallyCollapsed ? (
              <div className="flex items-center gap-2 animate-[slideIn_0.3s_ease-out]">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ring-1 ring-white/10">
                  <Hotel className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-extrabold text-white tracking-tight">OviStays</span>
              </div>
            ) : (
              <div className="w-full flex items-center justify-center">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shadow-lg shadow-black/20 ring-1 ring-white/10">
                  <span className="text-sm font-bold text-white">O</span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCollapsed((p) => !p)}
                className="hidden lg:inline-flex text-neutral-300 hover:text-white transition-all duration-200 hover:scale-110 p-1.5 rounded-lg hover:bg-white/5"
                title={isVisuallyCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isVisuallyCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <button onClick={onClose} className="lg:hidden text-neutral-300 hover:text-white transition-all duration-200 hover:scale-110">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {!isVisuallyCollapsed && (
            <div className="mb-3 animate-[slideIn_0.4s_ease-out_0.1s_both]">
              <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider text-left">Admin Panel</h2>
            </div>
          )}

          {!isVisuallyCollapsed && (
            <div className="relative animate-[slideIn_0.4s_ease-out_0.2s_both]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4 z-10" />
              <input
                type="text"
                placeholder="Search Menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                spellCheck="false"
                className={cn(
                  "w-full pl-9 py-2.5 bg-black border border-neutral-700 rounded-lg text-base font-bold text-white placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-white/40 transition-all duration-200 text-left",
                  searchQuery ? "pr-9" : "pr-3"
                )}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white z-10"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="admin-sidebar-scroll flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 py-3 space-y-2">
          {filteredMenuData.length === 0 && searchQuery.trim() ? (
            <div className="px-3 py-12 text-left animate-[fadeIn_0.4s_ease-out]">
              <p className="text-neutral-300 text-sm font-medium">No menu items found</p>
              <p className="text-neutral-500 text-sm mt-2">Try a different search term</p>
            </div>
          ) : (
            filteredMenuData.map((item, index) => {
              if (item.type === "link") return renderMenuItem(item, index)
              if (item.type === "section") {
                return (
                  <div
                    key={item.label || index}
                    className={cn(index > 0 ? "mt-4 pt-4 border-t border-neutral-800/60" : "", "animate-[fadeIn_0.4s_ease-out]")}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {!isVisuallyCollapsed && (
                      <div className="px-3 py-2 mb-2">
                        <span className="text-neutral-300 font-semibold text-base text-left">{item.label}</span>
                      </div>
                    )}
                    <div className="space-y-1">
                      {item.items.map((sub, subIndex) => renderMenuItem(sub, `${index}-${subIndex}`))}
                    </div>
                  </div>
                )
              }
              return null
            })
          )}
        </nav>
      </div>
    </>
  )
}
