"use client"
import Link from "next/link"
import { usePathname,useRouter } from "next/navigation"

const nav=[
  ["Overview","/portal","▦"],["Sales","/portal/sales","⌑"],["Orders","/portal/orders","◇"],["Products","/portal/products","⬡"],
  ["Campaign Progress","/portal/progress","◎"],["Payouts","/portal/payouts","▣"],["Reports","/portal/reports","▤"],["Marketing Tools","/portal/marketing","⌁"],
  ["Help","/portal/help","?"],["Account Settings","/portal/settings","⚙"],
]

export default function PortalShell({children,org,campaign,campaigns,userEmail,organizationId,platform,lastSynced}:{children:React.ReactNode;org:any;campaign:any;campaigns:any[];userEmail:string;organizationId:string;platform:boolean;lastSynced?:string|null}){
  const path=usePathname()
  const router=useRouter()
  const baseQ=new URLSearchParams({org:organizationId})
  if(campaign?.id) baseQ.set("campaign",campaign.id)
  const q="?"+baseQ.toString()

  function switchCampaign(id:string){
    const p=new URLSearchParams({org:organizationId,campaign:id})
    router.push(path+"?"+p.toString())
    router.refresh()
  }

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
          <label className="agency-campaign-switch">
            <span>◎</span>
            <div><strong>{campaign?.name||"No active campaign"}</strong><small>{campaign?.status||"None"}</small></div>
            <select aria-label="Switch campaign" value={campaign?.id||""} onChange={e=>switchCampaign(e.target.value)}>
              {campaigns.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <b>SWITCH</b>
          </label>
          <div className="agency-sync"><span>↻</span><div><small>LAST SYNCED</small><strong>{lastSynced?new Date(lastSynced).toLocaleString():"No webhook yet"}</strong></div></div>
          <div className="agency-avatar" title={userEmail}>{(userEmail||"U").slice(0,2).toUpperCase()}</div>
        </div>
      </header>
      <main className="agency-content">{children}</main>
    </div>
  </div>
}