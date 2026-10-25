// Sample content for the user Home page. Swap for API data once the public villa endpoints exist.
const img = (id, w = 1100) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=88`

export const HERO_IMAGE = img('1613490493576-7fde63acd811', 1400)

export const CATEGORIES = [
  { label: 'Beach', to: '/villas?type=beach', image: img('1499793983690-e29da59ef1c2', 300) },
  { label: 'Pool', to: '/villas?type=pool', image: img('1602343168117-bb8ffe3e2e9f', 300) },
  { label: 'Hills', to: '/villas?type=hill', image: img('1506905925346-21bda4d32df4', 300) },
  { label: 'Winter', to: '/villas?type=winter', image: img('1518780664697-55e3ad937233', 300) },
  { label: 'Wedding', to: '/villas?type=wedding', image: img('1519225421980-715cb0215aed', 300) },
  { label: 'Farmhouse', to: '/villas?type=farmhouse', image: img('1564013799919-ab600027ffc6', 300) },
  { label: 'City', to: '/villas?type=city', image: img('1613977257363-707ba9348227', 300) },
]

export const POPULAR_VILLAS = [
  { id: 'lakeview-haveli', name: 'Lakeview Haveli Villa', city: 'Udaipur', rating: 4.8, price: 12999, image: img('1613977257363-707ba9348227') },
  { id: 'azure-beach', name: 'Azure Beach Villa', city: 'Goa', rating: 4.7, price: 9499, image: img('1499793983690-e29da59ef1c2') },
  { id: 'pine-ridge', name: 'Pine Ridge Villa', city: 'Manali', rating: 4.6, price: 6999, image: img('1506905925346-21bda4d32df4') },
  { id: 'palm-grove', name: 'Palm Grove Villa', city: 'Alibaug', rating: 4.5, price: 8499, image: img('1512917774080-9991f1c4c750') },
]

export const PROMO = {
  title: 'Extra 20% Off',
  line1: 'On your first villa booking',
  line2: 'Use code:',
  code: 'WELCOME20',
  cta: 'Book Now',
  image: img('1600607687939-ce8a6c25118c', 1200),
}

export const BEST_DEALS = [
  { id: 'misty-hills', name: 'Misty Hills Villa', location: 'Landour, Mussoorie, Uttarakhand', rating: 5, price: 5000, image: img('1564013799919-ab600027ffc6') },
  { id: 'sunset-ridge', name: 'Sunset Ridge Villa', location: 'Kasauli, Himachal Pradesh', rating: 4, price: 4200, image: img('1600596542815-ffad4c1539a9') },
  { id: 'cedar-nest', name: 'Cedar Nest Villa', location: 'Nainital, Uttarakhand', rating: 5, price: 5600, image: img('1600585154340-be6161a56a0c') },
]

// Short reels (about 6 seconds each). Add a `video` url to a reel and it plays in the card; without one the photo is shown.
export const REELS = [
  { id: 'r1', title: 'Pool Party', villa: 'Blue Lagoon Villa', villaId: 'blue-lagoon', city: 'Lonavala', price: 11999, duration: 6, video: '', image: img('1600585154340-be6161a56a0c', 700) },
  { id: 'r2', title: 'Sunset Deck', villa: 'Azure Beach Villa', villaId: 'azure-beach', city: 'Goa', price: 9499, duration: 6, video: '', image: img('1499793983690-e29da59ef1c2', 700) },
  { id: 'r3', title: 'Hill Views', villa: 'Pine Ridge Villa', villaId: 'pine-ridge', city: 'Manali', price: 6999, duration: 6, video: '', image: img('1506905925346-21bda4d32df4', 700) },
  { id: 'r4', title: 'Cosy Rooms', villa: 'Misty Hills Villa', villaId: 'misty-hills', city: 'Mussoorie', price: 5000, duration: 6, video: '', image: img('1578683010236-d716f9a3f461', 700) },
  { id: 'r5', title: 'Garden Lawn', villa: 'Palm Grove Villa', villaId: 'palm-grove', city: 'Alibaug', price: 8499, duration: 6, video: '', image: img('1512917774080-9991f1c4c750', 700) },
  { id: 'r6', title: 'Lake Stay', villa: 'Lakeview Haveli Villa', villaId: 'lakeview-haveli', city: 'Udaipur', price: 12999, duration: 6, video: '', image: img('1439066615861-d1af74d74000', 700) },
]

export const POOL_VILLAS = [
  { id: 'blue-lagoon', name: 'Blue Lagoon Villa', city: 'Lonavala', price: 11999, tag: '4 Bedrooms', image: img('1602343168117-bb8ffe3e2e9f') },
  { id: 'palm-retreat', name: 'Palm Retreat Villa', city: 'Alibaug', price: 14999, tag: '5 Bedrooms', image: img('1540541338287-41700207dee6') },
  { id: 'infinity-edge', name: 'Infinity Edge Villa', city: 'Goa', price: 17999, tag: '6 Bedrooms', image: img('1520250497591-112f2f40a3f4') },
]

export const WEEKEND_GETAWAYS = [
  { id: 'lonavala', city: 'Lonavala', tagline: 'Hill-view villas near Mumbai', price: 4999, image: img('1439066615861-d1af74d74000') },
  { id: 'goa', city: 'Goa', tagline: 'Beach villas with private pools', price: 6499, image: img('1499793983690-e29da59ef1c2') },
  { id: 'manali', city: 'Manali', tagline: 'Cosy cottages in the mountains', price: 4499, image: img('1506905925346-21bda4d32df4') },
]

export const HILL_RETREATS = [
  { id: 'cedar-cottage', name: 'Cedar Cottage Villa', location: 'Mussoorie', rating: 5, price: 5000, image: img('1469474968028-56623f02e42e') },
  { id: 'snowline', name: 'Snowline Villa', location: 'Manali', rating: 5, price: 5200, image: img('1518780664697-55e3ad937233') },
  { id: 'pinewood', name: 'Pinewood Villa', location: 'Shimla', rating: 4, price: 4800, image: img('1510798831971-661eb04b3739') },
]

export const OFFER_OF_THE_DAY = {
  id: 'ovi-signature',
  name: 'Ovi Signature Villa',
  location: 'Tulsi Marg, Rishikesh, Uttarakhand',
  rating: 4.8, reviews: 128, price: 30000,
  image: img('1613490493576-7fde63acd811', 1200),
}

export const BEACH_VILLAS = [
  { id: 'shore-house', name: 'Shore House Villa', location: 'Varkala, Kerala', rating: 5, price: 3999, image: img('1580587771525-78b9dba3b914') },
  { id: 'dune-villa', name: 'Dune Villa', location: 'Gokarna, Karnataka', rating: 5, price: 4499, image: img('1571003123894-1f0594d2b5d9') },
  { id: 'tide-villa', name: 'Tide Villa', location: 'Diu, Gujarat', rating: 4, price: 4199, image: img('1578683010236-d716f9a3f461') },
]

export const TRUST_POINTS = [
  { icon: 'Tag', title: 'Best Price', subtitle: 'Guarantee' },
  { icon: 'Support', title: '24/7', subtitle: 'Support' },
  { icon: 'Zap', title: 'Easy', subtitle: 'Bookings' },
  { icon: 'Shield', title: 'Secure', subtitle: 'Payments' },
]

export const formatPrice = (n) => `₹ ${Number(n).toLocaleString('en-IN')}`
