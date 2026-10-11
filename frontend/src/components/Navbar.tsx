import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import ThemeToggle from './ThemeToggle'
import './Navbar.css'

// PRD §5 — only these 5 public items for R1 navbar (user request)
export const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/courses', label: 'Courses' },
  { to: '/syllabus', label: 'Syllabus' },
  { to: '/mock-test', label: 'Mock Test' },
  { to: '/about', label: 'About' },
] as const

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="ta-nav">
      <div className="ta-nav__inner">
        <div className="ta-nav__left">
          <ThemeToggle />
          <NavLink to="/" className="ta-nav__brand" aria-label="The Achievers Institute of Learning — home">
          <img
            src="/logo.jpg"
            alt="The Achievers Institute of Learning logo"
            className="ta-nav__logo-img"
            width={120}
            height={52}
          />
          </NavLink>
        </div>

        <button
          type="button"
          className="ta-nav__toggle"
          aria-expanded={open}
          aria-controls="ta-nav-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>

        <nav id="ta-nav-menu" className={`ta-nav__menu${open ? ' is-open' : ''}`} aria-label="Primary">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={'end' in item && item.end}
                  className={({ isActive }) => (isActive ? 'is-active' : '')}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <NavLink to="/mock-test" className="ta-nav__cta" onClick={() => setOpen(false)}>
            Free Mock
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
