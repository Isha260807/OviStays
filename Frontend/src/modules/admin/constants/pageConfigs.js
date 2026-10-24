import { adminAPI } from "../services/adminAPI.js"
import { useAuthStore } from "@/core/auth/auth.store.js"

// Page definitions only: columns, filters and form fields. All data comes from the API.
const t = (key, label, type) => ({ key, label, type })
const ID = t("refId", "ID")
const STATUS = t("status", "Status", "status")

const BOOKING_STATUSES = ["Pending", "Confirmed", "Checked In", "Checked Out", "Cancelled", "Refunded"]
const HOTEL_STATUSES = ["Active", "Pending", "Suspended"]
const ACTIVE = ["Active", "Inactive"]

// ---------- Bookings (one page per status) ----------
const bookingColumns = [
  ID, t("guestName", "Guest"), t("hotelName", "Hotel"), t("city", "City"),
  t("checkIn", "Check-in"), t("checkOut", "Check-out"), t("amount", "Amount", "money"), STATUS,
]

const bookingPage = (title, fixedStatus) => ({
  title,
  subtitle: fixedStatus ? `Bookings with status "${fixedStatus}"` : "All hotel bookings",
  endpoint: "bookings",
  columns: bookingColumns,
  fixedStatus,
  statusOptions: BOOKING_STATUSES,
  statusEditable: true,
})

const hotelColumns = [ID, t("coverImage", "Photo", "image"), t("name", "Name"), t("city", "City"), t("owner", "Owner"), t("rooms", "Rooms"), t("rating", "Rating", "stars"), STATUS]

