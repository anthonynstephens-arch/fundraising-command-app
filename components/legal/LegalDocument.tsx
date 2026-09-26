import Link from 'next/link'
import { effectiveDate } from '@/lib/legal/policies'

export default function LegalDocument({ title, content }: { title: string; content: string }) {
  return <main className="fc-legal-page">
    <header><Link href="/">Fundraiser Command</Link><span>Detroit Decal &amp; Apparel, LLC</span></header>
    <article>
      <p className="fc-legal-eyebrow">POLICIES &amp; INFORMATION</p>
      <h1>{title}</h1><p className="fc-legal-date">Effective date: {effectiveDate}</p>
      <nav className="fc-legal-toc" aria-label="On this page">{content.split('\n\n').filter(block => block.startsWith('## ')).map((block) => {
        const heading = block.split('\n')[0].slice(3)
        return <a key={heading} href={`#section-${heading.split('.')[0]}`}>{heading}</a>
      })}</nav>
      {content.split('\n\n').map((block, index) => {
        if (block.startsWith('## ')) {
          const [heading, ...rest] = block.slice(3).split('\n')
          return <section key={index} id={`section-${heading.split('.')[0]}`}><h2>{heading}</h2>{rest.length > 0 && <p>{rest.join('\n')}</p>}</section>
        }
        if (block.startsWith('- ')) return <ul key={index}>{block.split('\n').map((line, i) => <li key={i}>{line.slice(2)}</li>)}</ul>
        return <p key={index}>{block}</p>
      })}
      <div className="fc-legal-contact"><a href="mailto:info@detroitdecalandapparel.com">Contact Fundraiser Command</a><Link href="/">Back to home</Link></div>
    </article>
  </main>
}
