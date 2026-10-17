import logo from '../../assets/logo/Milan_Secondary.svg'

const NAV_LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#about', label: 'About' },
  { href: '#mission', label: 'Mission' },
  { href: '#contacts', label: 'Contacts' },
]

const SOCIAL_LINKS = [
  { href: 'https://instagram.com/daysofmilan', label: 'Instagram' },
  { href: 'https://tiktok.com/@daysofmilan', label: 'TikTok' },
]

const YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="bg-night px-6 py-16 text-ivory">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        <div className="flex flex-col items-center justify-between gap-10 text-center md:flex-row md:text-left">
          <img src={logo} alt="Days of Milan" className="h-50 w-auto" />

          <div className="flex flex-col items-center gap-6 md:items-end md:text-end">
            <p className="max-w-md font-helvetica text-sm leading-relaxed text-ivory/60">
              A companion for anyone navigating Milan — thoughtful
              recommendations, local insights, and a sense of belonging for
              newcomers and long-timers alike.
            </p>

            <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 md:justify-end">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="font-helvetica text-xs font-bold uppercase tracking-[0.15em] text-ivory/70 transition-colors hover:text-sky"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-ivory/15 px-4 py-2 font-helvetica text-xs font-bold uppercase tracking-[0.15em] text-ivory/70 transition-colors hover:border-sky hover:text-sky"
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-ivory/10" />

        <p className="text-center font-helvetica text-xs uppercase tracking-[0.15em] text-ivory/40">
          &copy; {YEAR} Days of Milan. Made with love in Milan.
        </p>

        {/* required by the ODbL licence of the hero map's street data */}
        <p className="-mt-8 text-center font-helvetica text-[11px] text-ivory/30">
          Map data &copy;{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors hover:text-sky"
          >
            OpenStreetMap contributors
          </a>
        </p>
      </div>
    </footer>
  )
}