// Keys are the URL paths under /admin
export const listConfigs = {
  "bookings/all": bookingPage("All Bookings"),
  "bookings/pending": bookingPage("Pending Bookings", "Pending"),
  "bookings/confirmed": bookingPage("Confirmed Bookings", "Confirmed"),
  "bookings/checked-in": bookingPage("Checked In", "Checked In"),
  "bookings/checked-out": bookingPage("Checked Out", "Checked Out"),
  "bookings/cancelled": bookingPage("Cancelled Bookings", "Cancelled"),
  "bookings/refunded": bookingPage("Refunded Bookings", "Refunded"),

  "hotels/all": {
    title: "All Hotels", subtitle: "Every hotel registered on OviStays", endpoint: "hotels",
    columns: hotelColumns, statusOptions: HOTEL_STATUSES, statusEditable: true,
    addLabel: "Add Hotel", addPath: "/admin/hotels/add",
  },
  "hotels/join-requests": {
    title: "Join Requests", subtitle: "Hotels waiting for approval", endpoint: "hotels",
    columns: hotelColumns, fixedStatus: "Pending", statusOptions: HOTEL_STATUSES, statusEditable: true,
    rowActions: [
      { label: "Approve", patch: { status: "Active" } },
      { label: "Reject", patch: { status: "Suspended" }, tone: "danger" },
    ],
  },
  "hotels/suspended": {
    title: "Suspended Hotels", subtitle: "Hotels currently blocked from receiving bookings", endpoint: "hotels",
    columns: hotelColumns, fixedStatus: "Suspended", statusOptions: HOTEL_STATUSES, statusEditable: true,
    rowActions: [{ label: "Reactivate", patch: { status: "Active" } }],
  },

  "rooms/types": {
    title: "Room Types", subtitle: "Room categories offered by hotels", endpoint: "room-types",
    columns: [ID, t("name", "Type"), t("hotelName", "Hotel"), t("capacity", "Capacity"), t("price", "Price / night", "money"), STATUS],
    statusOptions: ACTIVE, statusEditable: true, addLabel: "Add Room Type",
    addFields: [
      { name: "hotel", label: "Hotel", type: "select", optionsFrom: "hotels", required: true, full: true },
      { name: "name", label: "Type Name", required: true },
      { name: "capacity", label: "Capacity", type: "number" },
      { name: "price", label: "Price per night", type: "number", required: true },
    ],
  },
  "rooms/amenities": {
    title: "Amenities", subtitle: "Facilities hotels can attach to rooms", endpoint: "amenities",
    columns: [ID, t("name", "Amenity"), t("category", "Category"), STATUS],
    statusOptions: ACTIVE, statusEditable: true, addLabel: "Add Amenity",
    addFields: [
      { name: "name", label: "Amenity Name", required: true },
      { name: "category", label: "Category", type: "select", options: ["Basic", "Comfort", "Wellness", "Dining"] },
    ],
  },
  locations: {
    title: "Locations", subtitle: "Cities where OviStays operates", endpoint: "locations",
    columns: [ID, t("city", "City"), t("state", "State"), t("hotels", "Hotels"), STATUS],
    statusOptions: ACTIVE, statusEditable: true, addLabel: "Add Location",
    addFields: [
      { name: "city", label: "City", required: true },
      { name: "state", label: "State", required: true },
    ],
  },

  customers: {
    title: "Customers", subtitle: "Registered guests", endpoint: "customers",
    columns: [ID, t("name", "Name"), t("email", "Email"), t("phone", "Phone"), t("bookings", "Bookings"), STATUS],
    statusOptions: ACTIVE, statusEditable: true,
  },
  reviews: {
    title: "Reviews & Ratings", subtitle: "Guest feedback on hotels", endpoint: "reviews",
    columns: [ID, t("guestName", "Guest"), t("hotelName", "Hotel"), t("rating", "Rating", "stars"), t("comment", "Comment"), STATUS],
    statusOptions: ["Published", "Pending", "Hidden"], statusEditable: true,
  },

  coupons: {
    title: "Coupons", subtitle: "Discount codes for guests", endpoint: "coupons",
    columns: [ID, t("couponCode", "Code"), t("discount", "Discount"), t("validTill", "Valid till"), t("usedCount", "Used"), STATUS],
    statusOptions: ["Active", "Inactive", "Expired"], statusEditable: true, addLabel: "Add Coupon",
    addFields: [
      { name: "couponCode", label: "Coupon Code", required: true },
      { name: "discountType", label: "Discount type", type: "select", options: ["percent", "flat"], required: true },
      { name: "discountValue", label: "Discount value", type: "number", required: true },
      { name: "validTill", label: "Valid till", type: "date", required: true },
    ],
  },
  banners: {
    title: "Banners", subtitle: "Promotional banners shown in the app", endpoint: "banners",
    columns: [ID, t("imageUrl", "Image", "image"), t("title", "Title"), t("position", "Position"), t("validTill", "Valid till"), STATUS],
    statusOptions: ["Active", "Draft"], statusEditable: true, addLabel: "Add Banner",
    addFields: [
      { name: "title", label: "Title", required: true, full: true },
      { name: "imageUrl", label: "Banner image (1600 x 600 works best)", type: "image", preset: "banner", full: true },
      { name: "position", label: "Position", type: "select", options: ["Home Top", "Home Middle", "Search Page"] },
      { name: "validTill", label: "Valid till", type: "date" },
    ],
  },
  notifications: {
    title: "Push Notifications", subtitle: "Messages sent to users and hotels", endpoint: "notifications",
    columns: [ID, t("title", "Title"), t("audience", "Audience"), t("sentOn", "Date"), STATUS],
    statusOptions: ["Sent", "Scheduled"], addLabel: "Send Notification",
    addFields: [
      { name: "title", label: "Title", required: true, full: true },
      { name: "audience", label: "Audience", type: "select", options: ["All Users", "Users", "Hotels"] },
      { name: "message", label: "Message", type: "textarea", full: true },
    ],
  },

  payments: {
    title: "Payments", subtitle: "All booking payments", endpoint: "payments",
    columns: [ID, t("bookingCode", "Booking"), t("guestName", "Guest"), t("method", "Method"), t("amount", "Amount", "money"), STATUS],
    statusOptions: ["Paid", "Pending", "Failed", "Refunded"], statusEditable: true,
  },
  payouts: {
    title: "Hotel Payouts", subtitle: "Settlements to hotel owners", endpoint: "payouts",
    columns: [ID, t("hotelName", "Hotel"), t("period", "Period"), t("amount", "Amount", "money"), STATUS],
    statusOptions: ["Pending", "Processed"], statusEditable: true, addLabel: "Create Payout",
    addFields: [
      { name: "hotel", label: "Hotel", type: "select", optionsFrom: "hotels", required: true, full: true },
      { name: "period", label: "Period (e.g. Oct 2026 - W1)", required: true },
      { name: "amount", label: "Amount", type: "number", required: true },
    ],
  },
  "support-tickets": {
    title: "Support Tickets", subtitle: "Issues raised by guests and hotels", endpoint: "support-tickets",
    columns: [ID, t("subject", "Subject"), t("raisedBy", "Raised by"), t("priority", "Priority"), STATUS],
    statusOptions: ["Open", "In Progress", "Resolved", "Closed"], statusEditable: true,
  },
  "contact-messages": {
    title: "Contact Messages", subtitle: "Messages from the contact form", endpoint: "contact-messages",
    columns: [ID, t("name", "Name"), t("email", "Email"), t("message", "Message"), t("receivedOn", "Received"), STATUS],
    statusOptions: ["Unread", "Read"], statusEditable: true,
  },
  "sub-admins": {
    title: "Sub Admins", subtitle: "Team members with limited admin access", endpoint: "sub-admins",
    columns: [ID, t("name", "Name"), t("email", "Email"), t("role", "Role"), STATUS],
    statusOptions: ACTIVE, statusEditable: true, addLabel: "Add Sub Admin",
    addFields: [
      { name: "name", label: "Name", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "designation", label: "Role", type: "select", options: ["Support", "Finance", "Content", "Operations"] },
      { name: "password", label: "Password (min 8 characters)", type: "password", required: true },
    ],
  },
}

