import { configureStore } from '@reduxjs/toolkit'

// Redux requires at least one reducer. Feature slices get added here as the app grows.
const appReducer = (state = { ready: true }) => state

export const store = configureStore({
  reducer: { app: appReducer },
})
