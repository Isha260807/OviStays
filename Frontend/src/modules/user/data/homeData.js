// Home page content now comes from the API (Admin > Home Management). Only fixed bits live here.

// Shown until the API answers, and for any hero field the admin leaves empty
export const DEFAULT_HERO = {
  image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1400&q=70',
  eyebrow: 'Find your perfect villa',
  line1: 'Relax.',
  line2: 'Unwind.',
  line3: 'Feel at home.',
  subtitle: 'Private villas, exceptional comfort.',
}

export const TRUST_POINTS = [
  { icon: 'Tag', title: 'Best Price', subtitle: 'Guarantee' },
  { icon: 'Support', title: '24/7', subtitle: 'Support' },
  { icon: 'Zap', title: 'Easy', subtitle: 'Bookings' },
  { icon: 'Shield', title: 'Secure', subtitle: 'Payments' },
]

export const formatPrice = (n) => `₹ ${Number(n).toLocaleString('en-IN')}`
