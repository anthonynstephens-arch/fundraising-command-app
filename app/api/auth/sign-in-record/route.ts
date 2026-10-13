import {NextResponse} from 'next/server'
import {recordSignIn} from '@/lib/portal/sign-in-record'
export async function POST(){try{return NextResponse.json({ok:await recordSignIn()})}catch{return NextResponse.json({error:'Unable to record sign-in.'},{status:500})}}
