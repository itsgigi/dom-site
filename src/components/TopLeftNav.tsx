import SiteLink from './SiteLink'

const LINKS = [
  { href: '/blog', label: 'Blog' },
  { href: 'https://instagram.com/daysofmilan', label: 'Instagram' },
  { href: 'https://nightsofmilan.com', label: 'Nights' },
  { href: '#contacts', label: 'Get in Touch' },
]

export default function TopLeftNav() {
  return (
    <nav className="absolute top-6 z-210 hidden gap-6 md:flex" style={{ left: 'max(2.5rem, calc((100vw - 80rem) / 2))' }}>
      {LINKS.map((link) => (
        <SiteLink
          key={link.label}
          href={link.href}
          className="font-kopiku text-xs font-bold uppercase tracking-[0.15em] text-night transition-colors hover:text-merlot"
        >
          {link.label}
        </SiteLink>
      ))}
    </nav>
  )
}
