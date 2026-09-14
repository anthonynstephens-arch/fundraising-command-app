"use client"
import { stationNavigation } from '@/lib/portal/context'
import Link from "next/link"
import { usePathname,useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const nav=[
  ["Overview","/portal","▦"],["Sales","/portal/sales","⌑"],["Orders","/portal/orders","◇"],["Products","/portal/products","⬡"],
  ["Campaign Progress","/portal/progress","◎"],["Payouts","/portal/payouts","▣"],["Reports","/portal/reports","▤"],["Marketing Tools","/portal/marketing","⌁"],
  ["Help","/portal/help","?"],["Account Settings","/portal/settings","⚙"],
]

export default function PortalShell({children,org,campaign,campaigns,userEmail,organizationId,platform,lastSynced,pinAccess=false}:{children:React.ReactNode;org:any;campaign:any;campaigns:any[];userEmail:string;organizationId:string;platform:boolean;lastSynced?:string|null;pinAccess?:boolean}){
  const path=usePathname()
  const router=useRouter()
  const stationMode = org.organization_type === "detroit_fire_station" || path.startsWith("/station")
  const stationHome = organizationId ? "/station/" + organizationId : "/station"
  const navigation = stationMode ? (organizationId ? stationNavigation(organizationId) : [["All Stations", "/station", "⌂"]]) : nav
  function destination(href: string) {
    if(!stationMode || !href.startsWith('/station')) return href + q
    if(href === '/station' || href === stationHome || href.includes('#')) return href
    return href + (campaign?.id ? '?campaign=' + encodeURIComponent(campaign.id) : '')
  }
  const baseQ=new URLSearchParams({org:organizationId})
  if(campaign?.id) baseQ.set("campaign",campaign.id)
  const q="?"+baseQ.toString()

  function switchCampaign(id:string){
    const p=new URLSearchParams({org:organizationId,campaign:id})
    router.push(stationMode ? (path === stationHome ? stationHome + '/products' : path) + '?campaign=' + encodeURIComponent(id) : path + '?' + p.toString())
    router.refresh()
  }

  async function signOut(){
    await fetch("/api/pin-session",{method:"DELETE"})
    if(!pinAccess) await createClient().auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return <div className="agency-shell">
    <aside className="agency-sidebar">
      <div className="agency-wordmark"><strong>{stationMode ? "Firestation Command" : "Fundraiser Command"}</strong><span>DETROIT DECAL & APPAREL</span></div>
      <nav>{navigation.map(([label,href,icon])=>{
        const active=href.startsWith("/station") ? path===href : href==="/portal"?path==="/portal":path.startsWith(href)
        return <Link key={href} href={destination(href)} className={active?"active":""}><i>{icon}</i><span>{label}</span></Link>
      })}</nav>
      <div className="agency-side-bottom">
        <div className="agency-seal">{org.logo_url?<img src={org.logo_url} alt=""/>:<span>FC</span>}</div>
        <div className="agency-live"><b>{stationMode ? (lastSynced ? "Collection synced" : "Collection setup") : "● Live Data"}</b><span>{stationMode ? (lastSynced ? "Assigned Shopify products" : "Assign and sync a collection") : "Shopify connected"}</span></div>
        {platform&&<Link href="/dashboard">Platform Admin ↗</Link>}
      </div>
    </aside>

    <div className="agency-workspace">
      <header className="agency-topbar">
        <div className="agency-org">
          <div className="agency-org-logo">{org.logo_url?<img src={org.logo_url} alt=""/>:<span>FC</span>}</div>
          <div><strong>{org.name}</strong><span>{stationMode ? "Station Portal" : "Agency Portal"}</span></div>
        </div>
        <div className="agency-top-actions">
          {campaigns.length > 0 && <label className="agency-campaign-switch">
            <span>◎</span>
            <div><strong>{campaign?.name||"No active campaign"}</strong><small>{campaign?.status||"None"}</small></div>
            <select aria-label="Switch campaign" value={campaign?.id||""} onChange={e=>switchCampaign(e.target.value)}>
              {campaigns.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <b>SWITCH</b>
          </label>}
          <div className="agency-sync"><span>↻</span><div><small>LAST SYNCED</small><strong>{lastSynced?new Date(lastSynced).toLocaleString():(stationMode ? "Not synced yet" : "No webhook yet")}</strong></div></div>
          <div className="agency-avatar" title={userEmail}>{(userEmail||"U").slice(0,2).toUpperCase()}</div>
          <button type="button" className="agency-signout" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <main className="agency-content"><p className="fc-note">Reporting period: {org.reporting_start_date || "All history"} through today · Detroit time</p>{children}</main>
    </div>
  </div>
}
