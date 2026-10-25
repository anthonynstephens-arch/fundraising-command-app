import { notFound } from 'next/navigation'
import { canReadActivity } from '@/lib/activity/owner'
import { createAdminClient } from '@/lib/supabase/admin'
export const dynamic='force-dynamic'
export default async function ActivityPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 if(!await canReadActivity())notFound()
 const p=await searchParams
 const page=Math.max(0,Math.min(100000,Number(p.page)||0))
 let q=createAdminClient().from('portal_activity_log').select('*',{count:'exact'}).order('created_at',{ascending:false}).order('id',{ascending:false})
 if(p.user)q=q.ilike('actor_name',`%${p.user.replace(/[%_]/g,'').slice(0,100)}%`)
 if(['page_view','download','request'].includes(p.kind||''))q=q.eq('kind',p.kind)
 if(p.from&&/^\d{4}-\d{2}-\d{2}$/.test(p.from))q=q.gte('created_at',p.from+'T00:00:00Z')
 if(p.to&&/^\d{4}-\d{2}-\d{2}$/.test(p.to))q=q.lte('created_at',p.to+'T23:59:59.999Z')
 const {data,error,count}=await q.range(page*100,page*100+99)
 const link=(n:number)=>'?'+new URLSearchParams(Object.fromEntries(Object.entries({...p,page:String(n)}).filter((entry):entry is [string,string]=>typeof entry[1]==='string')))
 return <section><h1>Activity Log</h1><p>Private to Anthony · Account and PIN users · Times shown in Detroit time</p><p>Page views and downloads are browser-reported. Request entries show HTTP outcomes, not proof of a completed data change. Shared PINs identify the PIN holder.</p>
 <form style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:24}}><label>User <input name="user" defaultValue={p.user} placeholder="Email or PIN name" /></label><label>Activity <select name="kind" defaultValue={p.kind||''}><option value="">All activity</option><option value="page_view">Page views</option><option value="download">Downloads</option><option value="request">Portal requests</option></select></label><label>From (UTC) <input type="date" name="from" defaultValue={p.from}/></label><label>To (UTC) <input type="date" name="to" defaultValue={p.to}/></label><button>Filter / Refresh</button></form>
 {error?<p role="alert">Unable to load activity. Please retry.</p>:<><p>{count||0} matching events</p><div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}><thead><tr>{['When','User','Login','Activity','Page','Details / collection context'].map(h=><th key={h} style={{padding:10}}>{h}</th>)}</tr></thead><tbody>{data?.map(row=><tr key={row.id}>{[new Date(row.created_at).toLocaleString('en-US',{timeZone:'America/Detroit'}),row.actor_name,row.auth_type,row.kind.replaceAll('_',' '),row.path,[row.detail,row.context].filter(Boolean).join(' · ')].map((value,i)=><td key={i} style={{padding:10,borderTop:'1px solid #ddd',overflowWrap:'anywhere'}}>{value}</td>)}</tr>)}</tbody></table></div>{!data?.length&&<p>No activity recorded for these filters.</p>}<div style={{display:'flex',gap:20,marginTop:20}}>{page>0&&<a href={link(page-1)}>← Newer</a>}{(count||0)>(page+1)*100&&<a href={link(page+1)}>Older →</a>}</div></>}
 </section>
}
