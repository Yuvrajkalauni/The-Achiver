import { Link } from 'react-router-dom'
import './Footer.css'

// PRD Appendix B — single source of truth (mirrors future CMS Setting singleton, TRD §5.4)
const CONTACT = {
  primaryPhone: '+977 9810686665',
  primaryTel: 'tel:+9779810686665',
  secondaryPhones: ['9747968501', '9747968502'],
  whatsapp: 'https://wa.me/9779810686665?text=Namaste!%20I%20want%20course%20details.',
  email: 'info.theachiever@gmail.com',
  address: 'Puspalal Chowk, Science Campus Road, Mahendranagar, Nepal',
  map: 'https://maps.app.goo.gl/fo6vjBYxXNQiSswWA',
  hours: 'Sun–Fri',
  androidApp: 'https://play.google.com/store/apps/details?id=com.theachievers.learning',
  social: {
    facebook: 'https://facebook.com/profile.php?id=61579416387457',
    youtube: 'https://youtube.com/@TheAchieversAcademy-edu',
    tiktok: 'https://tiktok.com/@achievers.academy10',
  },
} as const

const EXPLORE = [
  { to: '/', label: 'Home' },
  { to: '/courses', label: 'Courses' },
  { to: '/syllabus', label: 'Syllabus' },
  { to: '/mock-test', label: 'Mock Test' },
  { to: '/teachers', label: 'Teachers' },
  { to: '/faqs', label: 'FAQs' },
  { to: '/about', label: 'About' },
] as const

const COURSE_LINKS = [
  'SEE Batch',
  'Class 11 (Science)',
  'NEB Class 12 (Science)',
  'CEE Medical Preparation',
  'IOE Entrance',
] as const

function SocialIcon({ label, href, path }: { label: string; href: string; path: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={label} className="ta-foot__social">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d={path} />
      </svg>
    </a>
  )
}

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <>
      {/* PRD H-05: sticky WhatsApp + call on mobile */}
      <div className="ta-float" aria-label="Quick contact">
        <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5l-.4.5c-.2.2-.3.4-.1.7.2.3.9 1.5 2 2.4 1.4 1.2 2.5 1.6 2.9 1.8.3.2.5.1.7-.1l.8-1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .6-.4 1.1Z" />
          </svg>
        </a>
        <a href={CONTACT.primaryTel} aria-label={`Call ${CONTACT.primaryPhone}`}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2Z" />
          </svg>
        </a>
      </div>

      <footer className="ta-foot" aria-label="Site footer">
        <div className="ta-foot__main">
          <div className="ta-foot__col ta-foot__brand">
            <img src="/logo.jpg" alt="The Achievers Institute of Learning" width={160} height={70} />
            <p className="ta-foot__tag">Your Success Our Achievement</p>
            <p>{CONTACT.address}</p>
            <div className="ta-foot__socials">
              <SocialIcon
                label="The Achievers on Facebook"
                href={CONTACT.social.facebook}
                path="M13.5 22v-8h2.7l.4-3.2h-3.1V8.7c0-.9.3-1.6 1.7-1.6h1.5V4.2c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.7H7.8V14h2.7v8h3Z"
              />
              <SocialIcon
                label="The Achievers on YouTube"
                href={CONTACT.social.youtube}
                path="M23 12s0-3.4-.4-5c-.2-.9-.9-1.6-1.8-1.8C19.2 5 12 5 12 5s-7.2 0-8.8.2c-.9.2-1.6.9-1.8 1.8C1 8.6 1 12 1 12s0 3.4.4 5c.2.9.9 1.6 1.8 1.8 1.6.2 8.8.2 8.8.2s7.2 0 8.8-.2c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-5 .4-5ZM9.8 15.5v-7l6 3.5-6 3.5Z"
              />
              <SocialIcon
                label="The Achievers on TikTok"
                href={CONTACT.social.tiktok}
                path="M16.6 3c.4 2 1.8 3.6 3.9 3.8v3c-1.5 0-2.9-.5-3.9-1.3v6.4c0 3.4-2.6 6.1-5.9 6.1A5.9 5.9 0 0 1 4.8 15c0-3.4 2.6-6.1 5.9-6.1.3 0 .7 0 1 .1v3.1c-.3-.1-.6-.2-1-.2-1.6 0-2.9 1.4-2.9 3.1s1.3 3.1 2.9 3.1c1.7 0 2.9-1.3 2.9-3.1V3h3Z"
              />
            </div>
          </div>

          <nav className="ta-foot__col" aria-label="Explore">
            <h2>Explore</h2>
            <ul>
              {EXPLORE.map((l) => (
                <li key={l.to}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="ta-foot__col" aria-label="Courses">
            <h2>Courses</h2>
            <ul>
              {COURSE_LINKS.map((c) => (
                <li key={c}>
                  <Link to="/courses">{c}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ta-foot__col">
            <h2>Contact</h2>
            <ul className="ta-foot__contact">
              <li>
                <a href={CONTACT.primaryTel}>{CONTACT.primaryPhone} (Primary)</a>
              </li>
              <li className="ta-foot__muted">{CONTACT.secondaryPhones.join(' · ')}</li>
              <li>
                <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              </li>
              <li className="ta-foot__muted">Counselling: {CONTACT.hours}</li>
              <li>
                <a href={CONTACT.map} target="_blank" rel="noreferrer">
                  Open map — Puspalal Chowk centre
                </a>
              </li>
              <li>
                <a href={CONTACT.whatsapp} target="_blank" rel="noreferrer">
                  WhatsApp for instalments &amp; enquiries
                </a>
              </li>
              <li>
                <a href={CONTACT.androidApp} target="_blank" rel="noreferrer">
                  Android app
                </a>{' '}
                <span className="ta-foot__muted">· iOS coming soon</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="ta-foot__bar">
          <p>© {year} The Achievers Institute of Learning · Mahendranagar, Nepal</p>
          <ul aria-label="Legal">
            <li><Link to="/privacy">Privacy</Link></li>
            <li><Link to="/terms">Terms</Link></li>
            <li><Link to="/cookies">Cookies</Link></li>
          </ul>
        </div>
      </footer>
    </>
  )
}
