import HeroSection from '../components/HeroSection'
import './Page.css'

export default function Home() {
  return (
    <main className="ta-page">
      <HeroSection />
      <div className="ta-page__wrap ta-page__body">
        <div className="ta-cards">
          <div className="ta-card"><span className="ta-badge">H-01 Hero</span><h2>Explore Courses</h2><p>Online + physical batches with real prices and seats.</p></div>
          <div className="ta-card"><span className="ta-badge">M-03 Free mock</span><h2>Try a free mock</h2><p>First test of each series is free after register.</p></div>
          <div className="ta-card"><span className="ta-badge">L-02 Counselling</span><h2>Free counselling</h2><p>1-on-1 session, callback within 24 hours.</p></div>
        </div>
      </div>
    </main>
  )
}
