import "server-only"
import {getPublicCampaign} from "@/lib/public/campaigns"
import {shopifyGraphQL, toShopifyGid} from "@/lib/shopify/admin"

export type StoreImage={url:string;altText:string|null;width:number|null;height:number|null}
export type StoreVariant={id:string;title:string;price:number;available:boolean;selectedOptions:{name:string;value:string}[];image:StoreImage|null}
export type StoreProduct={id:string;handle:string;title:string;description:string;images:StoreImage[];options:{name:string;values:string[]}[];variants:StoreVariant[];minPrice:number;maxPrice:number;available:boolean}

type ShopifyProduct={
  id:string;title:string;handle:string;description:string;status:string
  featuredImage:StoreImage|null
  images:{nodes:StoreImage[]}
  options:{name:string;values:string[]}[]
  variants:{nodes:Array<{id:string;title:string;price:string;inventoryQuantity:number|null;inventoryPolicy:"DENY"|"CONTINUE";selectedOptions:{name:string;value:string}[];image:StoreImage|null}>}
}

const productQuery=`query CampaignStoreProducts($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on Product {
      id title handle description status
      featuredImage { url altText width height }
      images(first: 20) { nodes { url altText width height } }
      options { name values }
      variants(first: 250) {
        nodes {
          id title price inventoryQuantity inventoryPolicy
          selectedOptions { name value }
          image { url altText width height }
        }
      }
    }
  }
}`

function numericId(value:string){return value.includes("/")?(value.split("/").pop()||value):value}

function fallbackProducts(campaign:any):StoreProduct[]{
  return campaign.products.map((product:any)=>({
    id:String(product.productId),
    handle:product.handle||String(product.productId),
    title:product.title,
    description:"",
    images:product.imageUrl?[{url:product.imageUrl,altText:product.title,width:null,height:null}]:[],
    options:[{name:"Option",values:product.variants.map((variant:any)=>variant.title)}],
    variants:product.variants.map((variant:any)=>({
      id:String(variant.shopifyVariantId),title:variant.title,price:Number(variant.price),available:true,
      selectedOptions:[{name:"Option",value:variant.title}],image:null,
    })),
    minPrice:Number(product.minPrice),maxPrice:Number(product.maxPrice),available:true,
  }))
}

export async function getCampaignStorefront(slug:string){
  const campaign:any=await getPublicCampaign(slug)
  if(!campaign)return null
  if(!campaign.products.length)return {...campaign,products:[] as StoreProduct[],shopifyConnected:true}

  try{
    const ids=campaign.products.map((product:any)=>toShopifyGid("Product",product.productId)).filter(Boolean) as string[]
    const data=await shopifyGraphQL<{nodes:Array<ShopifyProduct|null>}>(productQuery,{ids})
    const assignedVariants=new Set(campaign.products.flatMap((product:any)=>product.variants.map((variant:any)=>String(variant.shopifyVariantId))))
    const products=(data.nodes||[]).filter((node):node is ShopifyProduct=>!!node&&node.status==="ACTIVE").map(product=>{
      const variants=product.variants.nodes.filter(variant=>assignedVariants.has(numericId(variant.id))).map(variant=>({
        id:numericId(variant.id),title:variant.title,price:Number(variant.price),
        available:variant.inventoryPolicy==="CONTINUE"||variant.inventoryQuantity===null||variant.inventoryQuantity>0,
        selectedOptions:variant.selectedOptions,image:variant.image,
      }))
      const images=product.images.nodes.length?product.images.nodes:(product.featuredImage?[product.featuredImage]:[])
      const prices=variants.map(variant=>variant.price)
      return {id:numericId(product.id),handle:product.handle,title:product.title,description:product.description,images,
        options:product.options.filter(option=>!(option.name==="Title"&&option.values.length===1&&option.values[0]==="Default Title")),
        variants,minPrice:prices.length?Math.min(...prices):0,maxPrice:prices.length?Math.max(...prices):0,available:variants.some(variant=>variant.available)}
    }).filter(product=>product.variants.length)
    return {...campaign,products,shopifyConnected:true}
  }catch(error){
    console.error("Unable to refresh public Shopify product data",error)
    return {...campaign,products:fallbackProducts(campaign),shopifyConnected:false}
  }
}
