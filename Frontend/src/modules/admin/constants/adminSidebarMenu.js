// type: "link" | "expandable" | "section". Sections hold links/expandables.
// Icon names are resolved by iconMap in AdminSidebar.jsx.
export const adminSidebarMenu = [
  { type: "link", label: "Dashboard", path: "/admin", icon: "LayoutDashboard" },
  {
    type: "section",
    label: "BOOKING MANAGEMENT",
    items: [
      {
        type: "expandable",
        label: "Bookings",
        icon: "CalendarCheck",
        subItems: [
          { label: "All", path: "/admin/bookings/all" },
          { label: "Pending", path: "/admin/bookings/pending" },
          { label: "Confirmed", path: "/admin/bookings/confirmed" },
          { label: "Checked In", path: "/admin/bookings/checked-in" },
          { label: "Checked Out", path: "/admin/bookings/checked-out" },
          { label: "Cancelled", path: "/admin/bookings/cancelled" },
          { label: "Refunded", path: "/admin/bookings/refunded" },
        ],
      },
    ],
  },
  {
    type: "section",
    label: "HOTEL MANAGEMENT",
    items: [
      {
        type: "expandable",
        label: "Hotels",
        icon: "Building2",
        subItems: [
          { label: "All Hotels", path: "/admin/hotels/all" },
          { label: "Join Requests", path: "/admin/hotels/join-requests" },
          { label: "Add Hotel", path: "/admin/hotels/add" },
          { label: "Suspended", path: "/admin/hotels/suspended" },
        ],
      },
      {
        type: "expandable",
        label: "Rooms",
        icon: "BedDouble",
        subItems: [
          { label: "Room Types", path: "/admin/rooms/types" },
          { label: "Amenities", path: "/admin/rooms/amenities" },
        ],
      },
      { type: "link", label: "Locations", path: "/admin/locations", icon: "MapPin" },
    ],
  },
  {
    type: "section",
    label: "CUSTOMER MANAGEMENT",
    items: [
      { type: "link", label: "Customers", path: "/admin/customers", icon: "Users" },
      { type: "link", label: "Reviews & Ratings", path: "/admin/reviews", icon: "Star" },
    ],
  },
  {
    type: "section",
    label: "PROMOTION MANAGEMENT",
    items: [
      { type: "link", label: "Coupons", path: "/admin/coupons", icon: "Gift" },
      { type: "link", label: "Banners", path: "/admin/banners", icon: "Image" },
      { type: "link", label: "Push Notifications", path: "/admin/notifications", icon: "Bell" },
    ],
  },
  {
    type: "section",
    label: "TRANSACTION MANAGEMENT",
    items: [
      { type: "link", label: "Payments", path: "/admin/payments", icon: "CreditCard" },
      { type: "link", label: "Hotel Payouts", path: "/admin/payouts", icon: "Wallet" },
      { type: "link", label: "Reports", path: "/admin/reports", icon: "FileText" },
    ],
  },
  {
    type: "section",
    label: "HELP & SUPPORT",
    items: [
      { type: "link", label: "Support Tickets", path: "/admin/support-tickets", icon: "MessageSquare" },
      { type: "link", label: "Contact Messages", path: "/admin/contact-messages", icon: "Mail" },
    ],
  },
  {
    type: "section",
    label: "SYSTEM SETTINGS",
    items: [
      { type: "link", label: "Business Setup", path: "/admin/settings", icon: "Settings" },
      { type: "link", label: "Sub Admins", path: "/admin/sub-admins", icon: "UserCog" },
      { type: "link", label: "Profile", path: "/admin/profile", icon: "User" },
    ],
  },
]
