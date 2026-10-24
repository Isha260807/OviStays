import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { store } from './store.js'

export function AppProviders({ children }) {
  return (
    <Provider store={store}>
      <BrowserRouter>{children}</BrowserRouter>
    </Provider>
  )
}
