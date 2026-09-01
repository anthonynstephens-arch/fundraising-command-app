import Link from "next/link"
import { PublicHeader } from "@/components/public/PublicHeader"
import { PublicFooter } from "@/components/public/PublicFooter"

export default function Page(){
  return <main className="bca-landing">
    <PublicHeader/>

    <section className="bca-land-hero bca-land-hero-v2">
      <div className="bca-land-hero-copy">
        <div className="bca-land-badge">BREAST CANCER AWARENESS · OCTOBER 2026</div>
        <h1>Run a better <span>Breast Cancer Awareness</span> fundraiser.</h1>
        <p>Give your agency a polished storefront, great campaign products, Shopify checkout, live fundraising data, member access, reporting, and payout visibility — all built for you.</p>

        <div className="bca-land-actions">
          <Link href="/apply" className="bca-land-primary">Start Our BCA Campaign</Link>
          <Link href="/demo/breast-cancer-awareness" className="bca-land-secondary">View Agency Demo</Link>
        </div>

        <div className="bca-land-hero-points">
          <div><b>✓</b><span>Done-for-you setup</span></div>
          <div><b>✓</b><span>Agency-branded storefront</span></div>
          <div><b>✓</b><span>Live Shopify-backed reporting</span></div>
        </div>
      </div>

      <div className="bca-land-hero-visual bca-land-hero-visual-v2">
        <div className="bca-land-dashboard bca-land-dashboard-v2">
          <div className="bca-land-dashboard-top">
            <div><small>METRO PUBLIC SAFETY</small><strong>October BCA Campaign</strong></div>
            <span>LIVE</span>
          </div>
          <div className="bca-land-mini-kpis">
            <div><span>Gross Sales</span><strong>$8,460</strong></div>
            <div><span>Raised</span><strong>$1,692</strong></div>
            <div><span>Orders</span><strong>214</strong></div>
          </div>
          <div className="bca-land-progress-head"><span>Fundraising Goal</span><b>68%</b></div>
          <div className="bca-land-progress"><i style={{width:"68%"}}/></div>
          <div className="bca-land-mini-orders">
            <div><span>BCA Awareness Tee</span><b>96 sold</b></div>
            <div><span>BCA Hoodie</span><b>54 sold</b></div>
            <div><span>Pink Crest Duty Shirt</span><b>38 sold</b></div>
          </div>
          <Link href="/demo/breast-cancer-awareness" className="bca-land-card-link">Open the department demo →</Link>
        </div>
        <div className="bca-land-ribbon-v2">BCA</div>
      </div>
    </section>

    <section className="bca-land-strip">
      <div><strong>Built for agencies</strong><span>Fire · Police · EMS · Public Safety</span></div>
      <div><strong>One campaign link</strong><span>Easy to share everywhere</span></div>
      <div><strong>Real admin portal</strong><span>Sales · Orders · Reports · Payouts</span></div>
      <div><strong>No spreadsheet mess</strong><span>Campaign accounting stays organized</span></div>
    </section>


    <section className="bca-land-visual-showcase">
      <div className="bca-land-showcase-copy">
        <span>LOOKS LIKE A REAL CAMPAIGN</span>
        <h2>Your agency gets more than a link.</h2>
        <p>Campaign products, department-ready graphics, QR promotion, milestone posts, and a storefront that all look like they belong together.</p>
        <div className="bca-land-showcase-points"><b>Agency branded</b><b>Ready to share</b><b>Built for October</b></div>
      </div>

      <div className="bca-land-graphic-wall">
        <div className="bca-land-poster">
          <small>METRO PUBLIC SAFETY</small>
          <strong>BREAST CANCER<br/>AWARENESS</strong>
          <span>OCTOBER 2026</span>
          <div className="bca-land-poster-ribbon">BCA</div>
          <em>SHOP · SUPPORT · SHARE</em>
        </div>

        <div className="bca-land-shirt-card">
          <div className="bca-land-shirt">
            <i className="left"/><i className="right"/>
            <div><small>MPS</small><b>BCA</b><span>2026</span></div>
          </div>
          <strong>Campaign Apparel</strong>
          <span>Built around your agency</span>
        </div>

        <div className="bca-land-qr-card">
          <div className="bca-land-qr-faux">
            {Array.from({length:49}).map((_,i)=><i key={i} className={(i%3===0||i%7===0||i%8===1)?"on":""}/>)}
          </div>
          <strong>SCAN TO SUPPORT</strong>
          <span>Tracked campaign QR</span>
        </div>

        <div className="bca-land-milestone-card">
          <small>CAMPAIGN MILESTONE</small>
          <strong>75%</strong>
          <span>OF GOAL</span>
          <div><i style={{width:"75%"}}/></div>
          <b>KEEP IT GOING</b>
        </div>
      </div>
    </section>

    <section className="bca-land-section">
      <div className="bca-land-section-head">
        <div><span>MORE THAN A SHIRT FUNDRAISER</span><h2>Everything your department needs to run October professionally.</h2></div>
        <p>Your supporters see a clean campaign experience. Your department admins get the tools behind it.</p>
      </div>

      <div className="bca-land-feature-grid">
        <article><b>01</b><h3>Agency-Branded Storefront</h3><p>Your logo, campaign message, products, and public campaign link — built around your department.</p></article>
        <article><b>02</b><h3>Products People Want</h3><p>Awareness tees, hoodies, duty-friendly options, decals, patches, and more.</p></article>
        <article><b>03</b><h3>Shopify Checkout</h3><p>Real checkout and order flow with campaign attribution behind the scenes.</p></article>
        <article><b>04</b><h3>Live Department Dashboard</h3><p>Sales, orders, product performance, goal tracking, and fundraising proceeds in one place.</p></article>
        <article><b>05</b><h3>Member Access</h3><p>Owners, Admins, Managers, and Viewers get the access appropriate for their role.</p></article>
        <article><b>06</b><h3>Reports & Payouts</h3><p>CSV/PDF reporting, payout history, and clear visibility into what your campaign has earned.</p></article>
      </div>
    </section>

    <section className="bca-land-demo bca-land-demo-v2">
      <div className="bca-land-demo-copy">
        <span>SEE THE DEPARTMENT SIDE</span>
        <h2>This is what your campaign admins actually get.</h2>
        <p>Not a fake storefront dashboard. A real agency portal designed around the day-to-day questions your committee will actually have.</p>
        <div className="bca-land-demo-list">
          <span>✓ Sales analytics</span><span>✓ Searchable orders</span><span>✓ Product performance</span><span>✓ Goal tracking</span>
          <span>✓ Payout visibility</span><span>✓ PDF / CSV reports</span><span>✓ QR marketing tools</span><span>✓ Member roles</span>
        </div>
        <Link href="/demo/breast-cancer-awareness" className="bca-land-primary">Explore the Full BCA Demo</Link>
      </div>

      <div className="bca-land-screen">
        <div className="bca-land-screen-sidebar">
          <strong>Fundraiser Command</strong><span className="active">Overview</span><span>Sales</span><span>Orders</span><span>Products</span><span>Progress</span><span>Payouts</span><span>Reports</span><span>Marketing</span>
        </div>
        <div className="bca-land-screen-main">
          <div className="bca-land-screen-title"><div><small>METRO PUBLIC SAFETY</small><strong>Campaign Overview</strong></div><em>October 2026</em></div>
          <div className="bca-land-screen-kpis"><div><span>Sales</span><b>$8,460</b></div><div><span>Raised</span><b>$1,692</b></div><div><span>Orders</span><b>214</b></div><div><span>Goal</span><b>68%</b></div></div>
          <div className="bca-land-screen-chart"><div className="bca-land-screen-chart-line"/></div>
        </div>
      </div>
    </section>

    <section className="bca-land-section bca-land-how">
      <div className="bca-land-section-head"><div><span>HOW IT WORKS</span><h2>We build it. Your agency shares it. The system tracks it.</h2></div></div>
      <div className="bca-land-steps">
        <div><b>1</b><h3>Tell us about your campaign</h3><p>Agency, dates, campaign goal, product direction, and fundraiser structure.</p></div>
        <div><b>2</b><h3>We build everything</h3><p>Storefront, products, contribution rules, Shopify connection, and portal access.</p></div>
        <div><b>3</b><h3>You share one link</h3><p>Social, email, QR codes, flyers, station signage, and community outreach.</p></div>
        <div><b>4</b><h3>Track results live</h3><p>Your admins can see exactly how the fundraiser is performing.</p></div>
      </div>
    </section>

    <section className="bca-land-final">
      <div><span>BREAST CANCER AWARENESS MONTH 2026</span><h2>Make your October fundraiser look as organized as your agency.</h2><p>We&apos;ll build the campaign. Your department gets the storefront, the products, and the system behind it.</p></div>
      <div className="bca-land-final-actions"><Link href="/apply" className="bca-land-primary">Start Our Campaign</Link><Link href="/demo/breast-cancer-awareness" className="bca-land-dark-outline">View the Demo</Link></div>
    </section>

    <PublicFooter/>
  </main>
}
