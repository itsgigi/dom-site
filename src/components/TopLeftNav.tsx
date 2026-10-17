const LINKS = [
  { href: 'https://instagram.com/daysofmilan', label: 'Instagram', external: true },
  { href: 'https://nightsofmilan.com', label: 'Nights', external: true },
  { href: '#contacts', label: 'Get in Touch', external: false },
]

export default function TopLeftNav() {
  return (
    <nav className="absolute top-6 z-210 hidden gap-6 md:flex" style={{ left: 'min(80rem, calc(17vw - 5rem))' }}>
      {LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          {...(link.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className="font-kopiku text-xs font-bold uppercase tracking-[0.15em] text-night transition-colors hover:text-merlot"
        >
          {link.label}
        </a>
      ))}
    </nav>
  )
}
