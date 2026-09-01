import Link from "next/link"

const orders=[
  ["#1048","Jamie R.","BCA Awareness Tee","$32.00","Paid"],
  ["#1047","Taylor M.","BCA Hoodie","$52.00","Paid"],
  ["#1046","Chris D.","Duty Shirt - Pink Crest","$38.00","Paid"],
  ["#1045","Morgan S.","BCA Awareness Tee","$32.00","Paid"],
]

export default function BreastCancerDemo(){
  return <div className="bca-demo">
    <aside className="bca-sidebar">
      <div className="bca-logo"><span>FC</span><div><strong>Metro Public Safety</strong><small>Breast Cancer Awareness</small></div></div>
      <nav><a className="active">Overview</a><a>Sales</a><a>Orders</a><a>Products</a><a>Marketing</a><a>Payouts</a><a>Members</a></nav>
      <div className="bca-foot"><span>October 2026 Campaign</span><Link href="/">Exit Demo ↗</Link></div>
    </aside>
    <main className="bca-main">
      <header className="bca-head"><div><span>BREAST CANCER AWARENESS</span><h1>Campaign Overview</h1><p>Everything the department admin needs without exposing the platform back end.</p></div><button>Share Campaign</button></header>
      <section className="bca-stats">
        <div><span>Total Sales</span><strong>$8,460</strong><small>+18% this week</small></div>
        <div><span>Funds Raised</span><strong>$1,692</strong><small>20% contribution</small></div>
        <div><span>Orders</span><strong>214</strong><small>196 fulfilled</small></div>
        <div><span>Goal Progress</span><strong>68%</strong><small>$1,692 of $2,500</small></div>
      </section>
      <section className="bca-grid">
        <article className="bca-card bca-progress-card">
          <div className="bca-card-head"><div><span>GOAL</span><h2>Fundraiser Progress</h2></div><strong>$1,692</strong></div>
          <div className="bca-progress"><i style={{width:"68%"}}/></div><div className="bca-progress-meta"><span>$0</span><span>$2,500 goal</span></div>
        </article>
        <article className="bca-card">
          <div className="bca-card-head"><div><span>TOP PRODUCT</span><h2>BCA Awareness Tee</h2></div><strong>96 sold</strong></div>
          <div className="bca-product-line"><div className="bca-product-art">BCA</div><div><b>$32 retail</b><small>$6.40 raised per shirt</small></div></div>
        </article>
      </section>
      <section className="bca-card">
        <div className="bca-card-head"><div><span>RECENT ACTIVITY</span><h2>Orders</h2></div><a>View all →</a></div>
        <table className="bca-table"><thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map(o=><tr key={o[0]}>{o.map((v,i)=><td key={i}>{i===4?<span className="bca-paid">{v}</span>:v}</td>)}</tr>)}</tbody></table>
      </section>
      <section className="bca-callout"><div><span>DEPARTMENT ADMIN VIEW</span><h2>Members only see their own organization.</h2><p>Department admins can review campaign performance, orders, payouts, products and member access. Platform-only controls stay hidden.</p></div><Link href="/portal">Open Real Department Portal →</Link></section>
    </main>
  </div>
}