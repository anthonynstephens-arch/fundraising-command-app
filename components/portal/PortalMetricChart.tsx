"use client"

import { useMemo,useState } from "react"

type Point={date:string;sales:number;orders:number;items:number;fundraising:number}
type Metric="sales"|"orders"|"items"|"fundraising"

function fmtDate(v:string){const d=new Date(v+"T12:00:00");return d.toLocaleDateString(undefined,{month:"short",day:"numeric"})}
function fmtValue(v:number,m:Metric){return m==="sales"||m==="fundraising"?"$"+Math.round(v):String(Math.round(v))}

export default function PortalMetricChart({data,defaultMetric="sales",showTabs=true,title="Sales Over Time",subtitle="Live Shopify-backed campaign data"}:{data:Point[];defaultMetric?:Metric;showTabs?:boolean;title?:string;subtitle?:string}){
  const [metric,setMetric]=useState<Metric>(defaultMetric)
  const width=760,height=260,padL=48,padR=18,padT=20,padB=38
  const vals=data.map(d=>Number(d[metric]||0))
  const max=Math.max(1,...vals)
  const points=useMemo(()=>data.map((d,i)=>{
    const x=data.length<=1?padL+(width-padL-padR)/2:padL+i*(width-padL-padR)/(data.length-1)
    const y=padT+(height-padT-padB)*(1-(Number(d[metric]||0)/max))
    return {x,y,d}
  }),[data,metric,max])
  const line=points.map(p=>p.x+","+p.y).join(" ")
  const area=points.length?(padL+","+(height-padB)+" "+line+" "+points[points.length-1].x+","+(height-padB)):""

  return <section className="agency-card">
    <header><div><h2>{title}</h2><p>{subtitle}</p></div>{showTabs&&<div className="agency-tabs">
      {(["sales","orders","items","fundraising"] as Metric[]).map(m=><button key={m} className={metric===m?"active":""} onClick={()=>setMetric(m)}>{m[0].toUpperCase()+m.slice(1)}</button>)}
    </div>}</header>
    <div className="agency-svg-chart">
      {data.length?<svg viewBox={"0 0 "+width+" "+height} role="img" aria-label={metric+" by day"}>
        {[0,.25,.5,.75,1].map((t,i)=>{const y=padT+(height-padT-padB)*t;const val=max*(1-t);return <g key={i}><line x1={padL} y1={y} x2={width-padR} y2={y} stroke="#edf2f7"/><text x={padL-8} y={y+4} textAnchor="end" fontSize="10" fill="#8fa2b8">{fmtValue(val,metric)}</text></g>})}
        <polygon points={area} fill="rgba(15,104,190,.08)"/>
        <polyline points={line} fill="none" stroke="#0d68be" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
        {points.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="4" fill="#0d68be"/><text x={p.x} y={height-12} textAnchor="middle" fontSize="10" fill="#8fa2b8">{fmtDate(p.d.date)}</text><title>{fmtDate(p.d.date)+": "+fmtValue(Number(p.d[metric]||0),metric)}</title></g>)}
      </svg>:<div className="agency-empty big">No Shopify sales data yet.</div>}
    </div>
  </section>
}