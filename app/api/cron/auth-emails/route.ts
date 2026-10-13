import {NextResponse} from 'next/server'
import {deliverAuthEmails} from '@/lib/portal/auth-email'
export const maxDuration=60
export async function GET(request:Request){
 if(!process.env.CRON_SECRET||request.headers.get('authorization')!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:'Unauthorized'},{status:401})
 return NextResponse.json(await deliverAuthEmails())
}
