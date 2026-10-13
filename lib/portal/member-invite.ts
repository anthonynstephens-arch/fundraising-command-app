import {createAdminClient} from '@/lib/supabase/admin'
import {emailTransport,emailSender} from './email-transport'
import {renderEmail,defaultEmailDesign} from './email-template'
export async function inviteMember(db:ReturnType<typeof createAdminClient>,email:string){
 const {data,error}=await db.auth.admin.generateLink({type:'invite',email,options:{redirectTo:'https://www.fundraisercommand.com/auth/invite'}})
 if(error||!data.user)throw error||Error('Unable to create invitation.')
 const href='/auth/confirm-invite?token_hash='+encodeURIComponent(data.properties.hashed_token)
 const message=renderEmail(defaultEmailDesign('access_approved'),{organization:'Fundraiser Command',name:'',title:'Your Fundraiser Command invitation',body:'You have been invited to Fundraiser Command. Use the button below to activate your account and choose your password.',href,settingsHref:'/portal'})
 const transport=emailTransport();try{await transport.sendMail({...emailSender(),to:email,...message,subject:'Your Fundraiser Command invitation'})}finally{transport.close()}
 return data.user
}
