import HeroSection from '../components/HeroSection'
import TeachersSection from '../components/TeachersSection'
import TestimonialsSection from '../components/TestimonialsSection'
import FaqSection from '../components/FaqSection'
import './Page.css'

export default function Home() {
  return (
    <main className="ta-page">
      <HeroSection />
      <TeachersSection />
      <TestimonialsSection />
      <FaqSection />
    </main>
  )
}
