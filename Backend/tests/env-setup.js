// Imported first by every database test, so these values are in place before the app reads its settings.
process.env.NODE_ENV = 'test'
process.env.MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/OviStays_test'
process.env.OTP_MODE = 'demo'
process.env.RAZORPAY_KEY_ID = ''
process.env.RAZORPAY_KEY_SECRET = ''
process.env.RAZORPAY_WEBHOOK_SECRET = ''
