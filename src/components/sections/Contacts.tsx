import { useState, type FormEvent } from 'react'

const TO_ADDRESS = 'daysofmilan'

const SOCIAL_LINKS = [
  { href: 'https://instagram.com/daysofmilan', label: 'Instagram' },
  { href: 'https://tiktok.com/@daysofmilan', label: 'TikTok' },
]

const AUDIENCES = ['A brand', 'A talent', 'An agency'] as const
type Audience = (typeof AUDIENCES)[number]

const LABEL_CLASS =
  'font-helvetica text-xs font-bold uppercase tracking-[0.15em] text-night/70'
const FIELD_CLASS =
  'w-full rounded-lg border border-night/15 bg-ivory px-4 py-3 font-helvetica text-sm text-night placeholder:text-night/40 transition-colors focus:border-merlot focus:outline-none focus:ring-1 focus:ring-merlot'

export default function Contacts() {
  const [from, setFrom] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState<Audience | null>(null)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const header = [
      from && `From: ${from}`,
      audience && `I'm ${audience.toLowerCase()}`,
    ]
      .filter(Boolean)
      .join('\n')
    const body = header ? `${header}\n\n${message}` : message
    const mailto = `mailto:${TO_ADDRESS}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
  }

  return (
    <section
      id="contacts"
      className="flex min-h-screen flex-col overflow-x-clip bg-linear-to-b from-sky to-ivory px-6 pt-24"
    >
      {/* night panel runs flush to the section's bottom edge, straight into
          the night footer below. The before/after squares sit just outside
          its bottom corners: night fill with a quarter-circle cut out, so the
          panel's sides flare outward into the footer instead of meeting it at
          a hard 90°. max-w-7xl = same 80rem content width as About/Guides. */}
      <div className="relative mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 content-center gap-12 rounded-t-4xl bg-night px-6 py-16 before:absolute before:bottom-0 before:right-full before:h-8 before:w-8 before:bg-[radial-gradient(circle_at_0_0,transparent_2rem,var(--color-night)_calc(2rem_+_0.5px))] before:content-[''] after:absolute after:bottom-0 after:left-full after:h-8 after:w-8 after:bg-[radial-gradient(circle_at_100%_0,transparent_2rem,var(--color-night)_calc(2rem_+_0.5px))] after:content-[''] sm:px-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-24 lg:px-16">
        <div className="flex flex-col justify-center gap-6 text-center lg:text-left">
          <p className="font-helvetica text-sm font-bold uppercase tracking-[0.2em] text-ivory/60">
            Get in Touch
          </p>
          <h2 className="font-kopiku text-4xl uppercase text-ivory sm:text-5xl">
            Say hi
          </h2>
          <p className="mx-auto max-w-md font-helvetica text-base leading-relaxed text-ivory/80 lg:mx-0">
            Got a hidden gem, a question about the city, or an idea to
            work together? Drop us a line — we read everything and
            reply as soon as we can.
          </p>

          <div className="mx-auto h-px w-16 bg-sky lg:mx-0" />

          <div className="flex flex-col items-center gap-3 lg:items-start">
            <p className="font-helvetica text-xs font-bold uppercase tracking-[0.15em] text-ivory/60">
              Follow along
            </p>
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

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-2xl bg-ivory border-2 border-white/20 p-6 text-left sm:p-10"
        >
          <fieldset className="mb-2 border-b border-night/10 pb-7">
            <legend className="sr-only">Are you a brand, a talent or an agency?</legend>
            <p className="font-helvetica text-base leading-relaxed text-night/80">
              Let's make something good together. First things first, tell
              us who we're chatting with.
            </p>
            <p aria-hidden="true" className={`${LABEL_CLASS} mt-5`}>
              Are you
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {AUDIENCES.map((option) => (
                <label key={option} className="cursor-pointer">
                  <input
                    type="radio"
                    name="audience"
                    value={option}
                    checked={audience === option}
                    onChange={() => setAudience(option)}
                    className="peer sr-only"
                  />
                  <span className="block rounded-full border border-night/20 px-5 py-2.5 font-helvetica text-xs font-bold uppercase tracking-[0.15em] text-night transition-colors hover:border-merlot hover:text-merlot peer-checked:border-merlot peer-checked:bg-merlot peer-checked:text-ivory peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-merlot">
                    {option}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <label htmlFor="contact-from" className={LABEL_CLASS}>
              Your email
            </label>
            <input
              id="contact-from"
              type="email"
              required
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="you@example.com"
              className={FIELD_CLASS}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="contact-subject" className={LABEL_CLASS}>
              Subject
            </label>
            <input
              id="contact-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="What's on your mind?"
              className={FIELD_CLASS}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="contact-message" className={LABEL_CLASS}>
              Message
            </label>
            <textarea
              id="contact-message"
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us a bit more…"
              className={`${FIELD_CLASS} resize-none`}
            />
          </div>

          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              className="w-full rounded-full bg-merlot px-8 py-3 font-helvetica text-xs font-bold uppercase tracking-[0.2em] text-ivory transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-merlot focus-visible:ring-offset-2 focus-visible:ring-offset-sky/25 sm:w-auto"
            >
              Send message
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
