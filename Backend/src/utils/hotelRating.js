import mongoose from 'mongoose'
import Hotel from '../models/Hotel.model.js'
import Review from '../models/Review.model.js'

// Stores the average of a hotel's Published reviews on the hotel (one decimal), so lists can show it without counting reviews.
// Hotels with no published reviews keep rating 0.
export async function recalcHotelRating(hotelId) {
  if (!mongoose.isValidObjectId(hotelId)) return
  const [row] = await Review.aggregate([
    { $match: { hotel: new mongoose.Types.ObjectId(String(hotelId)), status: 'Published' } },
    { $group: { _id: null, avg: { $avg: '$rating' } } },
  ])
  await Hotel.updateOne({ _id: hotelId }, { rating: row ? Math.round(row.avg * 10) / 10 : 0 })
}
