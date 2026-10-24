import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import App from './app/App.jsx'
import { AppProviders } from './app/providers.jsx'
import './shared/styles/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProviders>
      <App />
      <Toaster richColors position="top-right" />
    </AppProviders>
  </StrictMode>
)
