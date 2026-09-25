import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { LandingHeader, CampaignPreview } from '@/components/marketing/LandingInteractions'
import s from '@/components/marketing/landing.module.css'

export const metadata: Metadata = {
  title: 'Fundraiser Command | Your cause. Our command center.',
  description: 'Launch a branded apparel fundraiser with storefront setup, production, fulfillment, campaign reporting, and payout visibility from Detroit Decal & Apparel.',
  alternates: { canonical: 'https://www.fundraisercommand.com' },
}
const steps = [
  ['Tell us your vision', 'Share your organization, your cause, and the dates you have in mind. We’ll help shape the right program.'],
  ['We build your campaign', 'Your branding, your products, your storefront. We connect the ordering experience and campaign reporting.'],
  ['Bring your people together', 'Share your campaign link. We handle production and fulfillment while you follow your progress.'],
]
const faqs = [
  ['Who is Fundraiser Command for?', 'Fire, police, EMS, public safety organizations, schools, nonprofits, and community groups. Tell us what you’re planning so we can help determine the right program.'],
  ['Do we need to build a website or manage inventory?', 'We set up your campaign storefront and products. Detroit Decal & Apparel handles production and fulfillment. Product options, delivery arrangements, and campaign details are confirmed during setup.'],
  ['How much does our organization earn?', 'Your campaign’s pricing and contribution structure are agreed during setup. Your dashboard shows campaign proceeds and payout history. The figures in the preview on this page are illustrative, not an earnings guarantee.'],
  ['Can we use our own logo and artwork?', 'Yes. Your campaign is built around your organization’s identity. Share your logo and artwork ideas with your application, and our team will help with the product direction.'],
  ['How do supporters place an order?', 'Supporters visit your campaign link, choose their products, and complete checkout through Shopify. Your organization can follow campaign orders and performance from its portal.'],
  ['What happens after we apply?', 'Our team reviews your application and follows up to discuss products, timing, branding, and campaign terms. Submitting an application is a no-obligation first step.'],
]
export default function Page() {
 return <div className={s.page}>
  <a className={s.skip} href="#main">Skip to content</a>
  <LandingHeader />
  <main id="main">
   <section className={s.hero}>
    <div className={s.wrap+' '+s.heroGrid}>
     <div className={s.heroCopy}>
      <div className={s.eyebrow}><span className={s.dot}/> YOUR CAUSE. OUR COMMAND CENTER.</div>
      <h1>Less to manage.<br/><span>More to make<br className={s.desktopBreak}/> possible.</span></h1>
      <p>A fundraiser your people will be proud to support. A storefront built for you. And one clear view of every order, every milestone, and every payout.</p>
      <div className={s.actions}><Link className={s.primary} href="/apply">Start your fundraiser <span aria-hidden="true">↗</span></Link><a className={s.secondary} href="#platform">Take a closer look <span aria-hidden="true">↓</span></a></div>
      <div className={s.finePrint}>No-obligation application <span aria-hidden="true">·</span> Hands-on help from a real team</div>
      <div className={s.heroTrust}><span className={s.trustMark} aria-hidden="true">✓</span><div><strong>Built by Detroit Decal & Apparel</strong><span>Firefighter-owned. Community-focused.</span></div></div>
     </div>
     <div className={s.heroVisual}><div className={s.previewLabel}><span>YOUR CAMPAIGN, AT A GLANCE</span><span className={s.demoBadge}>INTERACTIVE DEMO</span></div><CampaignPreview/><div className={s.visualCaption}><span aria-hidden="true">↖</span> Try the tabs. See how your campaign comes together.</div></div>
    </div>
   </section>
   <div className={s.audienceStrip}><div className={s.wrap}><span>BUILT AROUND YOUR PEOPLE</span><strong>Fire & EMS</strong><strong>Police</strong><strong>Schools</strong><strong>Nonprofits</strong><strong>Community groups</strong></div></div>
   <section id="platform" className={s.section}>
    <div className={s.wrap}>
     <div className={s.sectionHead}><div><p className={s.kicker}>ONE CONNECTED EXPERIENCE</p><h2>Everything behind<br/>a great fundraiser.</h2></div><p>Your supporters get a simple way to give back.<br/>Your team gets the clarity to keep things moving.</p></div>
     <div className={s.bento}>
      <article className={s.featureWide}><div className={s.featureText}><span className={s.featureNumber}>01 / THE STOREFRONT</span><h3>Your identity.<br/>A store of your own.</h3><p>Your logo, your message, and products your community wants to wear. A polished shopping experience from first click to Shopify checkout.</p><Link href="/fundraisers">Explore fundraiser stores <span aria-hidden="true">↗</span></Link></div><div className={s.storePreview}><div className={s.storeTop}><span>YOUR ORGANIZATION</span><span>YOUR CAUSE</span></div><div className={s.productPair}><div><Image src="/brand/macac/crewneck.webp" alt="Navy organization-branded crewneck example" width={360} height={420} sizes="(max-width: 700px) 40vw, 220px"/><span>Apparel with purpose</span></div><div><Image src="/brand/macac/cap.webp" alt="Organization-branded cap example" width={360} height={420} sizes="(max-width: 700px) 40vw, 220px"/><span>Details that represent</span></div></div><small>Example products from a managed organization store</small></div></article>
      <article className={s.featureDark}><span className={s.featureNumber}>02 / THE CLARITY</span><h3>Know where<br/>you stand.</h3><p>Sales, orders, campaign goals, and payout history. Organized in one dashboard, ready when your team needs an answer.</p><div className={s.reportingList}><span>Campaign performance <b>↗</b></span><span>Searchable orders <b>↗</b></span><span>PDF & CSV reporting <b>↗</b></span></div></article>
      <article className={s.featureSmall}><span className={s.featureNumber}>03 / THE SUPPORT</span><h3>A team behind<br/>your team.</h3><p>From artwork and products to production and fulfillment, Detroit Decal handles the work that makes your campaign possible.</p><div className={s.chips}><span>Setup</span><span>Production</span><span>Fulfillment</span></div></article>
      <article className={s.featureSmall}><span className={s.featureNumber}>04 / THE ACCESS</span><h3>Bring the right<br/>people in.</h3><p>Give your organizers the access they need with member roles. Keep your campaign team informed without sharing the store’s admin account.</p><div className={s.chips}><span>Member access</span><span>Campaign visibility</span></div></article>
     </div>
    </div>
   </section>
   <section id="how-it-works" className={s.processSection}><div className={s.wrap}><div className={s.centerHead}><p className={s.kicker}>FROM IDEA TO IMPACT</p><h2>You bring the cause.<br/>We bring the follow-through.</h2><p>A clear path from your first idea to a campaign your community can get behind.</p></div><div className={s.steps}>{steps.map(([title,copy],i)=><article key={title}><span>0{i+1}</span><h3>{title}</h3><p>{copy}</p></article>)}</div><div className={s.processAction}><Link className={s.primary} href="/apply">Let’s build your campaign <span aria-hidden="true">↗</span></Link></div></div></section>
   <section className={s.section}><div className={s.wrap}><div className={s.campaignFeature}><div><p className={s.kicker}>FEATURED CAMPAIGN · OCTOBER 2026</p><h2>A little pink.<br/>A powerful purpose.</h2><p>Bring your agency together for Breast Cancer Awareness Month with a coordinated storefront, campaign apparel, and the tools to track your progress.</p><div className={s.actions}><Link className={s.primary} href="/apply">Plan your BCA fundraiser <span aria-hidden="true">↗</span></Link><Link className={s.textLink} href="/demo/breast-cancer-awareness">Explore the BCA demo →</Link></div></div><div className={s.campaignAside}><span className={s.season}>OCTOBER</span><strong>Stand together.<br/>Wear your support.</strong><p>Your agency’s identity.<br/>A cause worth showing up for.</p><span className={s.pinkPill}>BREAST CANCER AWARENESS</span></div></div></div></section>
   <section id="questions" className={s.faqSection}><div className={s.wrap+' '+s.faqGrid}><div><p className={s.kicker}>A FEW THINGS TO KNOW</p><h2>Good questions.<br/>Clear answers.</h2><p>Every organization is different.<br/>We’ll help you work through the details.</p><Link className={s.textLink} href="/apply">Tell us what you have in mind →</Link></div><div className={s.faqList}>{faqs.map(([q,a])=><details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></div></section>
   <section className={s.finalSection}><div className={s.wrap}><p className={s.kicker}>YOUR NEXT CHAPTER STARTS HERE</p><h2>Give your cause<br/>a little more command.</h2><p>We’ll help you turn community support into a campaign you can run with confidence.</p><Link className={s.primary} href="/apply">Start your fundraiser <span aria-hidden="true">↗</span></Link><small>No-obligation application. A real conversation about your goals.</small></div></section>
  </main>
  <footer className={s.footer}><div className={s.wrap+' '+s.footerInner}><div><strong>Fundraiser Command</strong><p>Good causes. Great gear. One command center.</p><small>Powered by Detroit Decal & Apparel, LLC.</small></div><nav aria-label="Footer"><Link href="/fundraisers">Find a fundraiser</Link><Link href="/apply">Start a fundraiser</Link><Link href="/login">Organization login</Link></nav></div></footer>
 </div>
}
