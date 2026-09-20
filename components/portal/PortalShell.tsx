"use client"
import { stationNavigation } from '@/lib/portal/context'
import Image from "next/image"
import Link from "next/link"
import { usePathname,useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
import PortalOnboarding from '@/components/portal/PortalOnboarding'
import NotificationInbox from '@/components/portal/NotificationInbox'

const nav=[
  ["Overview","/portal","▦"],["Sales","/portal/sales","⌑"],["Orders","/portal/orders","◇"],["Products","/portal/products","⬡"],
  ["Campaign Progress","/portal/progress","◎"],["Payouts","/portal/payouts","▣"],["Reports","/portal/reports","▤"],["Marketing Tools","/portal/marketing","⌁"],
  ["Notifications","/portal/notifications","◉"],["Help","/portal/help","?"],["Account Settings","/portal/settings","⚙"],
]

export default function PortalShell({children,org,campaign,campaigns,userEmail,organizationId,platform,lastSynced,pinAccess=false}:{children:React.ReactNode;org:any;campaign:any;campaigns:any[];userEmail:string;organizationId:string;platform:boolean;lastSynced?:string|null;pinAccess?:boolean}){
  const path=usePathname()
  const router=useRouter()
  const [menuOpen,setMenuOpen]=useState(false)
  const stationMode = org.organization_type === "detroit_fire_station" || path.startsWith("/station")
  const stationHome = organizationId ? "/station/" + organizationId : "/station"
  const navigation = stationMode ? (organizationId ? stationNavigation(organizationId) : []) : nav
  const storefrontHref = campaign?.slug ? "/fundraisers/" + encodeURIComponent(campaign.slug) : "/fundraisers"
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
    router.push(stationMode ? "/station/login" : "/login")
    router.refresh()
  }

  return <div className="agency-shell">
    <aside className="agency-sidebar">
      <div className="agency-sidebar-head">
        <button className="agency-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="agency-navigation" onClick={()=>setMenuOpen(open=>!open)}><span aria-hidden="true">{menuOpen?"×":"☰"}</span> Menu</button>
        <div className="agency-wordmark">
          <strong>{stationMode ? <img src="/brand/firestation-command.webp" alt="Firestation Command" style={{width:"100%",maxWidth:200,height:"auto",display:"block",marginBottom:10}} /> : <><span className="agency-desktop-wordmark"><span className="agency-brand-mark">F</span> Fundraiser Command</span><Image className="agency-mobile-wordmark" src="/brand/fundraiser-command-header.webp" alt="Fundraiser Command" width={678} height={203} priority /></>}</strong>
          <span className="agency-wordmark-byline">DETROIT DECAL & APPAREL</span>
        </div>
        <div className="agency-mobile-account"><div className="agency-avatar" title={userEmail}>{(userEmail||"U").slice(0,2).toUpperCase()}</div><button type="button" onClick={signOut}>Sign out</button></div>
      </div>
      <nav id="agency-navigation" className={menuOpen?"mobile-open":""}>
        {navigation.map(([label,href,icon])=>{
          const active=href.startsWith("/station") ? path===href : href==="/portal"?path==="/portal":path.startsWith(href)
          return <Link key={href} href={destination(href)} className={active?"active":""} onClick={()=>setMenuOpen(false)}><i>{icon}</i><span>{label}</span></Link>
        })}
        <Link className="agency-storefront-link" href={storefrontHref} target="_blank" rel="noopener noreferrer" onClick={()=>setMenuOpen(false)}><i aria-hidden="true">↗</i><span>View Storefront</span></Link>
      </nav>
      <div className={"agency-side-bottom "+(menuOpen?"mobile-open":"")}>
        <div className="agency-menu-org"><div className="agency-seal">{org.logo_url?<img src={org.logo_url} alt=""/>:<span>FC</span>}</div><div><strong>{org.name}</strong><span>{stationMode ? "Station Portal" : "Agency Portal"}</span></div></div>
        {campaigns.length > 0 && <label className="agency-menu-campaign"><span>Campaign</span><select aria-label="Switch campaign" value={campaign?.id||""} onChange={e=>switchCampaign(e.target.value)}>{campaigns.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><small>{campaign?.status||"No status"}</small></label>}
        <div className="agency-menu-sync"><span>↻</span><div><small>LAST CAMPAIGN SYNC</small><strong>{lastSynced?new Date(lastSynced).toLocaleString("en-US",{timeZone:"America/Detroit",timeZoneName:"short"}):(stationMode ? "Not synced yet" : "No campaign sync recorded")}</strong></div></div>
        <div className="agency-live"><b>{!lastSynced?"Sync not verified":Date.now()-new Date(lastSynced).getTime()>86400000?"Sync may be out of date":"Recent campaign sync"}</b><span>{lastSynced?"Last recorded collection sync; not a live connection check":"Open Products to check the collection and sync"}</span></div>
        <button type="button" className="fc-replay-tour" onClick={()=>{setMenuOpen(false);window.dispatchEvent(new Event('fc-replay-tour'))}}>↻ Guided walkthrough</button>
        <div className="fc-mobile-bell"><NotificationInbox organizationId={organizationId}/></div>
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
          <NotificationInbox organizationId={organizationId}/>
          <div className="agency-avatar" title={userEmail}>{(userEmail||"U").slice(0,2).toUpperCase()}</div>
          <button type="button" className="agency-signout" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <main className="agency-content"><p className="fc-note">Reporting period: {org.reporting_start_date || "All history"} through today · Detroit time</p>{children}</main>
    </div>
    {organizationId&&<PortalOnboarding organizationId={organizationId} query={q}/>}
  </div>
}
