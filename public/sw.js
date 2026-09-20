self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let data={title:'Fundraiser Command',body:'Your campaign has an update.',href:'/portal'};
 try{if(event.data)data={...data,...event.data.json()}}catch{}
 event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/icon',badge:'/icon',tag:data.id||'fundraiser-update',data:{href:data.href}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 let url=new URL(event.notification.data?.href||'/portal',self.location.origin);
 if(url.origin!==self.location.origin)url=new URL('/portal',self.location.origin);
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
 const current=clients.find(c=>new URL(c.url).origin===url.origin);
 if(current){await current.navigate(url.href);return current.focus()}
 return self.clients.openWindow(url.href);
 }));
});
