export function designerOrderEligible(campaign: {campaign_type?: string;status?: string;starts_at?: string|null}, createdAt: unknown) {
 if(campaign.campaign_type !== 'designer')return true;
 const placedAt=typeof createdAt==='string'?Date.parse(createdAt):NaN;
 const start=Date.parse(campaign.starts_at||'');
 return campaign.status==='active' && Number.isFinite(start) && Number.isFinite(placedAt) && placedAt>=start;
}
