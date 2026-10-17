import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// The device tiers' page hooks (design Rev .163): after index.css, unlayered.
import './styles/device.css'
// The tier on <html> before the first render.
import './lib/device'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
