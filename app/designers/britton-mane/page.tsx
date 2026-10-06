import DesignerOnboarding from '@/components/designer/DesignerOnboarding'
import NotificationInbox from '@/components/portal/NotificationInbox'
import PortalNotificationSettings from '@/components/portal/PortalNotificationSettings'
import '@/app/onboarding.css'
import DesignerCollection from '@/components/designer/DesignerCollection'
import DesignerPayoutRequest from '@/components/designer/DesignerPayoutRequest'
import PayoutPreferences from '@/components/portal/PayoutPreferences'
import {organizationAccess} from '@/lib/portal/organization-access'
import '@/app/payout-engine.css'
import Link from 'next/link'
import {redirect,notFound} from 'next/navigation'
import {createAdminClient} from '@/lib/supabase/admin'
import {createClient} from '@/lib/supabase/server'
import {getPortalPinSession} from '@/lib/pin-auth'
import {getPortalData,money2} from '@/lib/portal/data'
import DesignerActions from '@/components/designer/DesignerActions'
import './portal.css'
export const dynamic='force-dynamic'
export const metadata={title:'MANE GRFX | Sales & commissions'}
export default async function Page(){
 const auth=await createClient();const [{data:{user}},pin]=await Promise.all([auth.auth.getUser(),getPortalPinSession({allowPendingPinChange:true})]);
 if(!user&&!pin)redirect('/designers/britton-mane/login');if(!user&&pin?.mustChangePin)redirect('/change-pin');
 const {data:org,error}=await createAdminClient().from('organizations').select('id').eq('slug','britton-mane').eq('is_active',true).maybeSingle();if(error)throw error;if(!org)notFound();
 const d=await getPortalData(org.id);const active=d.campaign?.status==='active';
 const access=await organizationAccess(org.id);
 const {data:profile,error:profileError}=await d.db.from('organization_payout_profiles').select('version,review_status').eq('organization_id',org.id).maybeSingle();if(profileError)throw profileError;
 const openRequest=d.payoutRequests.find((r:any)=>['requested','approved','processing'].includes(r.status));
 const totals=new Map<string,{title:string,qty:number,sales:number,earned:number}>();
 for(const i of d.items){const key=String(i.shopify_product_id||i.campaign_product_id);const row=totals.get(key)||{title:i.title,qty:0,sales:0,earned:0};row.qty+=Number(i.quantity||0);row.sales+=Number(i.unit_price||0)*Number(i.quantity||0)-Number(i.refunded_merchandise_amount||0);row.earned+=Number(i.contribution_amount||0)-Number(i.refunded_contribution_amount||0);totals.set(key,row)}
 const rows=[...totals.values()];const units=rows.reduce((n,r)=>n+r.qty,0);const sales=rows.reduce((n,r)=>n+r.sales,0);
 const rules=[...new Set(d.products.map((p:any)=>Number(p.contribution_value)>0?(p.contribution_type==='percentage'?`${Number(p.contribution_value)}% of shirt sales`:`${money2(Number(p.contribution_value))} per shirt`):'To be decided'))];
 return <main className="mane-portal">
  <header className="mane-header"><Link href="/designers/britton-mane"><img src="/brand/mane/logo.png" alt="MANE GRFX"/></Link><div><span>DESIGNER PORTAL</span><strong>Britton Mane</strong></div><NotificationInbox organizationId={org.id} settingsHref="#notifications"/><DesignerActions/></header>
  <nav className="mane-nav" aria-label="Designer portal"><a href="#overview">Overview</a><a href="#shirts">Shirt sales</a><a href="#sales">Customer sales</a><a href="#notifications">Notifications</a><a href="#request-payout">Request payout</a><a href="#payout-profile">Payment details</a><a href="#payments">Payments</a>{d.platform&&<Link href="/dashboard/designers/britton-mane">Admin setup ↗</Link>}</nav>
  <section id="overview" className="mane-intro"><div><p className="mane-eyebrow">YOUR DESIGNS. YOUR NUMBERS.</p><h1>Sales & commissions</h1><p>Track your shirts, earnings, and payments in one place.</p></div><span className="mane-badge">{active?'Setup complete · Tracking sales':d.campaign?.status==='draft'?'Setup pending':d.campaign?.status==='completed'?'Program completed':'Tracking paused'}</span></section>
  {d.campaign?.status==='draft'&&<section className="mane-notice"><strong>Ready when your first shirt is.</strong><p>The shirts and commission terms are still to be decided. Tracking will begin after Detroit Decal & Apparel finishes setup. Past sales will not be imported.</p></section>}
  <section className="mane-metrics" aria-label="Sales and commission totals">{[['Shirts sold',String(units),'Units before returns'],['Commission earned',money2(Number(d.balance.earned||0)),'After commission adjustments'],['Available balance',money2(Number(d.balance.available||0)),'Earned, unpaid, and unreserved'],['Paid to date',money2(Number(d.balance.paid||0)),'Completed payments']].map(([label,value,note])=><article key={label}><p>{label}</p><strong>{value}</strong><small>{note}</small></article>)}</section>
  <div className="mane-columns"><section className="mane-panel"><p className="mane-eyebrow">THE AGREEMENT</p><h2>Commission terms</h2><dl><div><dt>Commission</dt><dd>{rules.length?rules.join(' · '):'To be decided'}</dd></div><div><dt>Tracking begins</dt><dd>{active&&d.campaign?.starts_at?new Date(d.campaign.starts_at).toLocaleString('en-US',{timeZone:'America/Detroit',dateStyle:'medium',timeStyle:'short'})+' (Detroit time)':'After setup is complete'}</dd></div><div><dt>Past sales</dt><dd>Not included</dd></div><div><dt>Pending payouts</dt><dd>{money2(Number(d.balance.pending||0))}</dd></div></dl></section><section className="mane-panel"><p className="mane-eyebrow">SALES ACTIVITY</p><h2>{money2(sales)}</h2><p>Shirt sales after recorded merchandise refunds.</p><p>{d.orders.length} tracked orders · {d.products.length} assigned variants</p><p>{d.lastWebhook?.created_at?'Last product sync: '+new Date(d.lastWebhook.created_at).toLocaleString('en-US',{timeZone:'America/Detroit'}):'No shirts connected yet.'}</p></section></div>
  <section id="shirts" className="mane-panel"><p className="mane-eyebrow">YOUR COLLECTION</p><h2>Included shirts</h2><DesignerCollection products={d.products}/><h2>Shirt performance</h2>{rows.length?<div className="mane-table"><table><thead><tr><th>Shirt</th><th>Units sold</th><th>Sales</th><th>Commission</th></tr></thead><tbody>{rows.map((r,i)=><tr key={i}><td>{r.title}</td><td>{r.qty}</td><td>{money2(r.sales)}</td><td>{money2(r.earned)}</td></tr>)}</tbody></table></div>:<div className="mane-empty"><strong>{d.products.length?'Your shirts are connected.':'Your first shirt is coming.'}</strong><p>{d.products.length?'Sales will appear here once tracking is active and orders arrive.':'Once the designs are ready, Detroit Decal & Apparel will connect the shirts here.'}</p></div>}{d.products.length>0&&<details><summary>Assigned shirts & rates</summary><ul>{d.products.map((p:any)=><li key={p.id}>{p.title}{p.variant_title?' · '+p.variant_title:''} — {Number(p.contribution_value)>0?(p.contribution_type==='percentage'?`${p.contribution_value}%`:money2(Number(p.contribution_value))+' per shirt'):'Rate to be decided'}</li>)}</ul></details>}</section>
  <section id="sales" className="mane-panel"><p className="mane-eyebrow">CUSTOMER SALES</p><h2>Recent purchases</h2><p>Only purchases of your included apparel appear here.</p>{d.items.length?<div className="mane-table"><table><thead><tr><th>First name</th><th>City</th><th>State</th><th>Items purchased</th></tr></thead><tbody>{d.orders.filter((o:any)=>d.items.some((i:any)=>i.order_id===o.id)).map((o:any)=><tr key={o.id}><td>{o.customer_first_name?.trim().split(/\s+/)[0]||'Guest'}</td><td>{o.shipping_city||'—'}</td><td>{o.shipping_province||'—'}</td><td><ul>{d.items.filter((i:any)=>i.order_id===o.id).map((i:any)=><li key={i.id}>{i.quantity} × {i.title}{i.variant_title?' · '+i.variant_title:''}</li>)}</ul></td></tr>)}</tbody></table></div>:<div className="mane-empty"><strong>No tracked sales yet.</strong><p>New purchases will appear here automatically.</p></div>}</section>
  {d.campaign&&<DesignerPayoutRequest organizationId={org.id} campaignId={d.campaign.id} available={Number(d.balance.available||0)} threshold={d.campaign.status==='completed'?0:Number(d.campaign.min_payout_threshold||0)} canRequest={!!access?.canFinance} openRequest={openRequest} profileReady={!!profile&&profile.review_status!=='changes_requested'} active={active||d.campaign.status==='completed'}/>}
  {access?.canFinance&&<PayoutPreferences organizationId={org.id} audience="designer"/>}
  <section id="payments" className="mane-panel"><p className="mane-eyebrow">PAYMENT HISTORY</p><h2>Your payouts</h2>{d.payouts.length?<div className="mane-table"><table><thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody>{d.payouts.map((p:any)=><tr key={p.id}><td>{new Date(p.created_at).toLocaleDateString('en-US',{timeZone:'America/Detroit'})}</td><td>{money2(Number(p.payout_amount||0))}</td><td>{p.status}</td></tr>)}</tbody></table></div>:<div className="mane-empty"><strong>No payouts yet.</strong><p>Payments and their status will appear here as commissions are paid.</p></div>}</section>
  <section id="notifications" className="mane-panel"><PortalNotificationSettings organizationId={org.id} userEmail={d.pinSession?'':d.user.email||''} audience="designer"/></section>
  {!d.platform&&<DesignerOnboarding organizationId={org.id}/>}
  <footer className="mane-footer">MANE GRFX × Detroit Decal & Apparel <span>Private designer reporting</span></footer>
 </main>
}
