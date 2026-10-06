import {money2} from '@/lib/portal/data'
type Product={id:string;shopify_product_id:string|null;title:string;image_url:string|null;variant_title:string|null;contribution_type:string;contribution_value:number|string}
export default function DesignerCollection({products}:{products:Product[]}){
 const groups=new Map<string,{title:string;image:string|null;variants:Set<string>;rates:Set<string>}>()
 for(const p of products){const key=p.shopify_product_id||p.id;const group=groups.get(key)||{title:p.title,image:p.image_url,variants:new Set<string>(),rates:new Set<string>()};if(!group.image&&p.image_url)group.image=p.image_url;if(p.variant_title)group.variants.add(p.variant_title);group.rates.add(p.contribution_type==='percentage'?`${Number(p.contribution_value)}% of sales`:`${money2(Number(p.contribution_value))} per shirt`);groups.set(key,group)}
 return <div className="mane-products">{[...groups].map(([id,p])=><article className="mane-product" key={id}><div className="mane-product-image">{p.image?<img src={p.image} alt={p.title} width={560} height={560} loading="lazy"/>:<span>Image unavailable</span>}</div><div><h3>{p.title}</h3><p>{[...p.rates].join(' · ')} commission</p><small>{p.variants.size} variants included</small><details><summary>Included sizes and colors</summary><p>{[...p.variants].join(' · ')}</p></details></div></article>)}</div>
}
