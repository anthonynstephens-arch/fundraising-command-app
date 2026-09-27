import {NextResponse} from 'next/server'
import {requirePlatformAdmin} from '@/lib/admin/require-platform-admin'
import {createAdminClient} from '@/lib/supabase/admin'
export async function POST(){
 const auth=await requirePlatformAdmin();if(!auth.ok)return NextResponse.json({error:'Admin access required.'},{status:auth.status});
 const db=createAdminClient();const {data:c,error}=await db.from('campaigns').select('id,status').eq('slug','britton-mane-designer').eq('campaign_type','designer').single();
 if(error||!c)return NextResponse.json({error:'Designer setup is unavailable.'},{status:500});
 if(c.status==='active')return NextResponse.json({ok:true});
 if(c.status!=='draft')return NextResponse.json({error:'This program is closed. Contact the administrator to review it.'},{status:409});
 const {data:products,error:pe}=await db.from('campaign_products').select('shopify_product_id,contribution_type,contribution_value').eq('campaign_id',c.id).eq('is_active',true);
 if(pe)return NextResponse.json({error:'Unable to check assigned shirts.'},{status:500});
 if(!products?.length||products.some(p=>!p.shopify_product_id||!['fixed','percentage'].includes(p.contribution_type)||!Number.isFinite(Number(p.contribution_value))||Number(p.contribution_value)<=0||(p.contribution_type==='percentage'&&Number(p.contribution_value)>100)))return NextResponse.json({error:'Connect the shirts and set a valid commission greater than zero for every active variant first.'},{status:400});
 const ids=[...new Set(products.flatMap(p=>{const id=String(p.shopify_product_id).split('/').pop();return [id!,`gid://shopify/Product/${id}`]}))];
 const {data:conflicts,error:ce}=await db.from('campaign_products').select('id').in('shopify_product_id',ids).neq('campaign_id',c.id).eq('is_active',true).limit(1);
 if(ce)return NextResponse.json({error:'Unable to check product assignments.'},{status:500});
 if(conflicts?.length)return NextResponse.json({error:'These shirts already belong to another active campaign. Use dedicated shirts for this designer program.'},{status:400});
 const {error:saveError}=await db.from('campaigns').update({status:'active',starts_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',c.id).eq('status','draft');
 return NextResponse.json(saveError?{error:'Unable to start tracking.'}:{ok:true},{status:saveError?500:200});
}
