export function recordActivity(kind:'page_view'|'download'|'request',detail='',path=location.pathname) {
  const params=new URLSearchParams(location.search)
  const context=['org','campaign'].map(k=>params.get(k)?`${k}=${params.get(k)}`:'').filter(Boolean).join(' ')
  void fetch('/api/activity',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,detail,path,context}),keepalive:true}).catch(()=>{})
}
