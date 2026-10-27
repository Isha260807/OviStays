import { useEffect, useState } from "react"
import { toast } from "sonner"
import Modal from "./ui/Modal.jsx"
import { buttonOutline, buttonPrimary } from "./ui/FormFields.jsx"
import { adminAPI } from "../services/adminAPI.js"
import { errorMessage } from "@/services/api/axios.js"

// Cancels one booking on behalf of the platform and chooses how much of the payment goes back to the guest.
// Leaving the percentage empty uses the normal refund rules (Booking & Refund Rules).
export default function AdminCancelModal({ booking, onClose, onDone }) {
  const [reason, setReason] = useState("")
  const [percent, setPercent] = useState("")
  const [busy, setBusy] = useState(false)
  const [payments, setPayments] = useState([])
  useEffect(() => { adminAPI.bookingPayments(booking._id).then(setPayments).catch(() => {}) }, [booking._id])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await adminAPI.cancelBooking(booking._id, { reason, refundPercent: percent === "" ? undefined : Number(percent) })
      toast.success("Booking cancelled")
      onDone()
    } catch (err) {
      toast.error(errorMessage(err))
      setBusy(false)
    }
  }
  const paid = payments.find((p) => p.status === "Paid" || p.status === "Partially Refunded")
  return (
    <Modal open title={`Cancel ${booking.refId}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 text-sm">
        <p className="text-neutral-600">{booking.guestName} · {booking.hotelName} · status <b>{booking.status}</b>, payment <b>{booking.paymentStatus || "Unpaid"}</b></p>
        {paid && <p className="rounded-lg bg-neutral-50 p-3">Paid ₹{(paid.amountPaise / 100).toLocaleString("en-IN")} via {paid.provider}. Already refunded: ₹{(paid.refundedPaise / 100).toLocaleString("en-IN")}.</p>}
        <label className="block"><span className="mb-1 block font-medium">Reason (required)</span><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} required className="w-full rounded-lg border border-neutral-300 p-2" /></label>
        <label className="block"><span className="mb-1 block font-medium">Refund % to the guest</span>
          <input type="number" min="0" max="100" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="Leave empty to follow the normal rules" className="w-full rounded-lg border border-neutral-300 px-3 py-2" />
          <span className="mt-1 block text-xs text-neutral-500">0 = no refund, 100 = full refund. Only applies if the guest has paid.</span>
        </label>
        <div className="flex justify-end gap-2"><button type="button" className={buttonOutline} onClick={onClose}>Keep booking</button><button type="submit" className={buttonPrimary} disabled={busy || !reason.trim()}>{busy ? "Cancelling…" : "Cancel booking"}</button></div>
      </form>
    </Modal>
  )
}
