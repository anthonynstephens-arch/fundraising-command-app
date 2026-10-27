export const STUDIO_ORIGIN = 'https://detroit-design-studio.vercel.app'
export const BUILDER_NAMESPACE = 'fundraiser_builder'
export function requireBuilderId(value: unknown) {
  if(typeof value !== 'string' || !/^[a-f0-9-]{36}$/i.test(value)) throw new Error('Invalid draft identifier.')
  return value
}
export function assetUrl(value: unknown) {
  if(typeof value !== 'string' || value.length>2048) throw new Error('Invalid artwork URL.')
  const url=new URL(value)
  if(url.protocol!=='https:' || url.username || url.password || !(url.hostname==='cdn.shopify.com'||url.hostname.endsWith('.supabase.co'))) throw new Error('Use artwork saved by the Design Studio.')
  return url.href
}
export function validateDesign(value:any) {
  if(!value || typeof value.designId!=='string' || !/^gid:\/\/shopify\/Product\/\d+$/.test(value.shopifyProductId||'')) throw new Error('Return a saved design from the customizer first.')
  if(JSON.stringify(value).length>500000) throw new Error('This design is too large to publish. Simplify it and try again.')
  const entries=Object.entries(value.proofImages||{})
  if(!entries.length || entries.length>4) throw new Error('Generate at least one decorated proof.')
  const allowed=new Set(['front','back','leftSleeve','rightSleeve'])
  for(const [key,url] of entries){
    if(!allowed.has(key))throw new Error('Invalid print placement.')
    assetUrl(url)
    if(!value.placements?.[key]?.objects?.length)throw new Error('Proof is missing its production artwork.')
    if(value.placements[key].decorationMethod!=='Printing')throw new Error('Self-service publishing currently supports Printing. Contact us for embroidery pricing.')
  }
  for(const url of value.artworkFiles||[])assetUrl(url)
  if(typeof value.garmentColor!=='string'||value.garmentColor.length>120)throw new Error('Choose a garment color.')
  return value
}
export function contributionPrice(base:unknown,locations:number,markup:unknown,locationFee:number) {
  const blank=Number(base),donation=Number(markup)
  if(!Number.isFinite(blank)||blank<0||!Number.isFinite(donation)||donation<0||donation>1000||!Number.isFinite(locationFee)||locationFee<0)throw new Error('Invalid product pricing.')
  return {base:Math.round((blank+locations*locationFee)*100)/100,price:Math.round((blank+locations*locationFee+donation)*100)/100,donation:Math.round(donation*100)/100}
}
