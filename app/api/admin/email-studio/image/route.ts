import {NextResponse} from 'next/server'
import {requirePlatformAdmin} from '@/lib/admin/require-platform-admin'
import {createAdminClient} from '@/lib/supabase/admin'
export async function POST(request:Request){
 const gate=await requirePlatformAdmin();if(!gate.ok)return NextResponse.json({error:'Unauthorized'},{status:gate.status})
 const form=await request.formData(),file=form.get('file')
 if(!(file instanceof File)||file.size>5*1024*1024||!['image/png','image/jpeg','image/webp'].includes(file.type))return NextResponse.json({error:'Choose a PNG, JPG, or WebP image under 5 MB.'},{status:400})
 const bytes=new Uint8Array(await file.arrayBuffer())
 const valid=file.type==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216: new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP'
 if(!valid)return NextResponse.json({error:'Image format does not match the file.'},{status:400})
 const db=createAdminClient(),path='email-assets/'+crypto.randomUUID()+'.'+({'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[file.type])
 const {error}=await db.storage.from('portal-assets').upload(path,bytes,{contentType:file.type,upsert:false})
 if(error)return NextResponse.json({error:'Unable to upload image.'},{status:503})
 return NextResponse.json({url:db.storage.from('portal-assets').getPublicUrl(path).data.publicUrl})
}
