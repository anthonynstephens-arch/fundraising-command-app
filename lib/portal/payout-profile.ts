export type PayoutDetails = Record<string,string|boolean>
const fields=['method','bankName','accountName','accountType','routingNumber','accountNumber','paypalEmail','checkPayee','address1','address2','city','state','postalCode','country','legalName','ein','exemptionDate','nonprofitAddress','taxContactName','taxContactEmail'] as const
export function preparePayoutDetails(input:Record<string,unknown>,existing:PayoutDetails={}):PayoutDetails{
 const result:PayoutDetails={}
 for(const key of fields){
  const v=input[key]
  if(typeof v!=='string'||v.length>(key==='nonprofitAddress'?500:254))throw new Error('Complete the payout form with valid information.')
  result[key]=v.trim()
 }
 for(const key of ['venmoHandle','zelleContact','recipientName','otherMethod','otherDetails']){
  const value=input[key]??''
  if(typeof value!=='string'||value.length>(key==='otherDetails'?1000:254))throw new Error('Enter valid payment details.')
  result[key]=value.trim()
 }
 if(typeof input.is501c3!=='boolean')throw new Error('Select your nonprofit status.')
 result.is501c3=input.is501c3
 for(const key of ['routingNumber','accountNumber','ein']){
  const value=String(result[key]).replace(/[ -]/g,'')
  result[key]=value||existing[key]||''
 }
 if(!['ach','paypal','venmo','zelle','check','other'].includes(String(result.method)))throw new Error('Choose a supported payout method.')
 if(result.method==='ach'){
  const r=String(result.routingNumber),a=String(result.accountNumber)
  if(!result.bankName||!result.accountName||!['checking','savings'].includes(String(result.accountType)))throw new Error('Enter bank name, account holder, and account type.')
  if(!/^\d{9}$/.test(r)||/^0+$/.test(r)||![0,1,2,3,6,7,8].includes(Number(r[0]))||((3*(+r[0]+ +r[3]+ +r[6])+7*(+r[1]+ +r[4]+ +r[7])+(+r[2]+ +r[5]+ +r[8]))%10)!==0)throw new Error('Enter a valid 9-digit ABA routing number.')
  if(!/^\d{4,17}$/.test(a))throw new Error('Enter a 4–17 digit bank account number.')
 }
 const email=(v:unknown)=>typeof v==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
 if(result.method==='paypal'&&!email(result.paypalEmail))throw new Error('Enter the PayPal account email.')
 if(result.method==='venmo'&&(!/^@?[a-zA-Z0-9_-]{5,30}$/.test(String(result.venmoHandle))||!result.recipientName))throw new Error('Enter the Venmo username and recipient name.')
 if(result.method==='zelle'&&(!result.recipientName||(!email(result.zelleContact)&&!/^\+?\d{10,15}$/.test(String(result.zelleContact).replace(/[ ().-]/g,'')))))throw new Error('Enter the Zelle recipient name and registered email or phone number.')
 if(result.method==='other'&&(!result.otherMethod||!result.recipientName||!result.otherDetails))throw new Error('Enter the payment method, recipient name, and delivery instructions.')
 if(result.method==='check'&&['checkPayee','address1','city','state','postalCode','country'].some(k=>!result[k]))throw new Error('Enter the check payee and complete mailing address.')
 if(result.is501c3){
  if(!result.legalName||!/^\d{9}$/.test(String(result.ein))||!result.nonprofitAddress)throw new Error('Enter the nonprofit legal name, 9-digit EIN, and registered address.')
  if(result.exemptionDate&&!/^\d{4}-\d{2}-\d{2}$/.test(String(result.exemptionDate)))throw new Error('Enter a valid exemption date.')
  if(result.taxContactEmail&&!email(result.taxContactEmail))throw new Error('Enter a valid tax contact email.')
 }else{for(const k of ['legalName','ein','exemptionDate','nonprofitAddress','taxContactName','taxContactEmail'])result[k]=''}
 return result
}
export function maskPayoutDetails(details:PayoutDetails){
 const safe={...details}
 for(const key of ['routingNumber','accountNumber','ein']){safe[`${key}Last4`]=String(details[key]||'').slice(-4);safe[key]=''}
 return safe
}
