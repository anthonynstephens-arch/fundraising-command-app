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
export const MACAC_BASE_MULTIPLIER = 1.2
export function contributionPrice(blankPrice:unknown,locations:number,retailPrice:unknown,locationFee:number) {
  const blank=Number(blankPrice)
  if(!Number.isFinite(blank)||blank<0||!Number.isInteger(locations)||locations<1||!Number.isFinite(locationFee)||locationFee<0)throw new Error('Invalid product pricing.')
  const customizerCents=Math.round((blank+locations*locationFee)*100)
  const baseCents=Math.round(customizerCents*MACAC_BASE_MULTIPLIER)
  const retail=retailPrice===undefined?baseCents/100:Number(retailPrice)
  if(retailPrice===null||retailPrice===''||!Number.isFinite(retail)||retail<0||retail>10000)throw new Error('Enter a valid selling price.')
  const retailCents=Math.round(retail*100)
  if(retailCents<baseCents)throw new Error('Your selling price cannot be below the Detroit Decal base price.')
  return {customizerPrice:customizerCents/100,base:baseCents/100,price:retailCents/100,donation:(retailCents-baseCents)/100}
}
export function builderContribution(record:any,campaignId:string,variant:{sku?:string|null;title:string;price?:string|number}) {
  if(record?.campaignId!==campaignId)return null
  if(record.pricingVersion===2){
    const pricing=record.pricing?.find((p:any)=>p.sku&&p.sku===variant.sku)||record.pricing?.find((p:any)=>p.title===variant.title)
    const price=variant.price===undefined?pricing?.price:Number(variant.price)
    if(!pricing||!Number.isFinite(pricing.base)||!Number.isFinite(price)||pricing.base<0||price<pricing.base)throw new Error('MACAC product is missing its saved size pricing. Review it before syncing.')
    return (Math.round(price*100)-Math.round(pricing.base*100))/100
  }
  return Number.isFinite(record.markup)&&record.markup>=0?record.markup:null
}
