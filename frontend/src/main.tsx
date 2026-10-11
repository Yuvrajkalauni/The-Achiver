import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './index.css'
import './components/LoadingScreen.css'
import './components/Navbar.css'
import './components/HeroSection.css'
import './components/ProfileCard.css'
import './components/InfiniteGallery.css'
import './components/DepthCarousel.css'
import './components/InfiniteSpiral.css'
import './components/Courses.css'
import './components/Syllabus.css'
import './components/Footer.css'
import './components/HomeSections.css'
import './pages/Page.css'
import './styles/theme-dark.css'
import { ThemeProvider } from './theme'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
