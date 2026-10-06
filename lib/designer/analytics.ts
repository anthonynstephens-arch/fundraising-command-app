export function designerDaily(orders:Array<{id:string;placed_at:string|null}>,items:Array<{order_id:string;quantity:number;unit_price:number;contribution_amount:number;refunded_merchandise_amount?:number;refunded_contribution_amount?:number}>){
 const dates=new Map(orders.filter(o=>o.placed_at).map(o=>[o.id,new Intl.DateTimeFormat('en-CA',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(o.placed_at!))]))
 const days=new Map<string,{date:string;sales:number;commission:number;units:number}>()
 for(const item of items){const date=dates.get(item.order_id);if(!date)continue;const row=days.get(date)||{date,sales:0,commission:0,units:0};row.sales+=Number(item.quantity)*Number(item.unit_price)-Number(item.refunded_merchandise_amount||0);row.commission+=Number(item.contribution_amount)-Number(item.refunded_contribution_amount||0);row.units+=Number(item.quantity);days.set(date,row)}
 return [...days.values()].sort((a,b)=>a.date.localeCompare(b.date))
}