// ---------- Form pages ----------
export const formConfigs = {
  "hotels/add": {
    title: "Add Hotel", subtitle: "Register a new hotel", submitLabel: "Create Hotel",
    successMessage: "Hotel created", redirectTo: "/admin/hotels/all",
    save: (values) => adminAPI.create("hotels", values),
    sections: [
      {
        title: "Basic details",
        fields: [
          { name: "name", label: "Hotel Name", required: true },
          { name: "owner", label: "Owner Name", required: true },
          { name: "coverImage", label: "Cover image", type: "image", preset: "hotel", full: true },
          { name: "email", label: "Email", type: "email" },
          { name: "phone", label: "Phone" },
          { name: "description", label: "Description", type: "textarea", full: true },
        ],
      },
      {
        title: "Location",
        fields: [
          { name: "address", label: "Address", full: true },
          { name: "city", label: "City", required: true },
          { name: "state", label: "State" },
          { name: "pincode", label: "Pincode" },
        ],
      },
      {
        title: "Rooms & pricing",
        fields: [
          { name: "rooms", label: "Total Rooms", type: "number" },
          { name: "startingPrice", label: "Starting price per night", type: "number" },
          { name: "checkInTime", label: "Check-in time", placeholder: "12:00" },
          { name: "checkOutTime", label: "Check-out time", placeholder: "11:00" },
        ],
      },
    ],
  },

  profile: {
    title: "Profile", subtitle: "Your admin account", keepEmpty: true,
    successMessage: "Profile updated",
    resetOnSave: { currentPassword: "", newPassword: "" },
    load: () => adminAPI.me(),
    save: async ({ name, email, phone, currentPassword, newPassword }) => {
      const user = await adminAPI.updateProfile({ name, email, phone })
      useAuthStore.getState().setUser(user)
      if (newPassword) await adminAPI.changePassword({ currentPassword, newPassword })
    },
    sections: [
      {
        title: "Account",
        fields: [
          { name: "name", label: "Full Name", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "phone", label: "Phone" },
        ],
      },
      {
        title: "Change password (leave blank to keep the current one)",
        fields: [
          { name: "currentPassword", label: "Current Password", type: "password" },
          { name: "newPassword", label: "New Password (min 8 characters)", type: "password" },
        ],
      },
    ],
  },
}
