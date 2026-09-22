export const emailCategories = {new_sales:'New sales',payout_updates:'Payout updates',campaign_milestones:'Goal milestones',sync_issues:'Sync issues',access_request:'Access requests',access_approved:'Access approved'} as const
export type EmailCategory = keyof typeof emailCategories
export type EmailDesign = {subject:string;eyebrow:string;headline:string;intro:string;button:string;footer:string;accent:string;background:string;header:string;logo:string;image:string;style:'midnight'|'minimal'|'celebration'}
export const emailPresets = {
 midnight:{accent:'#b48229',background:'#eef1f5',header:'#102038',style:'midnight'},
 minimal:{accent:'#2563eb',background:'#f3f5f9',header:'#ffffff',style:'minimal'},
 celebration:{accent:'#be185d',background:'#fff1f6',header:'#4c1230',style:'celebration'},
} as const
export function defaultEmailDesign(category:EmailCategory):EmailDesign {
 return {...emailPresets.midnight,subject:'{{title}} · {{organization}}',eyebrow:'FUNDRAISER COMMAND',headline:'{{title}}',intro:category==='campaign_milestones'?'Every contribution brings your community closer. Here’s the latest from {{organization}}.':category==='access_approved'?'You’re ready to go. Your access to {{organization}} has been approved.':'Here’s the latest from {{organization}}.',button:category==='access_request'?'Review access request':category==='access_approved'?'Open your portal':'View in portal',footer:'Built for the communities that show up.',logo:'',image:''}
}
export function validateEmailDesign(value:any):EmailDesign {
 if(!value||typeof value!=='object')throw Error('A template is required.')
 const limits:Record<string,number>={subject:180,eyebrow:80,headline:200,intro:2400,button:60,footer:400,logo:1500,image:1500}
 const out:any={}
 for(const [key,max] of Object.entries(limits)){
  if(typeof value[key]!=='string'||value[key].length>max)throw Error(`Check the ${key} field (maximum ${max} characters).`)
  out[key]=value[key].trim()
 }
 if(!out.subject||!out.headline||!out.button)throw Error('Subject, headline, and button text are required.')
 if(/[\r\n]/.test(out.subject))throw Error('Subject must be one line.')
 for(const key of ['accent','background','header']){if(!/^#[a-f0-9]{6}$/i.test(value[key]))throw Error('Choose a valid color.');out[key]=value[key]}
 for(const key of ['logo','image'])if(out[key]){let u;try{u=new URL(out[key])}catch{throw Error('Images must use a full HTTPS URL.')};if(u.protocol!=='https:'||u.username||u.password)throw Error('Images must use HTTPS.')}
 if(!['midnight','minimal','celebration'].includes(value.style))throw Error('Choose a design preset.')
 out.style=value.style
 return out
}
export const escapeEmail=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export function renderEmail(design:EmailDesign,context:{organization:string;name:string;title:string;body:string;href:string;logo?:string;settingsHref?:string}) {
 const d=validateEmailDesign(design)
 const merge=(s:string)=>s.replace(/\{\{(organization|name|title)\}\}/g,(_,key)=>context[key as 'organization'|'name'|'title'])
 const esc=(s:string)=>escapeEmail(merge(s))
 const url=(s:string)=>{try{const u=new URL(s,'https://www.fundraisercommand.com');return u.origin==='https://www.fundraisercommand.com'?u.href:'https://www.fundraisercommand.com/portal'}catch{return 'https://www.fundraisercommand.com/portal'}}
 const link=url(context.href),settings=url(context.settingsHref||'/portal/notifications')
 const logo=d.logo||context.logo||'',safeLogo=logo.startsWith('https://')?logo:''
 const headerText=d.style==='minimal'?'#102038':'#ffffff'
 const subject=merge(d.subject).replace(/[\r\n]/g,' ').slice(0,240)
 const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:${d.background};font-family:Arial,Helvetica,sans-serif;color:#172338"><div style="display:none;max-height:0;overflow:hidden">${esc(d.headline)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${d.background}"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden"><tr><td style="height:6px;background:${d.accent}"></td></tr><tr><td style="padding:36px 32px;background:${d.header};color:${headerText}">${safeLogo?`<img src="${escapeEmail(safeLogo)}" width="88" alt="${escapeEmail(context.organization)} logo" style="max-height:88px;object-fit:contain;margin-bottom:24px">`:''}<p style="font-size:11px;font-weight:700;letter-spacing:3px;margin:0 0 20px;color:${headerText}">${esc(d.eyebrow)}</p><h1 style="font-size:34px;line-height:1.15;letter-spacing:-1px;margin:0;color:${headerText}">${esc(d.headline)}</h1><p style="margin:18px 0 0;font-size:13px;color:${headerText}">${escapeEmail(context.organization)}</p></td></tr>${d.image?`<tr><td><img src="${escapeEmail(d.image)}" width="600" alt="" style="display:block;width:100%;height:auto"></td></tr>`:''}<tr><td style="padding:32px"><p style="font-size:16px;line-height:1.7;margin:0 0 24px">${esc(d.intro).replace(/\n/g,'<br>')}</p><table role="presentation" width="100%" style="background:#f3f5f8;border-left:4px solid ${d.accent};border-radius:8px"><tr><td style="padding:20px;font-size:15px;line-height:1.7">${escapeEmail(context.body).replace(/\n/g,'<br>')}</td></tr></table><table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:28px"><tr><td bgcolor="${d.accent}" style="border-radius:8px"><a href="${escapeEmail(link)}" style="display:inline-block;padding:16px 24px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold">${esc(d.button)} &rarr;</a></td></tr></table></td></tr><tr><td style="padding:24px 32px;border-top:1px solid #e8ecf1;font-size:12px;line-height:1.7;color:#64748b">${esc(d.footer)}<br>Fundraiser Command · <a href="${escapeEmail(settings)}" style="color:#475569">Manage email preferences</a></td></tr></table></td></tr></table></body></html>`
 return {subject,html,text:[merge(d.headline),context.organization,merge(d.intro),context.body,merge(d.button)+': '+link,merge(d.footer),'Manage email preferences: '+settings].join('\n\n')}
}
