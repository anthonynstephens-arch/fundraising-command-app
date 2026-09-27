import Link from 'next/link'
import {notFound} from 'next/navigation'
import {createAdminClient} from '@/lib/supabase/admin'
import ShopifyCollectionManager from '@/components/ShopifyCollectionManager'
import CampaignProductContributionManager from '@/components/CampaignProductContributionManager'
import PayoutGenerator from '@/components/admin/PayoutGenerator'
import DesignerActions from '@/components/designer/DesignerActions'
import '@/app/designers/britton-mane/portal.css'
export const dynamic='force-dynamic'
export default async function Page(){
 const db=createAdminClient();const {data:c,error}=await db.from('campaigns').select('*').eq('slug','britton-mane-designer').single();if(error)throw error;if(!c)notFound();
 const {data:products,error:productError}=await db.from('campaign_products').select('*').eq('campaign_id',c.id).order('title');if(productError)throw productError;
 return <div className="mane-portal"><header className="mane-header"><img src="/brand/mane/logo.png" alt="MANE GRFX"/><div><span>ADMIN SETUP</span><strong>Britton Mane</strong></div><Link className="mane-button" href="/designers/britton-mane">View designer portal</Link></header>
 <section className="mane-intro"><div><h1>Designer commission setup</h1><p>Shirts and rates can be decided later. No past sales will be imported.</p></div><span className="mane-badge">{c.status==='active'?'Tracking active':'Setup pending'}</span></section>
 <section className="mane-panel"><h2>1. Connect the shirts</h2><p>When the shirts are created in Shopify, place only Britton’s commission-eligible shirts in a dedicated collection and connect it below.</p><ShopifyCollectionManager campaigns={[{id:c.id,name:c.name,organizationName:'Britton Mane'}]}/></section>
 <section className="mane-panel"><h2>2. Set the commission</h2><p>Choose a fixed dollar amount per shirt or a percentage. Rates apply to future imported sales; previous commission records retain their saved rates.</p>{products?.length?<CampaignProductContributionManager products={products}/>:<div className="mane-empty">To be decided. Rate controls will appear after the shirts are connected.</div>}</section>
 <section className="mane-panel"><h2>3. Start tracking</h2>{c.status==='active'?<p>Tracking started {new Date(c.starts_at).toLocaleString('en-US',{timeZone:'America/Detroit'})} (Detroit time).</p>:<><p>Finish the product and rate setup first. Starting tracking sets the start time to now and excludes all earlier orders.</p><DesignerActions launch/></>}</section>
 <section className="mane-panel"><h2>Private access</h2><p>Britton can request access and choose a PIN on the branded login page. Approve the request or add a viewer using Manage Access.</p><div className="mane-nav"><Link href={'/dashboard/organizations/'+c.organization_id+'/members'}>Manage Access ↗</Link><Link href="/designers/britton-mane/login">Branded login ↗</Link></div></section>
 <section className="mane-panel"><h2>Commission payouts</h2><p>Create payout records from the available commission balance, then record their payment status in the payout ledger.</p><PayoutGenerator campaignId={c.id}/><div className="mane-nav"><Link href="/dashboard/payouts">Open payout ledger ↗</Link></div></section>
 </div>
}
