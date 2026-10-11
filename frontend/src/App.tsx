import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoadingScreen from './components/LoadingScreen'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Courses from './pages/Courses'
import Syllabus from './pages/Syllabus'
import MockTest from './pages/MockTest'
import About from './pages/About'
import Legal from './pages/Legal'
import Teachers from './pages/Teachers'
import Faqs from './pages/Faqs'

function NotFound() {
  return (
    <main className="ta-page">
      <section className="ta-page__hero">
        <div className="ta-page__wrap">
          <p className="ta-page__kicker">404</p>
          <h1>Page not found</h1>
          <p className="ta-page__lead">Use the navbar: Home, Courses, Syllabus, Mock Test, About.</p>
        </div>
      </section>
    </main>
  )
}

export default function App() {
  // Loading screen renders BEFORE navbar + page content (user requirement)
  const [loading, setLoading] = useState(true)

  return (
    <BrowserRouter>
      {loading && <LoadingScreen onDone={() => setLoading(false)} />}
      {!loading && (
        <>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/syllabus" element={<Syllabus />} />
            <Route path="/mock-test" element={<MockTest />} />
            {/* PRD canonical path alias */}
            <Route path="/tests/free" element={<Navigate to="/mock-test" replace />} />
            <Route path="/about" element={<About />} />
            <Route path="/teachers" element={<Teachers />} />
            <Route path="/faqs" element={<Faqs />} />
            <Route path="/privacy" element={<Legal />} />
            <Route path="/terms" element={<Legal />} />
            <Route path="/cookies" element={<Legal />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Footer />
        </>
      )}
    </BrowserRouter>
  )
}
