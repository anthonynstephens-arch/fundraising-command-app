"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

const nav=[
  ["Overview","/portal","▦"],
  ["Sales","/portal/sales","⌑"],
  ["Orders","/portal/orders","◇"],
  ["Products","/portal/products","⬡"],
  ["Campaign Progress","/portal/progress","◎"],
  ["Payouts","/portal/payouts","▣"],
  ["Reports","/portal/reports","▤"],
  ["Marketing Tools","/portal/marketing","⌁"],
  ["Help","/portal/help","?"],
  ["Payout Assistant","/portal/payout-assistant","♙"],
  ["Account Settings","/portal/settings","⚙"],
]

export default function PortalShell({children,org,campaign,userEmail,organizationId,platform}:{children:React.ReactNode;org:any;campaign:any;userEmail:string;organizationId:string;platform:boolean}){
  const path=usePathname()
  const q="?org="+encodeURIComponent(organizationId)
  const campaignName=campaign?.name||"No active campaign"
  return <div className="agency-shell">
    <aside className="agency-sidebar">
      <div className="agency-wordmark"><strong>Fundraiser Command</strong><span>DETROIT DECAL & APPAREL</span></div>
      <nav>{nav.map(([label,href,icon])=>{
        const active=href==="/portal"?path==="/portal":path.startsWith(href)
        return <Link key={href} href={href+q} className={active?"active":""}><i>{icon}</i><span>{label}</span></Link>
      })}</nav>
      <div className="agency-side-bottom">
        <div className="agency-seal">{org.logo_url?<img src={org.logo_url} alt=""/>:<span>FC</span>}</div>
        <div className="agency-live"><b>● Live Data</b><span>Shopify connected</span></div>
        {platform&&<Link href="/dashboard">Platform Admin ↗</Link>}
      </div>
    </aside>

    <div className="agency-workspace">
      <header className="agency-topbar">
        <div className="agency-org">
          <div className="agency-org-logo">{org.logo_url?<img src={org.logo_url} alt=""/>:<span>FC</span>}</div>
          <div><strong>{org.name}</strong><span>Agency Portal</span></div>
        </div>
        <div className="agency-top-actions">
          <div className="agency-campaign-switch"><span>◎</span><div><strong>{campaignName}</strong><small>Active</small></div><b>SWITCH</b></div>
          <div className="agency-sync"><span>↻</span><div><small>LAST SYNCED</small><strong>Live</strong></div></div>
          <div className="agency-avatar">{(userEmail||"U").slice(0,2).toUpperCase()}</div>
        </div>
      </header>
      <main className="agency-content">{children}</main>
    </div>
  </div>
}