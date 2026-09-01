"use client"
import { useState } from "react"
import { jsPDF } from "jspdf"

const reportTypes=[
  ["Campaign Summary","High-level overview of campaign performance and totals"],
  ["Sales by Product","Per-product sales, units, and fundraising contribution"],
  ["Order Summary","Complete order listing with financial status"],
  ["Payout Statement","Payout history and current available balance"],
  ["Monthly Performance Report","Month-over-month sales and fundraising trends"],
  ["Full Campaign Closeout Report","Comprehensive final report with adjustments"],
]
function csvCell(v:any){return '"'+String(v??"").replaceAll('"','""')+'"'}
function saveCsv(name:string,rows:any[][]){const body=rows.map(r=>r.map(csvCell).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([body],{type:"text/csv"}));a.download=name;a.click();URL.revokeObjectURL(a.href)}

export default function ReportsTool({org,campaign,orders,products,payouts,totals}:{org:string;campaign:string;orders:any[];products:any[];payouts:any[];totals:any}){
  const [type,setType]=useState(reportTypes[0][0])
  function csvRows(){
    if(type==="Sales by Product") return [["Product","Units","Gross","Raised"],...products.map(p=>[p.title,p.qty,p.gross,p.raised])]
    if(type==="Payout Statement") return [["Date","Status","Gross Sales","Contribution","Payout"],...payouts.map(p=>[p.date,p.status,p.gross,p.contribution,p.payout])]
    return [["Order","Date","Customer","Gross","Eligible","Raised","Payment","Fulfillment"],...orders.map(o=>[o.order,o.date,o.customer,o.gross,o.eligible,o.raised,o.payment,o.fulfillment])]
  }
  function downloadPdf(){
    const doc=new jsPDF({unit:"pt",format:"letter"})
    let y=56
    doc.setFontSize(18);doc.text("Fundraiser Command",48,y);y+=24
    doc.setFontSize(14);doc.text(type,48,y);y+=22
    doc.setFontSize(10);doc.text(org+" · "+campaign,48,y);y+=20
    doc.text("Gross sales: $"+Number(totals.gross||0).toFixed(2),48,y);y+=16
    doc.text("Eligible sales: $"+Number(totals.eligible||0).toFixed(2),48,y);y+=16
    doc.text("Fundraising: $"+Number(totals.raised||0).toFixed(2),48,y);y+=22
    const rows=csvRows().slice(0,28)
    for(const row of rows){doc.text(row.join("   |   ").slice(0,120),48,y);y+=14;if(y>730){doc.addPage();y=50}}
    doc.save((campaign||"campaign").replace(/[^a-z0-9]+/gi,"-").toLowerCase()+"-"+type.replace(/[^a-z0-9]+/gi,"-").toLowerCase()+".pdf")
  }
  return <>
    <div className="agency-page-head"><div><h1>Reports</h1><p>Generate branded reports for your campaign</p></div></div>
    <section className="agency-report-layout">
      <aside className="agency-card"><header><div><h2>Report Types</h2><p>Select a report to generate</p></div></header>{reportTypes.map(([name,sub])=><button onClick={()=>setType(name)} className={type===name?"active":""} key={name}>▤ <span><b>{name}</b><small>{sub}</small></span></button>)}</aside>
      <article className="agency-card"><header><div><h2>Report Options</h2><p>Generate your report from live campaign data</p></div></header>
        <div className="agency-report-preview"><h3>{type}</h3><p>{reportTypes.find(r=>r[0]===type)?.[1]}</p><div><span>Orders <b>{orders.length}</b></span><span>Campaign totals <b>{"$"+Number(totals.gross||0).toFixed(2)+" gross · $"+Number(totals.raised||0).toFixed(2)+" raised"}</b></span></div></div>
        <div className="agency-actions"><button onClick={downloadPdf}>↓ Download PDF</button><button onClick={()=>saveCsv("campaign-report.csv",csvRows())}>▤ Download CSV</button><button onClick={()=>window.print()}>▣ Print</button></div>
      </article>
    </section>
  </>
}