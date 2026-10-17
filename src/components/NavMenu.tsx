import { useState } from 'react'
import logo from '../assets/logo/Milan_Primary.svg'

const NAV_LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#about', label: 'About' },
  { href: '#mission', label: 'Mission' },
  { href: '#contacts', label: 'Contacts' },
]

const BAR_WIDTHS = ['w-3.5', 'w-5', 'w-6.5', 'w-5', 'w-3.5']
const PANEL_BAR_WIDTHS = ['62%', '80%', '100%', '80%', '62%']

export default function NavMenu() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        className="fixed right-6 top-6 z-210 flex h-11 w-11 flex-col items-end justify-center gap-1.5 cursor-pointer"
      >
        {BAR_WIDTHS.map((width, i) => (
          <span
            key={i}
            className={`h-0.5 rounded-full bg-night ${width}`}
          />
        ))}
      </button>

      <div
        className={`fixed inset-0 z-200 overflow-hidden ${
          open ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div
          className={`absolute inset-0 bg-sky transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {PANEL_BAR_WIDTHS.map((width, i) => {
          const link = i > 0 ? NAV_LINKS[i - 1] : null

          return (
            <div
              key={i}
              className={`absolute right-0 flex h-1/5 items-center justify-end bg-ivory transition-transform ease-out ${
                i < PANEL_BAR_WIDTHS.length - 1 ? 'border-b border-night/10' : ''
              }`}
              style={{
                top: `${i * 20}%`,
                width,
                transform: open ? 'translateX(0)' : 'translateX(100vw)',
                transitionDuration: '550ms',
                transitionDelay: `${i * 60}ms`,
              }}
            >
              <div
                className={`pr-20 transition-opacity duration-300 sm:pr-32 ${
                  open ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ transitionDelay: open ? '350ms' : '0ms' }}
              >
                {link ? (
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="font-kopiku text-4xl uppercase text-merlot transition-colors hover:text-night sm:text-5xl"
                  >
                    {link.label}
                  </a>
                ) : (
                  <img src={logo} alt="Days of Milan" className="h-10 w-auto" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
