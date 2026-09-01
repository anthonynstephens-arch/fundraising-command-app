import Link from "next/link"
import { PublicHeader } from "@/components/public/PublicHeader"
import { PublicFooter } from "@/components/public/PublicFooter"

export default function Page(){
  return <main className="pub-page">
    <PublicHeader/>

    <section className="dept-hero">
      <div className="dept-hero-copy">
        <div className="pub-kicker">FUNDRAISING FOR FIRE · POLICE · EMS</div>
        <h1>Give your department a fundraiser that looks professional and runs itself.</h1>
        <p>We build the campaign store, connect the products, track every sale, calculate the department’s share, and give your admins a clean portal to follow everything without spreadsheets.</p>
        <div className="pub-actions">
          <Link href="/apply" className="pub-primary">Start a Department Fundraiser</Link>
          <Link href="/demo/breast-cancer-awareness" className="pub-secondary">View Breast Cancer Demo</Link>
        </div>
        <div className="dept-trust-row">
          <span>✓ Department-branded storefronts</span>
          <span>✓ Shopify checkout</span>
          <span>✓ Live sales & payout tracking</span>
          <span>✓ Member access controls</span>
        </div>
      </div>
      <div className="dept-hero-card">
        <div className="dept-card-top"><span>DEPARTMENT PORTAL</span><strong>Metro Public Safety</strong></div>
        <div className="dept-mini-stats">
          <div><span>Sales</span><strong>$8,460</strong></div>
          <div><span>Raised</span><strong>$1,692</strong></div>
          <div><span>Orders</span><strong>214</strong></div>
        </div>
        <div className="dept-mini-progress"><div style={{width:"68%"}}/></div>
        <small>68% of fundraising goal</small>
        <div className="dept-mini-list">
          <div><span>BCA Awareness Tee</span><strong>96 sold</strong></div>
          <div><span>BCA Hoodie</span><strong>54 sold</strong></div>
          <div><span>Duty Shirt - Pink Crest</span><strong>38 sold</strong></div>
        </div>
        <Link href="/demo/breast-cancer-awareness">Open the live demo →</Link>
      </div>
    </section>

    <section className="dept-section">
      <div className="dept-section-head">
        <div><div className="pub-kicker">WHY DEPARTMENTS USE IT</div><h2>One system from launch to payout.</h2></div>
        <p>Your committee should be focused on the cause, not reconciling orders, chasing totals, or trying to figure out who gets what.</p>
      </div>
      <div className="dept-feature-grid">
        <article><span>01</span><h3>Branded Campaign Store</h3><p>A department-specific fundraiser page with your campaign, products, messaging, and shareable link.</p></article>
        <article><span>02</span><h3>Automatic Sales Tracking</h3><p>Orders and eligible fundraiser sales stay connected so totals do not have to be rebuilt by hand.</p></article>
        <article><span>03</span><h3>Contribution Accounting</h3><p>Fixed-dollar or percentage contributions can be tracked by product while preserving the original contribution on each order.</p></article>
        <article><span>04</span><h3>Department Admin Portal</h3><p>Authorized department users can see campaigns, orders, payouts, progress, and the information relevant to their organization.</p></article>
        <article><span>05</span><h3>Member Access</h3><p>Assign Owners, Admins, Managers, and Viewers so the right people have the right level of access.</p></article>
        <article><span>06</span><h3>Payout Visibility</h3><p>Your department can see what has been raised, what is pending, and what has already been paid.</p></article>
      </div>
    </section>

    <section className="dept-demo-strip">
      <div>
        <div className="pub-kicker">SEE THE DEPARTMENT SIDE</div>
        <h2>Breast Cancer Awareness fundraiser demo</h2>
        <p>See exactly what a department administrator would see: sales, products, orders, marketing tools, payouts, and member roles.</p>
      </div>
      <Link href="/demo/breast-cancer-awareness" className="pub-primary">Explore the Demo</Link>
    </section>

    <section className="dept-section">
      <div className="dept-section-head">
        <div><div className="pub-kicker">HOW IT WORKS</div><h2>Simple for the department.</h2></div>
      </div>
      <div className="pub-how-grid">
        <div><span>01</span><h3>Tell us the campaign</h3><p>Your cause, timing, products, goals, and department branding.</p></div>
        <div><span>02</span><h3>We build the system</h3><p>The fundraiser, product rules, storefront, and tracking are connected.</p></div>
        <div><span>03</span><h3>Your department promotes it</h3><p>Share one campaign link through social media, email, QR codes, and station outreach.</p></div>
        <div><span>04</span><h3>Track results live</h3><p>Department admins can follow sales, funds raised, orders, and payouts in their portal.</p></div>
      </div>
    </section>

    <section className="dept-role-band">
      <div><div className="pub-kicker">ACCESS THAT MAKES SENSE</div><h2>Not everyone needs the keys to everything.</h2><p>Platform controls stay with us. Your department sees only its own organization and the tools its users are allowed to access.</p></div>
      <div className="dept-role-grid">
        <div><strong>Owner</strong><span>Full department control</span></div>
        <div><strong>Admin</strong><span>Members, campaigns, reporting</span></div>
        <div><strong>Manager</strong><span>Campaign operations</span></div>
        <div><strong>Viewer</strong><span>Read-only visibility</span></div>
      </div>
    </section>

    <section className="dept-final-cta">
      <div><div className="pub-kicker">READY TO BUILD YOURS?</div><h2>Turn your next fundraiser into a system your department can actually manage.</h2><p>Start with Breast Cancer Awareness, Movember, a charity campaign, or an ongoing department store.</p></div>
      <Link href="/apply" className="pub-primary">Start My Department Fundraiser</Link>
    </section>

    <PublicFooter/>
  </main>
}