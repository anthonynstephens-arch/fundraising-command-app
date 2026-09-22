import {notFound,redirect} from 'next/navigation'
import LoginForm from '@/components/LoginForm'
import {createAdminClient} from '@/lib/supabase/admin'
export const dynamic='force-dynamic'
export default async function Page({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params
 const existing:Record<string,string>={'plymouth-township-fire-department':'plymouth','macac':'macac','detroit-metropolitan-dance':'dmd'}
 if(existing[slug])redirect('/stores/'+existing[slug]+'/login')
 const {data:org}=await createAdminClient().from('organizations').select('name,slug,logo_url,brand_primary_color').eq('slug',slug).eq('is_active',true).maybeSingle()
 if(!org)notFound()
 return <LoginForm department={{name:org.name,slug:org.slug,logoUrl:org.logo_url||undefined,primary:org.brand_primary_color||undefined}}/>
}
