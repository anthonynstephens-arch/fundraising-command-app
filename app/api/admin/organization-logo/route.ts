import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requirePlatformAdmin } from '@/lib/admin/require-platform-admin'
import { createAdminClient } from '@/lib/supabase/admin'

const bucket = 'portal-assets'
export async function POST(request: Request) {
  const gate = await requirePlatformAdmin()
  if (!gate.ok) return NextResponse.json({ error: 'Administrator access required.' }, { status: gate.status })
  try {
    const form = await request.formData()
    const id = String(form.get('organizationId') || '')
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'Select a valid department or station.' }, { status: 400 })
    const db = createAdminClient()
    const { data: org, error: lookupError } = await db.from('organizations').select('id,logo_url').eq('id', id).maybeSingle()
    if (lookupError) throw lookupError
    if (!org) return NextResponse.json({ error: 'Department or station not found.' }, { status: 404 })
    const remove = form.get('remove') === 'true'
    let logoUrl: string | null = null
    let objectPath: string | null = null
    if (!remove) {
      const file = form.get('file')
      if (!(file instanceof File) || file.size === 0 || file.size > 3 * 1024 * 1024) return NextResponse.json({ error: 'Choose a PNG, JPG, or WebP image up to 3 MB.' }, { status: 400 })
      const bytes = Buffer.from(await file.arrayBuffer())
      const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
      const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      const webp = bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP'
      const type = png ? 'image/png' : jpg ? 'image/jpeg' : webp ? 'image/webp' : null
      if (!type || file.type !== type) return NextResponse.json({ error: 'Use a valid PNG, JPG, or WebP image.' }, { status: 400 })
      objectPath = `organization-logos/${id}/${crypto.randomUUID()}.${png ? 'png' : jpg ? 'jpg' : 'webp'}`
      const { error } = await db.storage.from(bucket).upload(objectPath, bytes, { contentType: type, upsert: false, cacheControl: '31536000' })
      if (error) throw error
      logoUrl = db.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl
    }
    const { error } = await db.from('organizations').update({ logo_url: logoUrl }).eq('id', id).select('id').single()
    if (error) {
      if (objectPath) await db.storage.from(bucket).remove([objectPath])
      throw error
    }
    // Only delete prior files from this organization's dedicated upload folder.
    const prefix = db.storage.from(bucket).getPublicUrl(`organization-logos/${id}/`).data.publicUrl
    if (org.logo_url?.startsWith(prefix)) {
      const previous = org.logo_url.slice(prefix.length)
      if (/^[0-9a-f-]+\.(png|jpg|webp)$/.test(previous)) await db.storage.from(bucket).remove([`organization-logos/${id}/${previous}`])
    }
    revalidatePath('/station', 'layout')
    revalidatePath('/portal', 'layout')
    revalidatePath('/dashboard/stations')
    revalidatePath('/dashboard/organizations/' + id)
    return NextResponse.json({ ok: true, logoUrl })
  } catch (error) {
    console.error('Organization logo update failed', error)
    return NextResponse.json({ error: 'Unable to save the logo. Please try again.' }, { status: 500 })
  }
}
