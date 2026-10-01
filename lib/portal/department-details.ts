import {createAdminClient} from '@/lib/supabase/admin'
export async function departmentDetails(db:ReturnType<typeof createAdminClient>,organizationId:string){
 const [{data:org,error},{data:missing,error:checkError}]=await Promise.all([
  db.from('organizations').select('id,name,require_details,is_union,details_status,details_version,details_review_note,details_reviewed_at').eq('id',organizationId).single(),
  db.rpc('department_details_missing',{input_org:organizationId})
 ])
 if(error||checkError)throw new Error('Unable to load department requirements.')
 return {org,missing:missing||[]}
}
