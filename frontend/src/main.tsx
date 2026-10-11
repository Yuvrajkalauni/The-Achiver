import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './index.css'
import './components/LoadingScreen.css'
import './components/Navbar.css'
import './components/HeroSection.css'
import './components/Footer.css'
import './components/HomeSections.css'
import './pages/Page.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
