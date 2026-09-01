import Link from "next/link"
import { PublicHeader } from "@/components/public/PublicHeader"
import { PublicFooter } from "@/components/public/PublicFooter"

export default function Page(){
  return <main className="bca-landing">
    <PublicHeader/>

    <section className="bca-land-hero">
      <div className="bca-land-glow bca-land-glow-one"/>
      <div className="bca-land-glow bca-land-glow-two"/>

      <div className="bca-land-hero-copy">
        <div className="bca-land-badge">OCTOBER · BREAST CANCER AWARENESS MONTH</div>
        <h1>Turn your agency&apos;s October fundraiser into something people actually want to buy from.</h1>
        <p>We build the branded storefront, campaign products, Shopify checkout, live sales tracking, member access, fundraising accounting, and payout visibility — so your department can focus on the cause.</p>

        <div className="bca-land-actions">
          <Link href="/apply" className="bca-land-primary">Launch Our BCA Fundraiser</Link>
          <Link href="/demo/breast-cancer-awareness" className="bca-land-secondary">See the Department Demo</Link>
        </div>

        <div className="bca-land-proof">
          <span>Fire</span><i>•</i><span>Police</span><i>•</i><span>EMS</span><i>•</i><span>Public Safety</span><i>•</i><span>Community Agencies</span>
        </div>
      </div>

      <div className="bca-land-hero-visual">
        <div className="bca-land-ribbon">BCA</div>
        <div className="bca-land-dashboard">
          <div className="bca-land-dashboard-top">
            <div>
              <small>METRO PUBLIC SAFETY</small>
              <strong>October Awareness Campaign</strong>
            </div>
            <span>LIVE</span>
          </div>
          <div className="bca-land-mini-kpis">
            <div><span>Sales</span><strong>$8,460</strong></div>
            <div><span>Raised</span><strong>$1,692</strong></div>
            <div><span>Orders</span><strong>214</strong></div>
          </div>
          <div className="bca-land-progress-head"><span>Fundraising Goal</span><b>68%</b></div>
          <div className="bca-land-progress"><i style={{width:"68%"}}/></div>
          <div className="bca-land-mini-orders">
            <div><span>#1048 · BCA Awareness Tee</span><b>$6.40 raised</b></div>
            <div><span>#1047 · BCA Hoodie</span><b>$10.40 raised</b></div>
            <div><span>#1046 · Pink Crest Duty Shirt</span><b>$7.60 raised</b></div>
          </div>
        </div>
      </div>
    </section>

    <section className="bca-land-strip">
      <div><strong>One campaign link.</strong><span>Share it everywhere.</span></div>
      <div><strong>Live department portal.</strong><span>Track everything.</span></div>
      <div><strong>Clear payout visibility.</strong><span>No spreadsheet guessing.</span></div>
      <div><strong>Built around your agency.</strong><span>Not a generic fundraiser.</span></div>
    </section>

    <section className="bca-land-section">
      <div className="bca-land-section-head">
        <div>
          <span>WHY THIS WORKS</span>
          <h2>Your fundraiser should feel like your department — not a random merch link.</h2>
        </div>
        <p>We combine agency-branded products with the same backend structure you would expect from a real campaign platform: sales tracking, fundraising rules, order visibility, access control, reporting, and payouts.</p>
      </div>

      <div className="bca-land-feature-grid">
        <article>
          <b>01</b>
          <h3>Branded BCA Storefront</h3>
          <p>Your agency gets a polished October campaign page with its own branding, messaging, products, and shareable link.</p>
        </article>
        <article>
          <b>02</b>
          <h3>Products People Want</h3>
          <p>Awareness tees, hoodies, duty-friendly designs, decals, patches, and more — without making the campaign look cheap.</p>
        </article>
        <article>
          <b>03</b>
          <h3>Real Shopify Checkout</h3>
          <p>Supporters buy through a real commerce flow while orders and eligible fundraiser items are tracked behind the scenes.</p>
        </article>
        <article>
          <b>04</b>
          <h3>Department Admin Portal</h3>
          <p>Your authorized users can see sales, products, orders, fundraising progress, marketing tools, reports, and payouts.</p>
        </article>
        <article>
          <b>05</b>
          <h3>Member Access</h3>
          <p>Owners, Admins, Managers, and Viewers each get the access level that makes sense for the department.</p>
        </article>
        <article>
          <b>06</b>
          <h3>Fundraising Accountability</h3>
          <p>Contribution rules stay attached to campaign products and orders so your numbers are not rebuilt manually later.</p>
        </article>
      </div>
    </section>

    <section className="bca-land-demo">
      <div className="bca-land-demo-copy">
        <span>SEE WHAT YOUR DEPARTMENT GETS</span>
        <h2>A real admin portal, not just a checkout page.</h2>
        <p>The department side gives your team visibility into campaign sales, Shopify orders, product performance, fundraising progress, payouts, reports, QR tools, and member access.</p>
        <div className="bca-land-demo-list">
          <span>✓ Sales analytics</span>
          <span>✓ Searchable orders</span>
          <span>✓ Product performance</span>
          <span>✓ Goal tracking</span>
          <span>✓ Payout ledger</span>
          <span>✓ PDF / CSV reports</span>
          <span>✓ QR marketing tools</span>
          <span>✓ Department roles</span>
        </div>
        <Link href="/demo/breast-cancer-awareness" className="bca-land-primary">Explore the BCA Demo</Link>
      </div>

      <div className="bca-land-screen">
        <div className="bca-land-screen-sidebar">
          <strong>Fundraiser Command</strong>
          <span className="active">Overview</span>
          <span>Sales</span>
          <span>Orders</span>
          <span>Products</span>
          <span>Campaign Progress</span>
          <span>Payouts</span>
          <span>Reports</span>
          <span>Marketing Tools</span>
        </div>
        <div className="bca-land-screen-main">
          <div className="bca-land-screen-title"><div><small>METRO PUBLIC SAFETY</small><strong>Campaign Overview</strong></div><em>October 2026</em></div>
          <div className="bca-land-screen-kpis">
            <div><span>Gross Sales</span><b>$8,460</b></div>
            <div><span>Raised</span><b>$1,692</b></div>
            <div><span>Orders</span><b>214</b></div>
            <div><span>Goal</span><b>68%</b></div>
          </div>
          <div className="bca-land-screen-chart">
            <div className="bca-land-screen-chart-line"/>
          </div>
        </div>
      </div>
    </section>

    <section className="bca-land-section bca-land-how">
      <div className="bca-land-section-head">
        <div>
          <span>HOW IT WORKS</span>
          <h2>We build it. Your agency promotes it. The system keeps it organized.</h2>
        </div>
      </div>

      <div className="bca-land-steps">
        <div><b>1</b><h3>Tell us the campaign</h3><p>Your agency, dates, goal, product direction, and how you want the fundraiser structured.</p></div>
        <div><b>2</b><h3>We build the storefront</h3><p>Products, branding, contribution rules, checkout, campaign tracking, and department access are connected.</p></div>
        <div><b>3</b><h3>You share one link</h3><p>Promote through social media, email, QR codes, station signage, and your community.</p></div>
        <div><b>4</b><h3>Track the campaign live</h3><p>Your admins can see sales, progress, orders, fundraising proceeds, and payouts in one place.</p></div>
      </div>
    </section>

    <section className="bca-land-compare">
      <div className="bca-land-compare-col bad">
        <span>THE OLD WAY</span>
        <h3>Fundraiser chaos</h3>
        <p>Spreadsheets, group texts, scattered order totals, unclear payout math, and nobody really knowing where things stand.</p>
      </div>
      <div className="bca-land-compare-vs">VS</div>
      <div className="bca-land-compare-col good">
        <span>FUNDRAISER COMMAND</span>
        <h3>One clean campaign system</h3>
        <p>A branded storefront, real order sync, live reporting, department access, contribution tracking, and payout visibility.</p>
      </div>
    </section>

    <section className="bca-land-final">
      <div>
        <span>OCTOBER IS COMING</span>
        <h2>Make this year&apos;s Breast Cancer Awareness fundraiser look like your agency actually planned it.</h2>
        <p>Launch a campaign your members are proud to share and your admins can actually manage.</p>
      </div>
      <div className="bca-land-final-actions">
        <Link href="/apply" className="bca-land-primary">Start Our BCA Fundraiser</Link>
        <Link href="/demo/breast-cancer-awareness" className="bca-land-dark-outline">View the Demo</Link>
      </div>
    </section>

    <PublicFooter/>
  </main>
}
