import {createAdminClient} from '@/lib/supabase/admin'
export async function assignedCampaignIds(db:ReturnType<typeof createAdminClient>,userId?:string|null,pinId?:string|null) {
 const [{data:users,error:ue},{data:pins,error:pe}]=await Promise.all([
  userId?db.from('portal_user_campaign_access').select('campaign_id').eq('user_id',userId):{data:[],error:null},
  pinId?db.from('portal_pin_campaign_access').select('campaign_id').eq('credential_id',pinId):{data:[],error:null}
 ])
 if(ue||pe)throw ue||pe
 return [...new Set([...(users||[]),...(pins||[])].map(g=>g.campaign_id))]
}
export async function userCanViewCampaign(userId:string,campaignId:string){
 const db=createAdminClient()
 const {data:admin,error}=await db.from('platform_admins').select('user_id').eq('user_id',userId).eq('is_active',true).maybeSingle();if(error)throw error
 return !!admin||(await assignedCampaignIds(db,userId)).includes(campaignId)
}
