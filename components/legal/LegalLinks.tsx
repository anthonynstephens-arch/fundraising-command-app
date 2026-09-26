import Link from 'next/link'

export function LegalLinks() {
  return <nav className="fc-legal-links" aria-label="Legal"><Link href="/terms">Terms of Service</Link><Link href="/privacy">Privacy Policy</Link></nav>
}

export function LegalNotice({ action = 'continuing' }: { action?: string }) {
  return <p className="fc-legal-notice">By {action}, you agree to our <Link href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</Link>. Read our <Link href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</Link> to learn how we use your information.</p>
}
