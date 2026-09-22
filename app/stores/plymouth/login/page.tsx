import LoginForm from '@/components/LoginForm'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLYMOUTH_SLUG } from '@/lib/branding/plymouth'
export const dynamic = 'force-dynamic'
export const metadata = {title: 'Member Portal | Plymouth Township Fire Department'}
export default async function Page() {
 const {data:org}=await createAdminClient().from('organizations').select('logo_url').eq('slug',PLYMOUTH_SLUG).eq('is_active',true).single()
 return <LoginForm plymouth logoUrl={org?.logo_url}/>
}
