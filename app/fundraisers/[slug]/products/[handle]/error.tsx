"use client";
export default function Error({reset}:{reset:()=>void}) {
  return <main style={{minHeight:"70vh",display:"grid",placeContent:"center",gap:20,padding:24,background:"#faf0de",color:"#26331f"}}><h1>Unable to load this product</h1><p>Please try again.</p><button onClick={reset}>Try again</button></main>
}
