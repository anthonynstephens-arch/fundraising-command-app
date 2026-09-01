import Link from "next/link"
import {PublicHeader} from "@/components/public/PublicHeader"
import {PublicFooter} from "@/components/public/PublicFooter"
import ApplicationForm from "@/components/public/ApplicationForm"

export default function Page(){
  return <main className="pub-page">
    <PublicHeader/>
    <section className="apply-hero">
      <div className="apply-copy">
        <div className="pub-kicker">START A DEPARTMENT CAMPAIGN</div>
        <h1>Tell us the fundraiser. We’ll build the system around it.</h1>
        <p>For fire, police, EMS, public safety organizations, schools and nonprofits. We connect the products, storefront, contribution rules, reporting and department access so your team can focus on promoting the cause.</p>

        <div className="apply-benefits">
          <div><span>01</span><div><strong>Tell us what you want to run</strong><p>Breast Cancer Awareness, Movember, charity fundraiser, department store, or another campaign.</p></div></div>
          <div><span>02</span><div><strong>We build and connect it</strong><p>Products, branding, Shopify checkout, contribution rules, tracking and your department portal.</p></div></div>
          <div><span>03</span><div><strong>Your department gets one place to manage it</strong><p>Admins see sales, funds raised, orders, payouts and member access without touching the platform back end.</p></div></div>
        </div>

        <div className="apply-demo-link">
          <div><strong>Want to see it first?</strong><span>Open the working Breast Cancer Awareness department demo.</span></div>
          <Link href="/demo/breast-cancer-awareness">View BCA Demo →</Link>
        </div>
      </div>

      <div className="pub-apply-card">
        <div className="apply-form-head">
          <div className="pub-kicker">CAMPAIGN APPLICATION</div>
          <h2>Start your fundraiser</h2>
          <p>No obligation. Give us the basics and we’ll follow up to build the right program.</p>
        </div>
        <ApplicationForm/>
      </div>
    </section>
    <PublicFooter/>
  </main>
}